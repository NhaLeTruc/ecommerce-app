import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';
import { Cart, CartItem, AddToCartRequest } from '../models/cart';
import { logger } from '../middleware/logger';

export class EventPublisher {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'cart-service',
      brokers: config.kafka.brokers,
    });

    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    logger.info('Kafka producer connected');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    logger.info('Kafka producer disconnected');
  }

  private async publishEvent(eventType: string, userId: string, data: any): Promise<void> {
    try {
      const event = {
        event_type: eventType,
        user_id: userId,
        timestamp: new Date().toISOString(),
        data,
      };

      await this.producer.send({
        topic: config.kafka.topic,
        messages: [
          {
            key: userId,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.debug('Event published', { eventType, userId });
    } catch (error) {
      logger.error('Failed to publish event', { eventType, userId, error });
    }
  }

  async publishCartCreated(cart: Cart): Promise<void> {
    await this.publishEvent('cart.created', cart.userId, {
      created_at: cart.createdAt,
      expires_at: cart.expiresAt,
    });
  }

  async publishItemAdded(cart: Cart, item: AddToCartRequest): Promise<void> {
    await this.publishEvent('cart.item_added', cart.userId, {
      product_id: item.productId,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      total_items: cart.totalItems,
      subtotal: cart.subtotal,
    });
  }

  async publishItemUpdated(cart: Cart, productId: string, oldQuantity: number, newQuantity: number): Promise<void> {
    await this.publishEvent('cart.item_updated', cart.userId, {
      product_id: productId,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      total_items: cart.totalItems,
      subtotal: cart.subtotal,
    });
  }

  async publishItemRemoved(cart: Cart, item: CartItem): Promise<void> {
    await this.publishEvent('cart.item_removed', cart.userId, {
      product_id: item.productId,
      sku: item.sku,
      quantity: item.quantity,
      total_items: cart.totalItems,
      subtotal: cart.subtotal,
    });
  }

  async publishCartCleared(userId: string): Promise<void> {
    await this.publishEvent('cart.cleared', userId, {});
  }
}
