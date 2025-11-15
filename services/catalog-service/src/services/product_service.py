"""Product service for business logic"""
from typing import Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from ..models.product import ProductCreate, ProductUpdate, Product
from ..infrastructure.database import get_database

logger = structlog.get_logger(__name__)

class ProductService:
    """Service for product operations"""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db or get_database()
        self.collection = self.db.products

    async def create_product(self, product: ProductCreate) -> Product:
        """Create a new product"""
        logger.info("Creating product", sku=product.sku, name=product.name)

        # Check if SKU already exists
        existing = await self.collection.find_one({"sku": product.sku})
        if existing:
            logger.warning("Product SKU already exists", sku=product.sku)
            raise ValueError(f"Product with SKU {product.sku} already exists")

        # Prepare document
        now = datetime.utcnow()
        product_dict = product.model_dump()
        product_dict.update({
            "_id": str(ObjectId()),
            "created_at": now,
            "updated_at": now,
        })

        # Insert into MongoDB
        result = await self.collection.insert_one(product_dict)

        # Fetch and return created product
        created = await self.collection.find_one({"_id": result.inserted_id})
        logger.info("Product created", product_id=str(created["_id"]), sku=product.sku)

        return Product(**created)

    async def get_product(self, product_id: str) -> Optional[Product]:
        """Get product by ID"""
        logger.debug("Fetching product", product_id=product_id)

        product = await self.collection.find_one({"_id": product_id})
        if not product:
            logger.warning("Product not found", product_id=product_id)
            return None

        return Product(**product)

    async def get_product_by_sku(self, sku: str) -> Optional[Product]:
        """Get product by SKU"""
        logger.debug("Fetching product by SKU", sku=sku)

        product = await self.collection.find_one({"sku": sku})
        if not product:
            logger.warning("Product not found", sku=sku)
            return None

        return Product(**product)

    async def get_product_by_slug(self, slug: str) -> Optional[Product]:
        """Get product by slug"""
        logger.debug("Fetching product by slug", slug=slug)

        product = await self.collection.find_one({"slug": slug})
        if not product:
            logger.warning("Product not found", slug=slug)
            return None

        return Product(**product)

    async def list_products(
        self,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[list[Product], int]:
        """List products with pagination and filtering"""
        logger.debug("Listing products", skip=skip, limit=limit, category_id=category_id)

        # Build filter
        filter_query = {}
        if category_id:
            filter_query["category_id"] = category_id
        if is_active is not None:
            filter_query["is_active"] = is_active

        # Get total count
        total = await self.collection.count_documents(filter_query)

        # Fetch products
        cursor = self.collection.find(filter_query).skip(skip).limit(limit)
        products = [Product(**doc) async for doc in cursor]

        logger.info("Products listed", count=len(products), total=total)
        return products, total

    async def update_product(self, product_id: str, product_update: ProductUpdate) -> Optional[Product]:
        """Update a product"""
        logger.info("Updating product", product_id=product_id)

        # Check if product exists
        existing = await self.collection.find_one({"_id": product_id})
        if not existing:
            logger.warning("Product not found for update", product_id=product_id)
            return None

        # Prepare update
        update_dict = product_update.model_dump(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()

            # Update in MongoDB
            await self.collection.update_one(
                {"_id": product_id},
                {"$set": update_dict}
            )

        # Fetch and return updated product
        updated = await self.collection.find_one({"_id": product_id})
        logger.info("Product updated", product_id=product_id)

        return Product(**updated)

    async def delete_product(self, product_id: str) -> bool:
        """Delete a product (soft delete by setting is_active=False)"""
        logger.info("Deleting product", product_id=product_id)

        result = await self.collection.update_one(
            {"_id": product_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )

        if result.modified_count == 0:
            logger.warning("Product not found for deletion", product_id=product_id)
            return False

        logger.info("Product deleted", product_id=product_id)
        return True

    async def update_inventory(self, product_id: str, quantity: int, reserved_quantity: int = 0) -> bool:
        """Update product inventory counts"""
        logger.info("Updating inventory", product_id=product_id, quantity=quantity, reserved=reserved_quantity)

        result = await self.collection.update_one(
            {"_id": product_id},
            {
                "$set": {
                    "inventory_quantity": quantity,
                    "reserved_quantity": reserved_quantity,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count == 0:
            logger.warning("Failed to update inventory", product_id=product_id)
            return False

        logger.info("Inventory updated", product_id=product_id)
        return True

    async def get_products_by_ids(self, product_ids: list[str]) -> list[Product]:
        """Get multiple products by IDs"""
        logger.debug("Fetching products by IDs", count=len(product_ids))

        cursor = self.collection.find({"_id": {"$in": product_ids}})
        products = [Product(**doc) async for doc in cursor]

        logger.info("Products fetched", requested=len(product_ids), found=len(products))
        return products
