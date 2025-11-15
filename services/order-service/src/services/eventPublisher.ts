import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';
import { Order, OrderStatus, PaymentResponse } from '../models/order';
import { logger } from '../middleware/logger';

export class EventPublisher {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'order-service',
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

  private async publishEvent(eventType: string, orderId: string, data: any): Promise<void> {
    try {
      const event = {
        event_type: eventType,
        order_id: orderId,
        timestamp: new Date().toISOString(),
        data,
      };

      await this.producer.send({
        topic: config.kafka.topic,
        messages: [
          {
            key: orderId,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.debug('Event published', { eventType, orderId });
    } catch (error) {
      logger.error('Failed to publish event', { eventType, orderId, error });
    }
  }

  async publishOrderCreated(order: Order): Promise<void> {
    await this.publishEvent('order.created', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      total_amount: order.totalAmount,
      item_count: order.itemCount,
      status: order.status,
      customer_email: order.shippingAddress?.email || 'customer@example.com', // Would come from user service
      customer_name: order.shippingAddress?.fullName,
      customer_phone: order.shippingAddress?.phone,
      items: order.items.map(item => ({
        product_id: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }

  async publishOrderStatusChanged(order: Order, newStatus: OrderStatus): Promise<void> {
    await this.publishEvent('order.status_changed', order.id, {
      order_number: order.orderNumber,
      old_status: order.status,
      new_status: newStatus,
      user_id: order.userId,
    });
  }

  async publishPaymentSuccessful(order: Order, paymentResponse: PaymentResponse): Promise<void> {
    await this.publishEvent('order.payment_successful', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      amount: order.totalAmount,
      transaction_id: paymentResponse.transactionId,
      payment_intent_id: paymentResponse.paymentIntentId,
    });
  }

  async publishPaymentFailed(order: Order, error?: string): Promise<void> {
    await this.publishEvent('order.payment_failed', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      amount: order.totalAmount,
      error: error || 'Payment processing failed',
    });
  }

  async publishOrderCancelled(order: Order, reason: string): Promise<void> {
    await this.publishEvent('order.cancelled', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      reason,
      cancelled_at: order.cancelledAt,
      cancellation_reason: reason,
      customer_email: order.shippingAddress?.email || 'customer@example.com',
      customer_name: order.shippingAddress?.fullName,
    });
  }

  async publishOrderShipped(order: Order, trackingNumber?: string, carrier?: string): Promise<void> {
    await this.publishEvent('order.shipped', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      tracking_number: trackingNumber,
      carrier: carrier,
      shipping_address: order.shippingAddress,
      customer_email: order.shippingAddress?.email || 'customer@example.com', // Would come from user service
      customer_name: order.shippingAddress?.fullName,
      customer_phone: order.shippingAddress?.phone,
    });
  }

  async publishOrderDelivered(order: Order): Promise<void> {
    await this.publishEvent('order.delivered', order.id, {
      order_number: order.orderNumber,
      user_id: order.userId,
      delivered_at: order.deliveredAt,
      customer_email: order.shippingAddress?.email || 'customer@example.com', // Would come from user service
      customer_name: order.shippingAddress?.fullName,
    });
  }
}
