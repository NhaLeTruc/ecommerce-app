'use client';

import Link from 'next/link';

export default function AdminInventoryPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">🚧 Coming Soon</h2>
        <p className="text-gray-700">
          Inventory management features are under development. This page will allow you to:
        </p>
        <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
          <li>View current stock levels for all products</li>
          <li>Update inventory quantities</li>
          <li>View inventory reservations</li>
          <li>Track inventory adjustments and history</li>
          <li>Set low stock alerts</li>
          <li>Manage multiple warehouse locations</li>
          <li>Bulk inventory updates</li>
          <li>Generate inventory reports</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">Current Capabilities</h3>
        <p className="text-gray-600 mb-4">
          While the admin UI is being developed, you can manage inventory using the Inventory Service API directly.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">List Inventory</h4>
            <code className="text-sm">GET http://localhost:8001/api/v1/inventory</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Get Product Inventory</h4>
            <code className="text-sm">GET http://localhost:8001/api/v1/inventory/product/:productId</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Update Inventory</h4>
            <code className="text-sm">PUT http://localhost:8001/api/v1/inventory/:id</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Adjust Inventory</h4>
            <code className="text-sm">POST http://localhost:8001/api/v1/inventory/:id/adjust</code>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">Reserve Inventory</h4>
            <code className="text-sm">POST http://localhost:8001/api/v1/inventory/product/:productId/reserve</code>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold mb-2">⚠️ Low Stock Alerts</h4>
          <p className="text-sm text-gray-700">
            Products with inventory below 10 units are flagged as low stock on the dashboard.
            Consider restocking these items soon.
          </p>
        </div>
      </div>
    </div>
  );
}
