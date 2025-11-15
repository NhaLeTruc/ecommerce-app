"""Search API routes"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
import structlog

from ...services.search_service import SearchService

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=dict)
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
):
    """Search products using OpenSearch"""
    logger.info("Searching products", query=q, category_id=category_id, skip=skip, limit=limit)

    try:
        search_service = SearchService()

        # Parse tags
        tags_list = None
        if tags:
            tags_list = [tag.strip() for tag in tags.split(',') if tag.strip()]

        # Execute search
        results, total = await search_service.search_products(
            query=q,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            tags=tags_list,
            skip=skip,
            limit=limit,
        )

        return {
            "items": results,
            "total": total,
            "skip": skip,
            "limit": limit,
            "query": q,
        }

    except Exception as e:
        logger.error("Search failed", query=q, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )


@router.get("/suggest", response_model=list[str])
async def get_suggestions(
    q: str = Query(..., min_length=1, description="Search prefix"),
    limit: int = Query(5, ge=1, le=20, description="Number of suggestions"),
):
    """Get product name suggestions based on prefix"""
    logger.info("Getting suggestions", prefix=q, limit=limit)

    try:
        search_service = SearchService()
        suggestions = await search_service.get_product_suggestions(prefix=q, limit=limit)

        return suggestions

    except Exception as e:
        logger.error("Failed to get suggestions", prefix=q, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get suggestions"
        )
