'use client';

import Link from 'next/link';

export default function AdminProductsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Product Management</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">🚧 Coming Soon</h2>
        <p className="text-gray-700">
          Product management features are under development. This page will allow you to:
        </p>
        <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
          <li>View all products in the catalog</li>
          <li>Add new products</li>
          <li>Edit existing products (name, price, description, etc.)</li>
          <li>Manage product categories</li>
          <li>Upload product images</li>
          <li>Set product availability</li>
          <li>Bulk operations</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">Current Capabilities</h3>
        <p className="text-gray-600 mb-4">
          While the admin UI is being developed, you can manage products using the Catalog Service API directly.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">List Products</h4>
            <code className="text-sm">GET http://localhost:8000/api/v1/products</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Get Product</h4>
            <code className="text-sm">GET http://localhost:8000/api/v1/products/:id</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Create Product</h4>
            <code className="text-sm">POST http://localhost:8000/api/v1/products</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Update Product</h4>
            <code className="text-sm">PUT http://localhost:8000/api/v1/products/:id</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Delete Product</h4>
            <code className="text-sm">DELETE http://localhost:8000/api/v1/products/:id</code>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/products"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Products (Customer View)
          </Link>
        </div>
      </div>
    </div>
  );
}
