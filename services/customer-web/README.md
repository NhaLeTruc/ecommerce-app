# Customer Web

Customer-facing web application built with Next.js 14, React, and TypeScript.

## Features

- Server-side rendering (SSR) for optimal performance
- Product browsing and search
- Shopping cart management
- Responsive design with Tailwind CSS
- API integration with Catalog and Cart services
- Type-safe development with TypeScript

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

- `CATALOG_SERVICE_URL` - URL for Catalog Service (default: http://catalog-service:8000)
- `CART_SERVICE_URL` - URL for Cart Service (default: http://cart-service:3000)

## Architecture

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Axios**: HTTP client for API calls
- **SWR/React Query**: Data fetching and caching

## Pages

- `/` - Home page
- `/products` - Product listing
- `/products/[id]` - Product details
- `/search` - Product search
- `/cart` - Shopping cart

## API Integration

The app integrates with:
- Catalog Service for product data
- Cart Service for cart management
