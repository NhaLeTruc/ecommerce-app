'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogService, Product } from '@/lib/api';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const data = await catalogService.getProducts(0, 4);
      setFeaturedProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load featured products', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-12 mb-8">
        <h1 className="text-5xl font-bold mb-4">Welcome to Our Store</h1>
        <p className="text-xl mb-6">
          Discover amazing products at great prices.
        </p>
        <div className="flex gap-4">
          <Link
            href="/products"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Shop Now
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 font-semibold"
          >
            Search Products
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <Link
          href="/products"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-2">📦</div>
          <h2 className="text-xl font-bold mb-2">All Products</h2>
          <p className="text-gray-600 text-sm">
            Browse our full catalog
          </p>
        </Link>
        <Link
          href="/search"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-xl font-bold mb-2">Search</h2>
          <p className="text-gray-600 text-sm">
            Find what you need
          </p>
        </Link>
        <Link
          href="/cart"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-2">🛒</div>
          <h2 className="text-xl font-bold mb-2">Your Cart</h2>
          <p className="text-gray-600 text-sm">
            View your items
          </p>
        </Link>
        <Link
          href="/orders"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-2">📋</div>
          <h2 className="text-xl font-bold mb-2">Orders</h2>
          <p className="text-gray-600 text-sm">
            Track your orders
          </p>
        </Link>
      </div>

      {/* Featured Products */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <Link href="/products" className="text-blue-600 hover:underline font-semibold">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="aspect-square bg-gray-200 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-6xl">📦</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 truncate">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.inventory_quantity > 0 ? (
                      <span className="text-green-600 text-sm font-semibold">In Stock</span>
                    ) : (
                      <span className="text-red-600 text-sm font-semibold">Out of Stock</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Electronics', icon: '💻', href: '/products' },
            { name: 'Accessories', icon: '🎧', href: '/products' },
            { name: 'Computers', icon: '🖥️', href: '/products' },
            { name: 'Peripherals', icon: '🖱️', href: '/products' },
          ].map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="p-6 border rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-center"
            >
              <div className="text-5xl mb-2">{category.icon}</div>
              <h3 className="font-semibold">{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
