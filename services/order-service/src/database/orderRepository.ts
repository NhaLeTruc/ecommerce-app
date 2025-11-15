import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from './pool';
import { Order, OrderItem, OrderStatus, PaymentStatus, CreateOrderRequest } from '../models/order';

export class OrderRepository {
  async create(orderData: CreateOrderRequest): Promise<Order> {
    return transaction(async (client) => {
      // Generate order number (format: ORD-YYYYMMDD-XXXXX)
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      const orderNumber = `ORD-${dateStr}-${random}`;

      const orderId = uuidv4();

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxAmount = subtotal * 0.08; // 8% tax
      const shippingAmount = 9.99;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Insert order
      const orderQuery = `
        INSERT INTO orders (
          id, order_number, user_id, status, payment_status, payment_method,
          subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
          shipping_address, billing_address, customer_notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderId,
        orderNumber,
        orderData.userId,
        OrderStatus.PENDING,
        PaymentStatus.PENDING,
        orderData.paymentMethod,
        subtotal,
        taxAmount,
        shippingAmount,
        0, // discount_amount
        totalAmount,
        JSON.stringify(orderData.shippingAddress),
        JSON.stringify(orderData.billingAddress),
        orderData.customerNotes || null,
        new Date(),
        new Date(),
      ]);

      // Insert order items
      const itemsQuery = `
        INSERT INTO order_items (
          id, order_id, product_id, sku, name, price, quantity, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const item of orderData.items) {
        await client.query(itemsQuery, [
          uuidv4(),
          orderId,
          item.productId,
          item.sku,
          item.name,
          item.price,
          item.quantity,
          item.price * item.quantity,
        ]);
      }

      return this.findById(orderId, client);
    });
  }

  async findById(id: string, client?: PoolClient): Promise<Order> {
    const orderQuery = 'SELECT * FROM orders WHERE id = $1';
    const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';

    let orderResult;
    let itemsResult;

    if (client) {
      orderResult = await client.query(orderQuery, [id]);
      itemsResult = await client.query(itemsQuery, [id]);
    } else {
      orderResult = await query(orderQuery, [id]);
      itemsResult = await query(itemsQuery, [id]);
    }

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const orderRow = orderResult.rows[0];

    return {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      userId: orderRow.user_id,
      status: orderRow.status,
      paymentStatus: orderRow.payment_status,
      paymentMethod: orderRow.payment_method,
      items: itemsResult.rows.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        sku: item.sku,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
      })),
      itemCount: itemsResult.rows.reduce((sum: number, item: any) => sum + item.quantity, 0),
      subtotal: parseFloat(orderRow.subtotal),
      taxAmount: parseFloat(orderRow.tax_amount),
      shippingAmount: parseFloat(orderRow.shipping_amount),
      discountAmount: parseFloat(orderRow.discount_amount),
      totalAmount: parseFloat(orderRow.total_amount),
      shippingAddress: JSON.parse(orderRow.shipping_address),
      billingAddress: JSON.parse(orderRow.billing_address),
      paymentIntentId: orderRow.payment_intent_id,
      transactionId: orderRow.transaction_id,
      customerNotes: orderRow.customer_notes,
      internalNotes: orderRow.internal_notes,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      paidAt: orderRow.paid_at,
      shippedAt: orderRow.shipped_at,
      deliveredAt: orderRow.delivered_at,
      cancelledAt: orderRow.cancelled_at,
    };
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Order[]> {
    const orderQuery = `
      SELECT * FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(orderQuery, [userId, limit, offset]);

    const orders = await Promise.all(
      result.rows.map((row: any) => this.findById(row.id))
    );

    return orders;
  }

  async updateStatus(orderId: string, status: OrderStatus, notes?: string): Promise<Order> {
    return transaction(async (client) => {
      const updateQuery = `
        UPDATE orders
        SET status = $1, internal_notes = $2, updated_at = $3
        WHERE id = $4
      `;

      await client.query(updateQuery, [status, notes || null, new Date(), orderId]);

      return this.findById(orderId, client);
    });
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    transactionId?: string,
    paymentIntentId?: string
  ): Promise<Order> {
    return transaction(async (client) => {
      const updateQuery = `
        UPDATE orders
        SET payment_status = $1, transaction_id = $2, payment_intent_id = $3,
            paid_at = $4, updated_at = $5
        WHERE id = $6
      `;

      const paidAt = paymentStatus === PaymentStatus.CAPTURED ? new Date() : null;

      await client.query(updateQuery, [
        paymentStatus,
        transactionId || null,
        paymentIntentId || null,
        paidAt,
        new Date(),
        orderId,
      ]);

      // If payment captured, update order status to confirmed
      if (paymentStatus === PaymentStatus.CAPTURED) {
        await client.query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          [OrderStatus.CONFIRMED, orderId]
        );
      }

      return this.findById(orderId, client);
    });
  }

  async cancel(orderId: string, reason: string): Promise<Order> {
    return transaction(async (client) => {
      const updateQuery = `
        UPDATE orders
        SET status = $1, internal_notes = $2, cancelled_at = $3, updated_at = $4
        WHERE id = $5
      `;

      await client.query(updateQuery, [
        OrderStatus.CANCELLED,
        reason,
        new Date(),
        new Date(),
        orderId,
      ]);

      return this.findById(orderId, client);
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const result = await query('SELECT id FROM orders WHERE order_number = $1', [orderNumber]);

    if (result.rows.length === 0) {
      throw new Error('Order not found');
    }

    return this.findById(result.rows[0].id);
  }

  async findAll(limit = 20, skip = 0, status?: string): Promise<Order[]> {
    let orderQuery = `
      SELECT * FROM orders
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      orderQuery += ' WHERE ' + conditions.join(' AND ');
    }

    orderQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, skip);

    const result = await query(orderQuery, params);

    const orders = await Promise.all(
      result.rows.map((row: any) => this.findById(row.id))
    );

    return orders;
  }
}
