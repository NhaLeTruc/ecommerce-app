import axios from 'axios';
import { OrderRepository } from '../database/orderRepository';
import { EventPublisher } from './eventPublisher';
import { config } from '../config';
import { logger } from '../middleware/logger';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  CreateOrderRequest,
  PaymentRequest,
  PaymentResponse,
} from '../models/order';

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private eventPublisher: EventPublisher
  ) {}

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    logger.info('Creating order', { userId: orderData.userId, itemCount: orderData.items.length });

    // Step 1: Validate inventory availability
    await this.validateInventory(orderData.items);

    // Step 2: Create order in database
    const order = await this.orderRepo.create(orderData);

    // Step 3: Reserve inventory
    try {
      await this.reserveInventory(order);
    } catch (error) {
      logger.error('Failed to reserve inventory', { orderId: order.id, error });
      await this.orderRepo.cancel(order.id, 'Inventory reservation failed');
      throw new Error('Failed to reserve inventory');
    }

    // Step 4: Clear user's cart
    try {
      await this.clearCart(orderData.userId);
    } catch (error) {
      logger.warn('Failed to clear cart', { userId: orderData.userId, error });
      // Non-fatal - continue
    }

    // Step 5: Publish order created event
    await this.eventPublisher.publishOrderCreated(order);

    logger.info('Order created successfully', { orderId: order.id, orderNumber: order.orderNumber });
    return order;
  }

  async processPayment(orderId: string): Promise<PaymentResponse> {
    logger.info('Processing payment', { orderId });

    const order = await this.orderRepo.findById(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`Order cannot be paid in status: ${order.status}`);
    }

    // Update order status to payment pending
    await this.orderRepo.updateStatus(orderId, OrderStatus.PAYMENT_PENDING);

    // Call payment service
    const paymentRequest: PaymentRequest = {
      orderId: order.id,
      amount: order.totalAmount,
      currency: 'USD',
      paymentMethod: order.paymentMethod,
    };

    try {
      const response = await axios.post(
        `${config.services.paymentUrl}/api/v1/payments/process`,
        paymentRequest,
        { timeout: 10000 }
      );

      const paymentResponse: PaymentResponse = response.data;

      if (paymentResponse.success) {
        // Update order with payment details
        await this.orderRepo.updatePaymentStatus(
          orderId,
          PaymentStatus.CAPTURED,
          paymentResponse.transactionId,
          paymentResponse.paymentIntentId
        );

        // Publish payment successful event
        await this.eventPublisher.publishPaymentSuccessful(order, paymentResponse);

        logger.info('Payment successful', { orderId, transactionId: paymentResponse.transactionId });
      } else {
        // Payment failed
        await this.orderRepo.updatePaymentStatus(orderId, PaymentStatus.FAILED);
        await this.orderRepo.updateStatus(orderId, OrderStatus.PAYMENT_FAILED);

        // Release inventory reservations
        await this.releaseInventory(order);

        // Publish payment failed event
        await this.eventPublisher.publishPaymentFailed(order, paymentResponse.error);

        logger.warn('Payment failed', { orderId, error: paymentResponse.error });
      }

      return paymentResponse;
    } catch (error: any) {
      logger.error('Payment service error', { orderId, error: error.message });

      await this.orderRepo.updatePaymentStatus(orderId, PaymentStatus.FAILED);
      await this.orderRepo.updateStatus(orderId, OrderStatus.PAYMENT_FAILED);
      await this.releaseInventory(order);

      throw new Error('Payment processing failed');
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.orderRepo.findById(orderId);
  }

  async getUserOrders(userId: string, limit = 20, offset = 0): Promise<Order[]> {
    return this.orderRepo.findByUserId(userId, limit, offset);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): Promise<Order> {
    const order = await this.orderRepo.updateStatus(orderId, status, notes);

    // Publish status change event
    await this.eventPublisher.publishOrderStatusChanged(order, status);

    logger.info('Order status updated', { orderId, status });
    return order;
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    logger.info('Cancelling order', { orderId, reason });

    const order = await this.orderRepo.findById(orderId);

    // Can only cancel if not shipped/delivered
    if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }

    // Cancel order
    const cancelledOrder = await this.orderRepo.cancel(orderId, reason);

    // Release inventory
    await this.releaseInventory(order);

    // If payment was captured, initiate refund
    if (order.paymentStatus === PaymentStatus.CAPTURED) {
      await this.initiateRefund(order);
    }

    // Publish cancelled event
    await this.eventPublisher.publishOrderCancelled(cancelledOrder, reason);

    logger.info('Order cancelled', { orderId });
    return cancelledOrder;
  }

  // Private helper methods

  private async validateInventory(items: Array<{ productId: string; quantity: number }>): Promise<void> {
    logger.debug('Validating inventory', { itemCount: items.length });

    for (const item of items) {
      try {
        const response = await axios.get(
          `${config.services.inventoryUrl}/api/v1/inventory/product/${item.productId}`,
          { timeout: 5000 }
        );

        const inventory = response.data;

        if (inventory.available_quantity < item.quantity) {
          throw new Error(`Insufficient inventory for product ${item.productId}`);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error(`Product ${item.productId} not found in inventory`);
        }
        throw error;
      }
    }
  }

  private async reserveInventory(order: Order): Promise<void> {
    logger.debug('Reserving inventory', { orderId: order.id });

    for (const item of order.items) {
      await axios.post(
        `${config.services.inventoryUrl}/api/v1/inventory/product/${item.productId}/reserve`,
        {
          quantity: item.quantity,
          order_id: order.id,
          customer_id: order.userId,
        },
        { timeout: 5000 }
      );
    }
  }

  private async releaseInventory(order: Order): Promise<void> {
    logger.debug('Releasing inventory', { orderId: order.id });

    // Get reservations for this order and release them
    // This would require the inventory service to support querying by order_id
    // For now, we'll skip the actual API call in this implementation
    logger.info('Inventory release requested', { orderId: order.id });
  }

  private async clearCart(userId: string): Promise<void> {
    logger.debug('Clearing cart', { userId });

    try {
      await axios.delete(`${config.services.cartUrl}/api/v1/cart/${userId}`, {
        timeout: 5000,
      });
    } catch (error) {
      logger.warn('Failed to clear cart', { userId, error });
    }
  }

  private async initiateRefund(order: Order): Promise<void> {
    logger.info('Initiating refund', { orderId: order.id });

    try {
      await axios.post(
        `${config.services.paymentUrl}/api/v1/payments/refund`,
        {
          orderId: order.id,
          transactionId: order.transactionId,
          amount: order.totalAmount,
        },
        { timeout: 10000 }
      );

      await this.orderRepo.updatePaymentStatus(order.id, PaymentStatus.REFUNDED);
    } catch (error) {
      logger.error('Refund failed', { orderId: order.id, error });
      throw error;
    }
  }
}
