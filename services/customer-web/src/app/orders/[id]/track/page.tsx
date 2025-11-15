'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderService, Order } from '@/lib/api';

interface TrackingEvent {
  status: string;
  timestamp: Date;
  completed: boolean;
  current: boolean;
  icon: string;
  description: string;
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadOrder();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrder(orderId);
      setOrder(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const getTrackingTimeline = (order: Order): TrackingEvent[] => {
    const statusOrder = ['pending', 'payment_pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.status);

    const events: TrackingEvent[] = [
      {
        status: 'pending',
        timestamp: new Date(order.createdAt),
        completed: currentStatusIndex >= 0,
        current: order.status === 'pending',
        icon: '📝',
        description: 'Order placed',
      },
      {
        status: 'confirmed',
        timestamp: new Date(order.createdAt),
        completed: currentStatusIndex >= 2,
        current: order.status === 'confirmed',
        icon: '✓',
        description: 'Order confirmed',
      },
      {
        status: 'processing',
        timestamp: new Date(order.updatedAt),
        completed: currentStatusIndex >= 3,
        current: order.status === 'processing',
        icon: '⚙️',
        description: 'Processing order',
      },
      {
        status: 'shipped',
        timestamp: new Date(order.updatedAt),
        completed: currentStatusIndex >= 4,
        current: order.status === 'shipped',
        icon: '🚚',
        description: 'Order shipped',
      },
      {
        status: 'delivered',
        timestamp: new Date(order.updatedAt),
        completed: currentStatusIndex >= 5,
        current: order.status === 'delivered',
        icon: '📦',
        description: 'Delivered',
      },
    ];

    // Handle cancelled status
    if (order.status === 'cancelled') {
      return [
        {
          status: 'cancelled',
          timestamp: new Date(order.updatedAt),
          completed: true,
          current: true,
          icon: '✗',
          description: 'Order cancelled',
        },
      ];
    }

    return events;
  };

  if (loading && !order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading tracking information...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error || 'Order not found'}
      </div>
    );
  }

  const timeline = getTrackingTimeline(order);
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to Orders
        </button>
        <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
        <p className="text-gray-600">Order Number: {order.orderNumber}</p>
      </div>

      {/* Auto-refresh toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Auto-refresh every 30 seconds</span>
        </label>
      </div>

      {/* Status Banner */}
      {isDelivered && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">✓</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Delivered!</h2>
              <p>Your order has been delivered successfully.</p>
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">✗</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Order Cancelled</h2>
              <p>This order has been cancelled.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Timeline */}
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <h2 className="text-2xl font-bold mb-8">Order Status</h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

          {/* Timeline events */}
          <div className="space-y-8">
            {timeline.map((event, index) => (
              <div key={event.status} className="relative flex gap-6">
                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full text-2xl ${
                  event.completed
                    ? 'bg-green-500 text-white'
                    : event.current
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {event.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-3">
                  <h3 className={`text-lg font-bold ${
                    event.completed || event.current ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {event.description}
                  </h3>
                  {event.completed && (
                    <p className="text-gray-600 text-sm mt-1">
                      {event.timestamp.toLocaleString()}
                    </p>
                  )}
                  {event.current && !event.completed && (
                    <p className="text-blue-600 text-sm mt-1 font-semibold">
                      Currently in progress...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shipping Information */}
      {(order.status === 'shipped' || order.status === 'delivered') && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Shipping Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Tracking Number</p>
              <p className="font-bold text-lg">
                {/* In a real system, this would come from the order */}
                TRK-{order.orderNumber.replace('ORD-', '')}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Carrier</p>
              <p className="font-bold">
                {/* In a real system, this would come from the order */}
                Standard Shipping
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-600 text-sm mb-1">Delivery Address</p>
            <div className="text-gray-700">
              <p className="font-semibold">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.productId} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-3xl">📦</div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-gray-600 text-sm">SKU: {item.sku}</p>
                <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-blue-600">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link
          href={`/orders/${order.id}`}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          View Full Order Details
        </Link>
        {!isCancelled && !isDelivered && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel this order?')) {
                orderService.cancelOrder(order.id).then(() => {
                  loadOrder();
                });
              }
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Help */}
      <div className="mt-8 text-center text-gray-600">
        <p>Need help with your order?</p>
        <Link href="/support" className="text-blue-600 hover:underline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
