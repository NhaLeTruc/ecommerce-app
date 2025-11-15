import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <nav className="flex gap-4">
              <Link href="/admin" className="hover:text-blue-400 transition-colors">
                Overview
              </Link>
              <Link href="/admin/orders" className="hover:text-blue-400 transition-colors">
                Orders
              </Link>
              <Link href="/admin/products" className="hover:text-blue-400 transition-colors">
                Products
              </Link>
              <Link href="/admin/inventory" className="hover:text-blue-400 transition-colors">
                Inventory
              </Link>
            </nav>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Store
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
