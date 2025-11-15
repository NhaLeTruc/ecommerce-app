'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { orderService } from '@/lib/api';

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || '';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders(limit, page * limit, selectedStatus);
      setOrders(data.orders || []);
      setHasMore((data.orders || []).length === limit);
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <div className="text-gray-600">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Orders</option>
              <option value="pending">Pending</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedStatus('');
                setPage(0);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900 font-medium">
                        {order.shippingAddress?.fullName || 'N/A'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {order.userId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                      <div className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.itemCount || order.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-6 py-2 bg-gray-900 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
            className="px-6 py-2 bg-gray-900 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
