import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ecommerce Platform',
  description: 'Shop the best products',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-blue-600 text-white p-4">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Ecommerce Platform</h1>
            <nav className="mt-2">
              <a href="/" className="mr-4 hover:underline">Home</a>
              <a href="/products" className="mr-4 hover:underline">Products</a>
              <a href="/cart" className="mr-4 hover:underline">Cart</a>
              <a href="/orders" className="hover:underline">My Orders</a>
            </nav>
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
      </body>
    </html>
  )
}
