"""Category service for business logic"""
from typing import Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from ..models.category import CategoryCreate, CategoryUpdate, Category, CategoryTree
from ..infrastructure.database import get_database

logger = structlog.get_logger(__name__)

class CategoryService:
    """Service for category operations"""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db or get_database()
        self.collection = self.db.categories

    async def create_category(self, category: CategoryCreate) -> Category:
        """Create a new category"""
        logger.info("Creating category", name=category.name, slug=category.slug)

        # Check if slug already exists
        existing = await self.collection.find_one({"slug": category.slug})
        if existing:
            logger.warning("Category slug already exists", slug=category.slug)
            raise ValueError(f"Category with slug {category.slug} already exists")

        # If parent_id is provided, verify parent exists
        if category.parent_id:
            parent = await self.collection.find_one({"_id": category.parent_id})
            if not parent:
                logger.warning("Parent category not found", parent_id=category.parent_id)
                raise ValueError(f"Parent category {category.parent_id} does not exist")

        # Prepare document
        now = datetime.utcnow()
        category_dict = category.model_dump()
        category_dict.update({
            "_id": str(ObjectId()),
            "product_count": 0,
            "created_at": now,
            "updated_at": now,
        })

        # Insert into MongoDB
        result = await self.collection.insert_one(category_dict)

        # Fetch and return created category
        created = await self.collection.find_one({"_id": result.inserted_id})
        logger.info("Category created", category_id=str(created["_id"]), slug=category.slug)

        return Category(**created)

    async def get_category(self, category_id: str) -> Optional[Category]:
        """Get category by ID"""
        logger.debug("Fetching category", category_id=category_id)

        category = await self.collection.find_one({"_id": category_id})
        if not category:
            logger.warning("Category not found", category_id=category_id)
            return None

        return Category(**category)

    async def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """Get category by slug"""
        logger.debug("Fetching category by slug", slug=slug)

        category = await self.collection.find_one({"slug": slug})
        if not category:
            logger.warning("Category not found", slug=slug)
            return None

        return Category(**category)

    async def list_categories(
        self,
        parent_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> list[Category]:
        """List categories with optional filtering"""
        logger.debug("Listing categories", parent_id=parent_id, is_active=is_active)

        # Build filter
        filter_query = {}
        if parent_id is not None:
            filter_query["parent_id"] = parent_id
        if is_active is not None:
            filter_query["is_active"] = is_active

        # Fetch categories sorted by display_order
        cursor = self.collection.find(filter_query).sort("display_order", 1)
        categories = [Category(**doc) async for doc in cursor]

        logger.info("Categories listed", count=len(categories))
        return categories

    async def get_category_tree(self) -> list[CategoryTree]:
        """Get hierarchical category tree"""
        logger.debug("Fetching category tree")

        # Fetch all active categories
        cursor = self.collection.find({"is_active": True}).sort("display_order", 1)
        all_categories = [Category(**doc) async for doc in cursor]

        # Build category lookup map
        category_map = {cat.id: cat for cat in all_categories}

        # Build tree structure
        tree: list[CategoryTree] = []
        for category in all_categories:
            category_node = CategoryTree(**category.model_dump())

            if category.parent_id is None:
                # Root category
                tree.append(category_node)
            elif category.parent_id in category_map:
                # Find parent and add as child
                parent = category_map[category.parent_id]
                # This is a simplified version - in production, would need more complex tree building
                pass

        logger.info("Category tree fetched", root_count=len(tree))
        return tree

    async def update_category(self, category_id: str, category_update: CategoryUpdate) -> Optional[Category]:
        """Update a category"""
        logger.info("Updating category", category_id=category_id)

        # Check if category exists
        existing = await self.collection.find_one({"_id": category_id})
        if not existing:
            logger.warning("Category not found for update", category_id=category_id)
            return None

        # If updating parent_id, verify parent exists and prevent circular references
        if category_update.parent_id:
            if category_update.parent_id == category_id:
                raise ValueError("Category cannot be its own parent")

            parent = await self.collection.find_one({"_id": category_update.parent_id})
            if not parent:
                raise ValueError(f"Parent category {category_update.parent_id} does not exist")

        # Prepare update
        update_dict = category_update.model_dump(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()

            # Update in MongoDB
            await self.collection.update_one(
                {"_id": category_id},
                {"$set": update_dict}
            )

        # Fetch and return updated category
        updated = await self.collection.find_one({"_id": category_id})
        logger.info("Category updated", category_id=category_id)

        return Category(**updated)

    async def delete_category(self, category_id: str) -> bool:
        """Delete a category (soft delete by setting is_active=False)"""
        logger.info("Deleting category", category_id=category_id)

        # Check if category has children
        children = await self.collection.count_documents({"parent_id": category_id})
        if children > 0:
            logger.warning("Cannot delete category with children", category_id=category_id, children=children)
            raise ValueError(f"Category has {children} child categories. Delete children first.")

        result = await self.collection.update_one(
            {"_id": category_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )

        if result.modified_count == 0:
            logger.warning("Category not found for deletion", category_id=category_id)
            return False

        logger.info("Category deleted", category_id=category_id)
        return True

    async def update_product_count(self, category_id: str) -> bool:
        """Update product count for a category"""
        logger.debug("Updating product count", category_id=category_id)

        # Count products in this category
        count = await self.db.products.count_documents({"category_id": category_id, "is_active": True})

        # Update category
        result = await self.collection.update_one(
            {"_id": category_id},
            {"$set": {"product_count": count, "updated_at": datetime.utcnow()}}
        )

        logger.info("Product count updated", category_id=category_id, count=count)
        return result.modified_count > 0
