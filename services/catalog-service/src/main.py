"""Catalog Service - Main Application Entry Point"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager

from .config import settings
from .infrastructure.database import init_database, close_database
from .infrastructure.search import init_opensearch, close_opensearch
from .infrastructure.events import init_kafka_producer, close_kafka_producer
from .middleware.correlation import CorrelationIDMiddleware
from .middleware.logging import setup_logging
from .middleware.telemetry import init_telemetry, instrument_fastapi
from .middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)
from .api.routes import products, categories, search, health
from .services.search_service import SearchService

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Initialize telemetry
init_telemetry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Catalog Service", version="1.0.0", environment=settings.environment)

    # Initialize database connections
    await init_database()
    await init_opensearch()
    await init_kafka_producer()

    # Ensure search index exists
    search_service = SearchService()
    await search_service.ensure_index()

    logger.info("Catalog Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Catalog Service")
    await close_kafka_producer()
    await close_database()
    await close_opensearch()
    logger.info("Catalog Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Catalog Service",
    description="Product catalog and search service for ecommerce platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Correlation ID middleware
app.add_middleware(CorrelationIDMiddleware)

# Exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Instrument FastAPI with OpenTelemetry
instrument_fastapi(app)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "catalog-service",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_config=None,  # Use structlog instead
    )
