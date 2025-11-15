'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { orderService, Order } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function OrdersPageContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const userId = user?.id || '';

  useEffect(() => {
    if (userId) {
      loadOrders();
    }
  }, [page, userId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getUserOrders(userId, page * limit, limit);
      if (data.orders.length < limit) {
        setHasMore(false);
      }
      setOrders(data.orders);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-3xl font-bold mb-4">No Orders Yet</h1>
        <p className="text-gray-600 mb-8">You haven't placed any orders yet.</p>
        <Link
          href="/products"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <div className="text-gray-600">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            {/* Order Header */}
            <div className="p-6 border-b">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Order Number</p>
                  <p className="font-bold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Amount</p>
                  <p className="font-bold text-lg text-blue-600">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="p-6">
              <div className="flex flex-wrap gap-4 mb-4">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-2xl">📦</div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm truncate max-w-[200px]">
                        {item.name}
                      </p>
                      <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="flex items-center text-gray-600">
                    +{order.items.length - 3} more {order.items.length - 3 === 1 ? 'item' : 'items'}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Payment:</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus}
                  </span>
                </div>

                <div className="flex-1"></div>

                <Link
                  href={`/orders/${order.id}`}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  View Details →
                </Link>

                {order.status === 'confirmed' && order.paymentStatus === 'captured' && (
                  <Link
                    href={`/orders/${order.id}/track`}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Track Order
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-600">
          Page {page + 1}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={!hasMore}
          className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageContent />
    </ProtectedRoute>
  );
}
