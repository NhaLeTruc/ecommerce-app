import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { CreateOrderRequest, UpdateOrderStatusRequest, OrderStatus } from '../models/order';
import { logger } from '../middleware/logger';

export function createOrderRoutes(orderService: OrderService): Router {
  const router = Router();

  // Create order
  router.post('/', async (req: Request, res: Response) => {
    try {
      const orderData: CreateOrderRequest = req.body;

      // Validate required fields
      if (!orderData.userId || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!orderData.shippingAddress || !orderData.billingAddress) {
        return res.status(400).json({ error: 'Shipping and billing addresses are required' });
      }

      const order = await orderService.createOrder(orderData);
      res.status(201).json({ order });
    } catch (error: any) {
      logger.error('Failed to create order', { error: error.message });

      if (error.message?.includes('Insufficient inventory') || error.message?.includes('not found')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Get order by ID
  router.get('/:orderId', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrder(orderId);
      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to get order', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(500).json({ error: 'Failed to get order' });
    }
  });

  // Get user orders
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const orders = await orderService.getUserOrders(userId, limit, offset);
      res.json({ orders, limit, offset });
    } catch (error: any) {
      logger.error('Failed to get user orders', { error: error.message });
      res.status(500).json({ error: 'Failed to get user orders' });
    }
  });

  // Process payment for order
  router.post('/:orderId/payment', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const paymentResponse = await orderService.processPayment(orderId);

      if (paymentResponse.success) {
        res.json({
          success: true,
          message: 'Payment processed successfully',
          transactionId: paymentResponse.transactionId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: paymentResponse.error || 'Payment failed',
        });
      }
    } catch (error: any) {
      logger.error('Payment processing failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update order status
  router.put('/:orderId/status', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status, notes }: UpdateOrderStatusRequest = req.body;

      if (!Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      const order = await orderService.updateOrderStatus(orderId, status, notes);
      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to update order status', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // Cancel order
  router.post('/:orderId/cancel', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
      }

      const order = await orderService.cancelOrder(orderId, reason);
      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to cancel order', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (error.message?.includes('Cannot cancel')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to cancel order' });
    }
  });

  // Mark order as shipped
  router.post('/:orderId/ship', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { trackingNumber, carrier } = req.body;

      if (!trackingNumber || !carrier) {
        return res.status(400).json({ error: 'Tracking number and carrier are required' });
      }

      const order = await orderService.markAsShipped(orderId, trackingNumber, carrier);
      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to mark order as shipped', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(500).json({ error: 'Failed to mark order as shipped' });
    }
  });

  // Mark order as delivered
  router.post('/:orderId/deliver', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await orderService.markAsDelivered(orderId);
      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to mark order as delivered', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(500).json({ error: 'Failed to mark order as delivered' });
    }
  });

  // Get all orders (admin)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      if (userId) {
        // Get orders for specific user
        const orders = await orderService.getUserOrders(userId, limit, skip);
        return res.json({ orders, limit, skip });
      }

      // Admin: Get all orders (would require admin auth in production)
      const orders = await orderService.getAllOrders(limit, skip, status);
      res.json({ orders, limit, skip });
    } catch (error: any) {
      logger.error('Failed to get orders', { error: error.message });
      res.status(500).json({ error: 'Failed to get orders' });
    }
  });

  return router;
}
