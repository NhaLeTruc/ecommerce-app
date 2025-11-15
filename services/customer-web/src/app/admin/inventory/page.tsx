'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  status: string;
  location: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface InventoryAdjustment {
  quantity: number;
  reason: string;
  adjusted_by: string;
  notes: string;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const inventoryApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:8001',
    timeout: 10000,
  });

  const catalogApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || 'http://localhost:8000',
    timeout: 10000,
  });

  useEffect(() => {
    loadInventory();
  }, [showLowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      let items: InventoryItem[];

      if (showLowStockOnly) {
        const response = await inventoryApi.get('/api/v1/inventory/low-stock');
        items = response.data;
      } else {
        const response = await inventoryApi.get('/api/v1/inventory', {
          params: { limit: 100, offset: 0 },
        });
        items = response.data.items || [];
      }

      setInventory(items);

      // Load product details for each inventory item
      const productMap = new Map<string, Product>();
      for (const item of items) {
        if (!productMap.has(item.product_id)) {
          try {
            const productResponse = await catalogApi.get(`/api/v1/products/${item.product_id}`);
            productMap.set(item.product_id, productResponse.data);
          } catch (error) {
            // If product not found, create a placeholder
            productMap.set(item.product_id, {
              id: item.product_id,
              name: 'Unknown Product',
              sku: item.sku,
            });
          }
        }
      }
      setProducts(productMap);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustInventory = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowAdjustModal(true);
  };

  const handleUpdateItem = async (item: InventoryItem) => {
    // Simple update - just change reorder level
    const newReorderLevel = prompt(
      `Enter new reorder level for ${item.sku} (current: ${item.reorder_level}):`,
      item.reorder_level.toString()
    );

    if (newReorderLevel === null) return;

    try {
      await inventoryApi.put(`/api/v1/inventory/${item.id}`, {
        ...item,
        reorder_level: parseInt(newReorderLevel),
      });
      loadInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { bg: 'bg-green-100', text: 'text-green-800', label: 'In Stock' },
      low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Low Stock' },
      out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Out of Stock' },
      reserved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Reserved' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status,
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredInventory = inventory.filter((item) => {
    const product = products.get(item.product_id);
    const matchesSearch =
      !searchTerm ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-4 py-2 rounded ${
              showLowStockOnly
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showLowStockOnly ? 'Show All' : 'Low Stock Only'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold">{inventory.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-sm text-green-700">In Stock</div>
          <div className="text-2xl font-bold text-green-800">
            {inventory.filter((i) => i.status === 'in_stock').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="text-sm text-yellow-700">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-800">
            {inventory.filter((i) => i.status === 'low_stock').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-sm text-red-700">Out of Stock</div>
          <div className="text-2xl font-bold text-red-800">
            {inventory.filter((i) => i.status === 'out_of_stock').length}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No inventory items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInventory.map((item) => {
                  const product = products.get(item.product_id);
                  const needsReorder = item.available_quantity <= item.reorder_level;

                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${needsReorder ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                      <td className="px-4 py-3 text-sm">{product?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{item.location}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-600">
                        {item.reserved_quantity > 0 ? item.reserved_quantity : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        <span className={needsReorder ? 'text-red-600' : 'text-green-600'}>
                          {item.available_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{item.reorder_level}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => handleAdjustInventory(item)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => handleUpdateItem(item)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Settings
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustModal && selectedItem && (
        <AdjustmentModal
          item={selectedItem}
          product={products.get(selectedItem.product_id)}
          inventoryApi={inventoryApi}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedItem(null);
          }}
          onSave={() => {
            setShowAdjustModal(false);
            setSelectedItem(null);
            loadInventory();
          }}
        />
      )}
    </div>
  );
}

interface AdjustmentModalProps {
  item: InventoryItem;
  product?: Product;
  inventoryApi: any;
  onClose: () => void;
  onSave: () => void;
}

function AdjustmentModal({ item, product, inventoryApi, onClose, onSave }: AdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [adjustedBy, setAdjustedBy] = useState('admin');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reasonOptions = {
    add: [
      'Stock Received',
      'Return from Customer',
      'Inventory Count Correction',
      'Transfer from Another Location',
      'Other',
    ],
    remove: [
      'Damaged Goods',
      'Theft/Loss',
      'Inventory Count Correction',
      'Transfer to Another Location',
      'Sample/Demo Use',
      'Other',
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (!reason) {
      alert('Please select a reason');
      return;
    }

    setSaving(true);

    try {
      const adjustmentQuantity = adjustmentType === 'add' ? quantity : -quantity;

      await inventoryApi.post(`/api/v1/inventory/${item.id}/adjust`, {
        quantity: adjustmentQuantity,
        reason,
        adjusted_by: adjustedBy,
        notes,
      });

      onSave();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Failed to adjust inventory');
    } finally {
      setSaving(false);
    }
  };

  const newQuantity = adjustmentType === 'add'
    ? item.quantity + quantity
    : Math.max(0, item.quantity - quantity);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Adjust Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">
            {product?.name || 'Unknown Product'} - {item.sku}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Current Stock Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Current Stock</div>
                <div className="text-2xl font-bold">{item.quantity}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Reserved</div>
                <div className="text-2xl font-bold text-blue-600">{item.reserved_quantity}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Available</div>
                <div className="text-2xl font-bold text-green-600">{item.available_quantity}</div>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`px-4 py-3 rounded border-2 ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">+ Add Stock</div>
                <div className="text-xs">Increase inventory</div>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('remove')}
                className={`px-4 py-3 rounded border-2 ${
                  adjustmentType === 'remove'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">- Remove Stock</div>
                <div className="text-xs">Decrease inventory</div>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />
            {quantity > 0 && (
              <p className="text-sm mt-1">
                New stock level will be:{' '}
                <span className={`font-bold ${newQuantity < item.reorder_level ? 'text-red-600' : 'text-green-600'}`}>
                  {newQuantity}
                </span>
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason</option>
              {reasonOptions[adjustmentType].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Adjusted By */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Adjusted By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={adjustedBy}
              onChange={(e) => setAdjustedBy(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name or ID"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
