'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { catalogService, Product } from '@/lib/api';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 12;

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, page]);

  const performSearch = async () => {
    if (!query) return;

    try {
      setLoading(true);
      const data = await catalogService.searchProducts(query, page * limit, limit);

      if (data.results) {
        setResults(data.results);
        setTotalResults(data.total || data.results.length);
        setHasMore(data.results.length === limit);
      } else if (data.products) {
        // Fallback if search returns products array
        setResults(data.products);
        setTotalResults(data.total || data.products.length);
        setHasMore(data.products.length === limit);
      } else {
        setResults([]);
        setTotalResults(0);
        setHasMore(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setPage(0);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setTotalResults(0);
    router.push('/search');
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Search Results Header */}
      {query && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Search Results for "{query}"
          </h1>
          {!loading && (
            <p className="text-gray-600">
              {totalResults} {totalResults === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && results.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="text-xl text-gray-600">Searching...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* No Results */}
      {!loading && query && results.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-4">No Results Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any products matching "{query}"
          </p>
          <div className="space-y-2 text-gray-600">
            <p>Try:</p>
            <ul className="list-disc list-inside">
              <li>Checking your spelling</li>
              <li>Using more general keywords</li>
              <li>Using different keywords</li>
            </ul>
          </div>
          <Link
            href="/products"
            className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Browse All Products
          </Link>
        </div>
      )}

      {/* No Query State */}
      {!query && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-4">Search Our Products</h2>
          <p className="text-gray-600 mb-6">
            Enter a search term above to find products
          </p>
          <div className="space-y-2 text-gray-600">
            <p>Popular searches:</p>
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              {['laptop', 'mouse', 'keyboard', 'monitor', 'headphones'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    router.push(`/search?q=${term}`);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!loading && results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {results.map((product) => (
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
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.inventory_quantity > 0 ? (
                      <span className="text-green-600 text-sm">In Stock</span>
                    ) : (
                      <span className="text-red-600 text-sm">Out of Stock</span>
                    )}
                  </div>
                  {product.brand && (
                    <p className="text-gray-500 text-xs mt-2">by {product.brand}</p>
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

      {/* Search Tips */}
      {query && results.length > 0 && (
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-2">💡 Search Tips</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Use specific product names for better results</li>
            <li>Try searching by brand, category, or feature</li>
            <li>Use quotes for exact phrases (e.g., "wireless mouse")</li>
          </ul>
        </div>
      )}
    </div>
  );
}
