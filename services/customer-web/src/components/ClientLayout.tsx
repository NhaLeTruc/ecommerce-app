'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Ecommerce Platform</h1>
              <nav className="mt-2 flex items-center gap-4">
                <a href="/" className="hover:underline">Home</a>
                <a href="/products" className="hover:underline">Products</a>
                <a href="/cart" className="hover:underline">Cart</a>
              </nav>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-200 p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600">
          © 2024 Ecommerce Platform
        </div>
      </footer>
    </AuthProvider>
  );
}
