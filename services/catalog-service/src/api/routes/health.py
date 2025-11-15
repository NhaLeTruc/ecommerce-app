"""Health check endpoints for catalog service"""
from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime

from ..infrastructure.database import get_database
from ..infrastructure.search import get_opensearch_client

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    timestamp: datetime
    checks: dict


@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness():
    """Liveness probe - is the service running?"""
    return {
        "status": "ok",
        "service": "catalog-service",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ready", response_model=HealthResponse)
async def readiness():
    """Readiness probe - is the service ready to accept traffic?"""
    checks = {}

    # Check MongoDB
    try:
        db = get_database()
        await db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = f"failed: {str(e)}"

    # Check OpenSearch
    try:
        es = get_opensearch_client()
        await es.ping()
        checks["opensearch"] = "ok"
    except Exception as e:
        checks["opensearch"] = f"failed: {str(e)}"

    # Determine overall status
    all_ok = all(v == "ok" for v in checks.values())

    return HealthResponse(
        status="ready" if all_ok else "not_ready",
        service="catalog-service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        checks=checks,
    )


@router.get("/", response_model=HealthResponse)
async def health():
    """Aggregated health check"""
    return await readiness()
