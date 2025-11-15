"""Category API routes"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
import structlog

from ...models.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryTree
from ...services.category_service import CategoryService

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/", response_model=list[CategoryResponse])
async def list_categories(
    parent_id: Optional[str] = Query(None, description="Filter by parent category ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """List categories with optional filtering"""
    logger.info("Listing categories", parent_id=parent_id, is_active=is_active)

    try:
        category_service = CategoryService()
        categories = await category_service.list_categories(
            parent_id=parent_id,
            is_active=is_active,
        )

        # Convert to response models
        categories_response = [CategoryResponse(**c.model_dump()) for c in categories]

        return categories_response

    except Exception as e:
        logger.error("Failed to list categories", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list categories"
        )


@router.get("/tree", response_model=list[CategoryTree])
async def get_category_tree():
    """Get hierarchical category tree"""
    logger.info("Getting category tree")

    try:
        category_service = CategoryService()
        tree = await category_service.get_category_tree()

        return tree

    except Exception as e:
        logger.error("Failed to get category tree", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category tree"
        )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str):
    """Get category by ID"""
    logger.info("Getting category", category_id=category_id)

    try:
        category_service = CategoryService()
        category = await category_service.get_category(category_id)

        if not category:
            logger.warning("Category not found", category_id=category_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found"
            )

        return CategoryResponse(**category.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get category", category_id=category_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category"
        )


@router.get("/slug/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(slug: str):
    """Get category by slug"""
    logger.info("Getting category by slug", slug=slug)

    try:
        category_service = CategoryService()
        category = await category_service.get_category_by_slug(slug)

        if not category:
            logger.warning("Category not found", slug=slug)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with slug {slug} not found"
            )

        return CategoryResponse(**category.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get category by slug", slug=slug, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get category"
        )


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(category: CategoryCreate):
    """Create a new category"""
    logger.info("Creating category", name=category.name, slug=category.slug)

    try:
        category_service = CategoryService()
        created_category = await category_service.create_category(category)

        logger.info("Category created successfully", category_id=created_category.id)
        return CategoryResponse(**created_category.model_dump())

    except ValueError as e:
        logger.warning("Invalid category data", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Failed to create category", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, category_update: CategoryUpdate):
    """Update a category"""
    logger.info("Updating category", category_id=category_id)

    try:
        category_service = CategoryService()
        updated_category = await category_service.update_category(category_id, category_update)

        if not updated_category:
            logger.warning("Category not found for update", category_id=category_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found"
            )

        logger.info("Category updated successfully", category_id=category_id)
        return CategoryResponse(**updated_category.model_dump())

    except ValueError as e:
        logger.warning("Invalid category update", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update category", category_id=category_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str):
    """Delete a category (soft delete)"""
    logger.info("Deleting category", category_id=category_id)

    try:
        category_service = CategoryService()
        deleted = await category_service.delete_category(category_id)

        if not deleted:
            logger.warning("Category not found for deletion", category_id=category_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found"
            )

        logger.info("Category deleted successfully", category_id=category_id)
        return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)

    except ValueError as e:
        logger.warning("Cannot delete category", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete category", category_id=category_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )


@router.post("/{category_id}/update-count", status_code=status.HTTP_200_OK)
async def update_category_product_count(category_id: str):
    """Update product count for a category"""
    logger.info("Updating category product count", category_id=category_id)

    try:
        category_service = CategoryService()
        updated = await category_service.update_product_count(category_id)

        if not updated:
            logger.warning("Category not found", category_id=category_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found"
            )

        return {"message": "Product count updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update product count", category_id=category_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product count"
        )
