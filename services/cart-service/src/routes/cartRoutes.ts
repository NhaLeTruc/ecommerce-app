import { Router, Request, Response } from 'express';
import { CartService } from '../services/cartService';
import { AddToCartRequest, UpdateCartItemRequest } from '../models/cart';
import { logger } from '../middleware/logger';
import { authenticateJWT } from '../middleware/auth';

export function createCartRoutes(cartService: CartService): Router {
  const router = Router();

  // Apply authentication to all cart routes
  router.use(authenticateJWT);

  // Get cart (authenticated user's cart only)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const cart = await cartService.getCart(userId);

      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      res.json({ cart });
    } catch (error) {
      logger.error('Failed to get cart', { error });
      res.status(500).json({ error: 'Failed to get cart' });
    }
  });

  // Add item to cart
  router.post('/items', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const item: AddToCartRequest = req.body;

      // Validate request
      if (!item.productId || !item.sku || !item.name || item.price === undefined || !item.quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (item.price < 0) {
        return res.status(400).json({ error: 'Price must be non-negative' });
      }

      const cart = await cartService.addItem(userId, item);
      res.status(200).json({ cart });
    } catch (error: any) {
      logger.error('Failed to add item to cart', { error });

      if (error.message?.includes('cannot contain more than') || error.message?.includes('cannot exceed')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to add item to cart' });
    }
  });

  // Update item quantity
  router.put('/items/:productId', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { productId } = req.params;
      const { quantity }: UpdateCartItemRequest = req.body;

      if (quantity === undefined) {
        return res.status(400).json({ error: 'Quantity is required' });
      }

      const cart = await cartService.updateItemQuantity(userId, productId, quantity);
      res.json({ cart });
    } catch (error: any) {
      logger.error('Failed to update cart item', { error });

      if (error.message === 'Cart not found' || error.message === 'Item not found in cart') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message?.includes('Quantity must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to update cart item' });
    }
  });

  // Remove item from cart
  router.delete('/items/:productId', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { productId } = req.params;
      const cart = await cartService.removeItem(userId, productId);
      res.json({ cart });
    } catch (error: any) {
      logger.error('Failed to remove item from cart', { error });

      if (error.message === 'Cart not found' || error.message === 'Item not found in cart') {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to remove item from cart' });
    }
  });

  // Clear cart
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      await cartService.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to clear cart', { error });
      res.status(500).json({ error: 'Failed to clear cart' });
    }
  });

  return router;
}
