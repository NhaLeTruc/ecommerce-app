/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://catalog-service:8000',
    CART_SERVICE_URL: process.env.CART_SERVICE_URL || 'http://cart-service:3000',
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
