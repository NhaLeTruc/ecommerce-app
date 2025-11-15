'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cartService, orderService, Cart, Address, CreateOrderRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function CheckoutPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id || '';

  // Form state - pre-fill with user data
  const [shippingAddress, setShippingAddress] = useState<Address>({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: user?.phone || '',
  });

  const [billingAddress, setBillingAddress] = useState<Address>({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: '',
  });

  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  useEffect(() => {
    if (userId) {
      loadCart();
    }
  }, [userId]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await cartService.getCart(userId);
      if (!data || data.items.length === 0) {
        router.push('/cart');
        return;
      }
      setCart(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleShippingChange = (field: keyof Address, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
    if (sameAsShipping) {
      setBillingAddress((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleBillingChange = (field: keyof Address, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSameAsShippingChange = (checked: boolean) => {
    setSameAsShipping(checked);
    if (checked) {
      setBillingAddress({ ...shippingAddress });
    }
  };

  const validateForm = (): boolean => {
    if (!shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city ||
        !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.phone) {
      alert('Please fill in all shipping address fields');
      return false;
    }

    if (!sameAsShipping) {
      if (!billingAddress.fullName || !billingAddress.street || !billingAddress.city ||
          !billingAddress.state || !billingAddress.zipCode || !billingAddress.phone) {
        alert('Please fill in all billing address fields');
        return false;
      }
    }

    if (paymentMethod === 'credit_card') {
      if (!paymentDetails.cardNumber || !paymentDetails.expiryMonth ||
          !paymentDetails.expiryYear || !paymentDetails.cvv) {
        alert('Please fill in all payment details');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart || !validateForm()) return;

    try {
      setSubmitting(true);

      const orderData: CreateOrderRequest = {
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        shippingAddress,
        billingAddress: sameAsShipping ? shippingAddress : billingAddress,
        paymentMethod,
        paymentDetails: paymentMethod === 'credit_card' ? paymentDetails : undefined,
      };

      // Create order
      const order = await orderService.createOrder(orderData);

      // Process payment
      await orderService.processPayment(order.id);

      // Redirect to order confirmation
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      alert('Failed to place order: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading checkout...</div>
      </div>
    );
  }

  if (error || !cart) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error || 'Cart not found'}
      </div>
    );
  }

  const taxAmount = cart.subtotal * 0.08; // 8% tax
  const shippingAmount = 10.00; // Fixed shipping
  const totalAmount = cart.subtotal + taxAmount + shippingAmount;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Shipping Address</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={(e) => handleShippingChange('fullName', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={shippingAddress.street}
                    onChange={(e) => handleShippingChange('street', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => handleShippingChange('city', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State *</label>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) => handleShippingChange('state', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    value={shippingAddress.zipCode}
                    onChange={(e) => handleShippingChange('zipCode', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => handleShippingChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Billing Address</h2>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Same as shipping</span>
                </label>
              </div>

              {!sameAsShipping && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={billingAddress.fullName}
                      onChange={(e) => handleBillingChange('fullName', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Street Address *</label>
                    <input
                      type="text"
                      value={billingAddress.street}
                      onChange={(e) => handleBillingChange('street', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => handleBillingChange('city', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <input
                      type="text"
                      value={billingAddress.state}
                      onChange={(e) => handleBillingChange('state', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={billingAddress.zipCode}
                      onChange={(e) => handleBillingChange('zipCode', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={billingAddress.phone}
                      onChange={(e) => handleBillingChange('phone', e.target.value)}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Payment Method</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>Credit/Debit Card</span>
                </label>

                {paymentMethod === 'credit_card' && (
                  <div className="ml-6 grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Card Number *</label>
                      <input
                        type="text"
                        value={paymentDetails.cardNumber}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                        placeholder="4111 1111 1111 1111"
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Month *</label>
                      <input
                        type="text"
                        value={paymentDetails.expiryMonth}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryMonth: e.target.value })}
                        placeholder="MM"
                        maxLength={2}
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Year *</label>
                      <input
                        type="text"
                        value={paymentDetails.expiryYear}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, expiryYear: e.target.value })}
                        placeholder="YYYY"
                        maxLength={4}
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">CVV *</label>
                      <input
                        type="text"
                        value={paymentDetails.cvv}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>PayPal</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="truncate pr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">${shippingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-semibold">${taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {submitting ? 'Processing...' : 'Place Order'}
              </button>

              <p className="text-xs text-gray-600 mt-4 text-center">
                By placing this order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutPageContent />
    </ProtectedRoute>
  );
}
