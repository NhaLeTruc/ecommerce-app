export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to Our Store</h1>
      <p className="text-lg mb-4">
        Discover amazing products at great prices.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Browse Products</h2>
          <p className="text-gray-600 mb-4">
            Explore our wide selection of products.
          </p>
          <a href="/products" className="text-blue-600 hover:underline">
            View Products →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Search</h2>
          <p className="text-gray-600 mb-4">
            Find exactly what you're looking for.
          </p>
          <a href="/search" className="text-blue-600 hover:underline">
            Search →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Your Cart</h2>
          <p className="text-gray-600 mb-4">
            View and manage your shopping cart.
          </p>
          <a href="/cart" className="text-blue-600 hover:underline">
            Go to Cart →
          </a>
        </div>
      </div>
    </div>
  )
}
