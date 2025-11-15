"""Payment Service - Main Application Entry Point"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database.connection import init_db, close_db
from .services.event_publisher import EventPublisher
from .api.routes import payment_routes
from .middleware.correlation import CorrelationIDMiddleware
from .middleware.logging import setup_logging

# Setup structured logging
setup_logging()
logger = structlog.get_logger()

# Event publisher instance
event_publisher = EventPublisher()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Payment Service", version="1.0.0", environment=settings.environment)

    # Initialize database
    await init_db()

    # Start Kafka producer
    await event_publisher.start()

    # Set event publisher in routes
    payment_routes.set_event_publisher(event_publisher)

    logger.info("Payment Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Payment Service")
    await event_publisher.stop()
    await close_db()
    logger.info("Payment Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Payment Service",
    description="Payment processing service for ecommerce platform",
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

# Include routers
app.include_router(payment_routes.router, prefix="/api/v1/payments", tags=["payments"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "payment-service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "payment-service",
        "version": "1.0.0",
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
