# Catalog Service

Product catalog and search service built with Python, FastAPI, MongoDB, and OpenSearch.

## Features

- Product CRUD operations
- Category management
- Full-text search with OpenSearch
- Product recommendations
- Real-time inventory sync via Kafka events

## Development

```bash
# Install dependencies
poetry install

# Run service
poetry run python -m src.main

# Run tests
poetry run pytest

# Run with coverage
poetry run pytest --cov
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/products` - List products
- `GET /api/v1/products/{id}` - Get product
- `POST /api/v1/products` - Create product
- `GET /api/v1/search` - Search products
- `GET /api/v1/categories` - List categories
