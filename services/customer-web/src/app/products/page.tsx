'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogService, Product } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 12;

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allProducts, selectedCategory, minPrice, maxPrice, sortBy, inStockOnly, searchTerm]);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(0);
  }, [selectedCategory, minPrice, maxPrice, sortBy, inStockOnly, searchTerm]);

  const loadCategories = async () => {
    try {
      const data = await catalogService.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Load more products to enable client-side filtering
      const data = await catalogService.getProducts(0, 100);
      setAllProducts(data.products || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProducts];

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    // Price range filter
    if (minPrice) {
      filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
    }

    // In stock filter
    if (inStockOnly) {
      filtered = filtered.filter(p => p.inventory_quantity > 0);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
        default:
          return 0; // Keep original order (newest from backend)
      }
    });

    // Pagination
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    setProducts(filtered.slice(startIndex, endIndex));
    setHasMore(endIndex < filtered.length);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setInStockOnly(false);
    setSearchTerm('');
    setPage(0);
  };

  const activeFiltersCount = [
    selectedCategory,
    minPrice,
    maxPrice,
    inStockOnly,
    searchTerm,
  ].filter(Boolean).length;

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading products...</div>
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
        <h1 className="text-3xl font-bold">Our Products</h1>
        <Link
          href="/search"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          🔍 Advanced Search
        </Link>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Filters</h2>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quick Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  min="0"
                  step="0.01"
                />
                <span className="py-2">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* In Stock Only */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">In Stock Only</span>
              </label>
            </div>

            {/* Sort By */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="mb-4 text-gray-600">
            Showing {products.length} of {allProducts.length} products
            {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold mb-4">No Products Found</h2>
              <p className="text-gray-600 mb-6">
                No products match your current filters
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
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
                      <h2 className="font-bold text-lg mb-2 truncate">{product.name}</h2>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-bold text-blue-600">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.inventory_quantity > 0 ? (
                          <span className="text-green-600 text-sm font-semibold">In Stock</span>
                        ) : (
                          <span className="text-red-600 text-sm font-semibold">Out of Stock</span>
                        )}
                      </div>
                      {product.brand && (
                        <p className="text-gray-500 text-xs">by {product.brand}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page + 1}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore}
                  className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
