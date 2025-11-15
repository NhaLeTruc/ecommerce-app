"""Product API routes"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
import structlog

from ...models.product import ProductCreate, ProductUpdate, ProductResponse
from ...services.product_service import ProductService
from ...services.search_service import SearchService
from ...infrastructure.events import (
    publish_product_created,
    publish_product_updated,
    publish_product_deleted,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=dict)
async def list_products(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """List products with pagination and filtering"""
    logger.info("Listing products", skip=skip, limit=limit, category_id=category_id)

    try:
        product_service = ProductService()
        products, total = await product_service.list_products(
            skip=skip,
            limit=limit,
            category_id=category_id,
            is_active=is_active,
        )

        # Convert to response models
        products_response = [ProductResponse(**p.model_dump()) for p in products]

        return {
            "items": products_response,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    except Exception as e:
        logger.error("Failed to list products", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list products"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Get product by ID"""
    logger.info("Getting product", product_id=product_id)

    try:
        product_service = ProductService()
        product = await product_service.get_product(product_id)

        if not product:
            logger.warning("Product not found", product_id=product_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        return ProductResponse(**product.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get product", product_id=product_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product"
        )


@router.get("/sku/{sku}", response_model=ProductResponse)
async def get_product_by_sku(sku: str):
    """Get product by SKU"""
    logger.info("Getting product by SKU", sku=sku)

    try:
        product_service = ProductService()
        product = await product_service.get_product_by_sku(sku)

        if not product:
            logger.warning("Product not found", sku=sku)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with SKU {sku} not found"
            )

        return ProductResponse(**product.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get product by SKU", sku=sku, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product"
        )


@router.get("/slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(slug: str):
    """Get product by slug"""
    logger.info("Getting product by slug", slug=slug)

    try:
        product_service = ProductService()
        product = await product_service.get_product_by_slug(slug)

        if not product:
            logger.warning("Product not found", slug=slug)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with slug {slug} not found"
            )

        return ProductResponse(**product.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get product by slug", slug=slug, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get product"
        )


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate):
    """Create a new product"""
    logger.info("Creating product", sku=product.sku, name=product.name)

    try:
        product_service = ProductService()
        search_service = SearchService()

        # Create product in database
        created_product = await product_service.create_product(product)

        # Index in search
        await search_service.index_product(created_product)

        # Publish event
        await publish_product_created(
            created_product.id,
            created_product.model_dump(mode='json')
        )

        logger.info("Product created successfully", product_id=created_product.id)
        return ProductResponse(**created_product.model_dump())

    except ValueError as e:
        logger.warning("Invalid product data", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to create product", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductUpdate):
    """Update a product"""
    logger.info("Updating product", product_id=product_id)

    try:
        product_service = ProductService()
        search_service = SearchService()

        # Update product in database
        updated_product = await product_service.update_product(product_id, product_update)

        if not updated_product:
            logger.warning("Product not found for update", product_id=product_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        # Update in search index
        await search_service.index_product(updated_product)

        # Publish event
        await publish_product_updated(
            updated_product.id,
            updated_product.model_dump(mode='json')
        )

        logger.info("Product updated successfully", product_id=product_id)
        return ProductResponse(**updated_product.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update product", product_id=product_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str):
    """Delete a product (soft delete)"""
    logger.info("Deleting product", product_id=product_id)

    try:
        product_service = ProductService()
        search_service = SearchService()

        # Get product before deletion
        product = await product_service.get_product(product_id)
        if not product:
            logger.warning("Product not found for deletion", product_id=product_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        # Soft delete in database
        deleted = await product_service.delete_product(product_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        # Remove from search index
        await search_service.delete_product(product_id)

        # Publish event
        await publish_product_deleted(
            product_id,
            {"id": product_id, "deleted_at": str(product.updated_at)}
        )

        logger.info("Product deleted successfully", product_id=product_id)
        return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete product", product_id=product_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )
