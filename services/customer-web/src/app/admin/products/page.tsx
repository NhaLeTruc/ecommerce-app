'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  brand?: string;
  images: string[];
  tags: string[];
  in_stock: boolean;
  rating?: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState<boolean | null>(null);

  const catalogApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || 'http://localhost:8000',
    timeout: 10000,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, filterCategory, filterStock]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: page * limit,
        limit,
      };
      if (filterCategory) params.category_id = filterCategory;
      if (filterStock !== null) params.is_active = filterStock;

      const response = await catalogApi.get('/api/v1/products', { params });
      setProducts(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await catalogApi.get('/api/v1/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await catalogApi.delete(`/api/v1/products/${productId}`);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / limit);
  const filteredProducts = searchTerm
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock Status</label>
            <select
              value={filterStock === null ? '' : filterStock ? 'true' : 'false'}
              onChange={(e) =>
                setFilterStock(e.target.value === '' ? null : e.target.value === 'true')
              }
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterStock(null);
                setPage(0);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No products found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{product.sku}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.brand && (
                          <div className="text-xs text-gray-500">{product.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{product.category}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                            product.in_stock
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.rating ? (
                          <div>
                            <span className="text-yellow-500">★</span> {product.rating.toFixed(1)}
                            <span className="text-gray-400 text-xs ml-1">
                              ({product.review_count})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
              <div className="text-sm text-gray-700">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} products
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          catalogApi={catalogApi}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  catalogApi: any;
  onClose: () => void;
  onSave: () => void;
}

function ProductFormModal({ product, categories, catalogApi, onClose, onSave }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price: product?.price || 0,
    currency: product?.currency || 'USD',
    category: product?.category || '',
    brand: product?.brand || '',
    images: product?.images.join(', ') || '',
    tags: product?.tags.join(', ') || '',
    in_stock: product?.in_stock ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price.toString()),
        images: formData.images.split(',').map((s) => s.trim()).filter((s) => s),
        tags: formData.tags.split(',').map((s) => s.trim()).filter((s) => s),
        specifications: null,
        rating: product?.rating || null,
        review_count: product?.review_count || 0,
      };

      if (product) {
        // Update existing product
        await catalogApi.put(`/api/v1/products/${product.id}`, payload);
      } else {
        // Create new product
        await catalogApi.post('/api/v1/products', payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Status</label>
              <select
                value={formData.in_stock ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, in_stock: e.target.value === 'true' })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Image URLs (comma-separated)
              </label>
              <textarea
                rows={2}
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="electronics, laptops, gaming"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
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
