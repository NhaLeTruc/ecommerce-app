import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { CreateOrderRequest, UpdateOrderStatusRequest, OrderStatus } from '../models/order';
import { logger } from '../middleware/logger';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

export function createOrderRoutes(orderService: OrderService): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticateJWT);

  // Create order (user can only create order for themselves)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const orderData: CreateOrderRequest = req.body;

      // Override userId with authenticated user's ID (prevent impersonation)
      orderData.userId = req.user!.user_id;

      // Validate required fields
      if (!orderData.items || orderData.items.length === 0) {
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

  // Get order by ID (user can only get their own orders, admin can get any)
  router.get('/:orderId', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrder(orderId);

      // Verify ownership (unless admin)
      if (req.user!.role !== 'admin' && order.userId !== req.user!.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ order });
    } catch (error: any) {
      logger.error('Failed to get order', { error: error.message });

      if (error.message === 'Order not found') {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.status(500).json({ error: 'Failed to get order' });
    }
  });

  // Get user orders (user can only get their own, admin can get any user's)
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Verify ownership (unless admin)
      if (req.user!.role !== 'admin' && userId !== req.user!.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const orders = await orderService.getUserOrders(userId, limit, offset);
      res.json({ orders, limit, offset });
    } catch (error: any) {
      logger.error('Failed to get user orders', { error: error.message });
      res.status(500).json({ error: 'Failed to get user orders' });
    }
  });

  // Process payment for order (user can only pay their own orders)
  router.post('/:orderId/payment', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      // Verify ownership before processing payment
      const order = await orderService.getOrder(orderId);
      if (req.user!.role !== 'admin' && order.userId !== req.user!.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

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

  // Update order status (admin only)
  router.put('/:orderId/status', requireAdmin, async (req: Request, res: Response) => {
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

  // Cancel order (user can cancel their own orders, admin can cancel any)
  router.post('/:orderId/cancel', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
      }

      // Verify ownership before canceling
      const existingOrder = await orderService.getOrder(orderId);
      if (req.user!.role !== 'admin' && existingOrder.userId !== req.user!.user_id) {
        return res.status(403).json({ error: 'Access denied' });
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

  // Mark order as shipped (admin only)
  router.post('/:orderId/ship', requireAdmin, async (req: Request, res: Response) => {
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

  // Mark order as delivered (admin only)
  router.post('/:orderId/deliver', requireAdmin, async (req: Request, res: Response) => {
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

  // Get all orders (admin only) or user's own orders
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      // If requesting all orders (no userId filter), require admin
      if (!userId) {
        if (req.user!.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }
        const orders = await orderService.getAllOrders(limit, skip, status);
        return res.json({ orders, limit, skip });
      }

      // If requesting specific user's orders, verify ownership (unless admin)
      if (req.user!.role !== 'admin' && userId !== req.user!.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const orders = await orderService.getUserOrders(userId, limit, skip);
      res.json({ orders, limit, skip });
    } catch (error: any) {
      logger.error('Failed to get orders', { error: error.message });
      res.status(500).json({ error: 'Failed to get orders' });
    }
  });

  return router;
}
