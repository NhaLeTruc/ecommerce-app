'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { orderService, Order } from '@/lib/api';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const isPaymentSuccess = order.paymentStatus === 'captured';
  const isPaymentPending = order.paymentStatus === 'pending' || order.paymentStatus === 'processing';
  const isPaymentFailed = order.paymentStatus === 'failed';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success/Failure Banner */}
      {isPaymentSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">✓</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Order Confirmed!</h2>
              <p>Thank you for your purchase. Your order has been successfully placed.</p>
            </div>
          </div>
        </div>
      )}

      {isPaymentPending && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">⏳</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Payment Processing</h2>
              <p>Your payment is being processed. We'll send you a confirmation email shortly.</p>
            </div>
          </div>
        </div>
      )}

      {isPaymentFailed && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">✗</div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Payment Failed</h2>
              <p>There was an issue processing your payment. Please try again or contact support.</p>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-2xl font-bold mb-4">Order Details</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-600 text-sm">Order Number</p>
            <p className="font-bold text-lg">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Order Date</p>
            <p className="font-bold">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Order Status</p>
            <p className="font-bold capitalize">
              <span className={`inline-block px-3 py-1 rounded ${
                order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {order.status}
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Payment Status</p>
            <p className="font-bold capitalize">
              <span className={`inline-block px-3 py-1 rounded ${
                isPaymentSuccess ? 'bg-green-100 text-green-800' :
                isPaymentFailed ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {order.paymentStatus}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-2xl font-bold mb-4">Items Ordered</h3>
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
                <p className="text-gray-600 text-sm">${item.price.toFixed(2)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Shipping Address</h3>
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

        {/* Billing Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Billing Address</h3>
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

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-2xl font-bold mb-4">Order Summary</h3>
        <div className="space-y-2">
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
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-blue-600">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-gray-600 text-sm">Payment Method</p>
          <p className="font-semibold capitalize">{order.paymentMethod.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link
          href="/products"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Continue Shopping
        </Link>
        {isPaymentSuccess && (
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Print Order
          </button>
        )}
      </div>

      {/* Confirmation Message */}
      {isPaymentSuccess && (
        <div className="mt-8 text-center text-gray-600">
          <p>A confirmation email has been sent to your email address.</p>
          <p className="mt-2">Order ID: {order.id}</p>
        </div>
      )}
    </div>
  );
}
