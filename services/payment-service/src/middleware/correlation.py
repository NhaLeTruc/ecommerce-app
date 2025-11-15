"""Correlation ID middleware for request tracing"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from uuid import uuid4


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add correlation ID to requests"""

    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or str(uuid4())

        # Add to request state
        request.state.correlation_id = correlation_id

        # Call next middleware/endpoint
        response = await call_next(request)

        # Add to response headers
        response.headers["X-Correlation-ID"] = correlation_id

        return response
