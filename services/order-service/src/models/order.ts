export enum OrderStatus {
  PENDING = 'pending',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_FAILED = 'payment_failed',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface BillingAddress extends ShippingAddress {}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  // Items
  items: OrderItem[];
  itemCount: number;

  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Addresses
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;

  // Payment
  paymentIntentId?: string;
  transactionId?: string;

  // Metadata
  customerNotes?: string;
  internalNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

export interface CreateOrderRequest {
  userId: string;
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  paymentMethod: PaymentMethod;
  customerNotes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodDetails?: any;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentIntentId?: string;
  error?: string;
}
