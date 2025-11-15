'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderService, Order } from '@/lib/api';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Ship order form
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    loadOrder();
  }, [orderId]);

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

  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackingNumber || !carrier) {
      alert('Please enter tracking number and carrier');
      return;
    }

    try {
      setUpdating(true);
      await fetch(`${process.env.ORDER_SERVICE_URL || 'http://localhost:3001'}/api/v1/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, carrier }),
      });

      setShowShipForm(false);
      setTrackingNumber('');
      setCarrier('');
      await loadOrder();
      alert('Order marked as shipped successfully!');
    } catch (err: any) {
      alert('Failed to ship order: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!confirm('Mark this order as delivered?')) return;

    try {
      setUpdating(true);
      await fetch(`${process.env.ORDER_SERVICE_URL || 'http://localhost:3001'}/api/v1/orders/${orderId}/deliver`, {
        method: 'POST',
      });

      await loadOrder();
      alert('Order marked as delivered successfully!');
    } catch (err: any) {
      alert('Failed to mark as delivered: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      setUpdating(true);
      await orderService.cancelOrder(orderId);
      await loadOrder();
      alert('Order cancelled successfully!');
    } catch (err: any) {
      alert('Failed to cancel order: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading order...</div>
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

  const canShip = order.status === 'confirmed' || order.status === 'processing';
  const canDeliver = order.status === 'shipped';
  const canCancel = !['shipped', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/orders" className="text-blue-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{order.orderNumber}</h1>
            <p className="text-gray-600">Order ID: {order.id}</p>
            <p className="text-gray-600 mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className={`inline-block px-3 py-1 rounded font-semibold ${
                order.status === 'confirmed' || order.status === 'delivered'
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded font-semibold ${
                order.paymentStatus === 'captured'
                  ? 'bg-green-100 text-green-800'
                  : order.paymentStatus === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                Payment: {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {canShip && (
            <button
              onClick={() => setShowShipForm(true)}
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              📦 Ship Order
            </button>
          )}

          {canDeliver && (
            <button
              onClick={handleMarkAsDelivered}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              ✓ Mark as Delivered
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={updating}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-semibold"
            >
              ✗ Cancel Order
            </button>
          )}

          <Link
            href={`/orders/${order.id}`}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold"
          >
            View Customer View
          </Link>
        </div>

        {/* Ship Form */}
        {showShipForm && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-4">Ship Order</h3>
            <form onSubmit={handleShipOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tracking Number *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., 1Z999AA10123456784"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Carrier *</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select carrier...</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="USPS">USPS</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {updating ? 'Shipping...' : 'Confirm Ship'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowShipForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.productId} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded" />
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
                <p className="text-gray-600 text-sm">${item.price.toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span className="font-semibold">${order.shippingAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span className="font-semibold">${order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-blue-600">${order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer & Address Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
          <div className="text-gray-700">
            <p className="font-semibold">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.street}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
            </p>
            <p>{order.shippingAddress.country}</p>
            <p className="mt-2">Phone: {order.shippingAddress.phone}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Billing Address</h2>
          <div className="text-gray-700">
            <p className="font-semibold">{order.billingAddress.fullName}</p>
            <p>{order.billingAddress.street}</p>
            <p>
              {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zipCode}
            </p>
            <p>{order.billingAddress.country}</p>
            <p className="mt-2">Phone: {order.billingAddress.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
