import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { Cart, CartItem, AddToCartRequest } from '../models/cart';
import { logger } from '../middleware/logger';
import { EventPublisher } from './eventPublisher';

export class CartService {
  private client: RedisClientType;
  private eventPublisher: EventPublisher;
  private readonly cartTTL: number;

  constructor(eventPublisher: EventPublisher) {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err });
    });

    this.eventPublisher = eventPublisher;
    this.cartTTL = config.cart.ttlMinutes * 60; // Convert to seconds
  }

  async connect(): Promise<void> {
    await this.client.connect();
    logger.info('Redis client connected');
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    logger.info('Redis client disconnected');
  }

  private cartKey(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<Cart | null> {
    try {
      const data = await this.client.get(this.cartKey(userId));

      if (!data) {
        return null;
      }

      const cart: Cart = JSON.parse(data);

      // Check if cart has expired
      if (new Date(cart.expiresAt) < new Date()) {
        await this.deleteCart(userId);
        return null;
      }

      return cart;
    } catch (error) {
      logger.error('Failed to get cart', { userId, error });
      throw error;
    }
  }

  async createCart(userId: string): Promise<Cart> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cartTTL * 1000);

    const cart: Cart = {
      userId,
      items: [],
      subtotal: 0,
      totalItems: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await this.saveCart(cart);
    await this.eventPublisher.publishCartCreated(cart);

    logger.info('Cart created', { userId });
    return cart;
  }

  async addItem(userId: string, item: AddToCartRequest): Promise<Cart> {
    // Validate quantity
    if (item.quantity <= 0 || item.quantity > config.cart.maxQuantityPerItem) {
      throw new Error(`Quantity must be between 1 and ${config.cart.maxQuantityPerItem}`);
    }

    let cart = await this.getCart(userId);

    if (!cart) {
      cart = await this.createCart(userId);
    }

    // Check max items limit
    if (cart.items.length >= config.cart.maxItems) {
      throw new Error(`Cart cannot contain more than ${config.cart.maxItems} items`);
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex((i) => i.productId === item.productId);

    if (existingItemIndex >= 0) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + item.quantity;

      if (newQuantity > config.cart.maxQuantityPerItem) {
        throw new Error(`Total quantity for this item cannot exceed ${config.cart.maxQuantityPerItem}`);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      });
    }

    this.recalculateCart(cart);
    cart.updatedAt = new Date();

    await this.saveCart(cart);
    await this.eventPublisher.publishItemAdded(cart, item);

    logger.info('Item added to cart', { userId, productId: item.productId, quantity: item.quantity });
    return cart;
  }

  async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<Cart> {
    if (quantity <= 0 || quantity > config.cart.maxQuantityPerItem) {
      throw new Error(`Quantity must be between 1 and ${config.cart.maxQuantityPerItem}`);
    }

    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);

    if (itemIndex < 0) {
      throw new Error('Item not found in cart');
    }

    const oldQuantity = cart.items[itemIndex].quantity;
    cart.items[itemIndex].quantity = quantity;

    this.recalculateCart(cart);
    cart.updatedAt = new Date();

    await this.saveCart(cart);
    await this.eventPublisher.publishItemUpdated(cart, productId, oldQuantity, quantity);

    logger.info('Cart item updated', { userId, productId, oldQuantity, newQuantity: quantity });
    return cart;
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);

    if (itemIndex < 0) {
      throw new Error('Item not found in cart');
    }

    const removedItem = cart.items[itemIndex];
    cart.items.splice(itemIndex, 1);

    this.recalculateCart(cart);
    cart.updatedAt = new Date();

    await this.saveCart(cart);
    await this.eventPublisher.publishItemRemoved(cart, removedItem);

    logger.info('Item removed from cart', { userId, productId });
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getCart(userId);

    if (cart) {
      await this.deleteCart(userId);
      await this.eventPublisher.publishCartCleared(userId);
      logger.info('Cart cleared', { userId });
    }
  }

  async deleteCart(userId: string): Promise<void> {
    await this.client.del(this.cartKey(userId));
  }

  private async saveCart(cart: Cart): Promise<void> {
    const data = JSON.stringify(cart);
    await this.client.setEx(this.cartKey(cart.userId), this.cartTTL, data);
  }

  private recalculateCart(cart: Cart): void {
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Round to 2 decimal places
    cart.subtotal = Math.round(cart.subtotal * 100) / 100;
  }
}
