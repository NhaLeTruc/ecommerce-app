'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { orderService, catalogService } from '@/lib/api';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  totalProducts: number;
  lowStockProducts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    totalProducts: 0,
    lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load orders statistics
      const ordersData = await orderService.getAllOrders(100, 0);
      const orders = ordersData.orders || [];

      const stats: DashboardStats = {
        totalOrders: orders.length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending' || o.status === 'payment_pending').length,
        confirmedOrders: orders.filter((o: any) => o.status === 'confirmed' || o.status === 'processing').length,
        shippedOrders: orders.filter((o: any) => o.status === 'shipped').length,
        totalProducts: 0,
        lowStockProducts: 0,
      };

      // Load products statistics
      try {
        const productsData = await catalogService.getProducts(0, 100);
        const products = productsData.products || [];
        stats.totalProducts = products.length;
        stats.lowStockProducts = products.filter((p: any) => p.inventory_quantity < 10).length;
      } catch (err) {
        console.error('Failed to load products', err);
      }

      setStats(stats);
      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data', err);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Total Orders</h3>
            <div className="text-3xl">📦</div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          <Link href="/admin/orders" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            View all →
          </Link>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Pending Orders</h3>
            <div className="text-3xl">⏳</div>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
          <Link href="/admin/orders?status=pending" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            View pending →
          </Link>
        </div>

        {/* Ready to Ship */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Ready to Ship</h3>
            <div className="text-3xl">✅</div>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.confirmedOrders}</p>
          <Link href="/admin/orders?status=confirmed" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            View orders →
          </Link>
        </div>

        {/* Shipped Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Shipped</h3>
            <div className="text-3xl">🚚</div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.shippedOrders}</p>
          <Link href="/admin/orders?status=shipped" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            View shipped →
          </Link>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Total Products</h3>
            <div className="text-3xl">📋</div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
          <Link href="/admin/products" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Manage products →
          </Link>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-medium">Low Stock Alert</h3>
            <div className="text-3xl">⚠️</div>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.lowStockProducts}</p>
          <Link href="/admin/inventory" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            View inventory →
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-blue-600 hover:underline">
              View All Orders →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        order.paymentStatus === 'captured' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-bold mb-2">Manage Orders</h3>
          <p className="text-gray-600 text-sm">
            View, update, and ship customer orders
          </p>
        </Link>

        <Link
          href="/admin/products"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2">Manage Products</h3>
          <p className="text-gray-600 text-sm">
            Add, edit, and remove products from catalog
          </p>
        </Link>

        <Link
          href="/admin/inventory"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">Manage Inventory</h3>
          <p className="text-gray-600 text-sm">
            Track and update product stock levels
          </p>
        </Link>
      </div>
    </div>
  );
}
