"""Search service for OpenSearch operations"""
from typing import Optional, Any
from opensearchpy import AsyncOpenSearch
import structlog

from ..models.product import Product
from ..infrastructure.search import get_opensearch_client

logger = structlog.get_logger(__name__)

PRODUCTS_INDEX = "products"

class SearchService:
    """Service for search operations using OpenSearch"""

    def __init__(self, client: Optional[AsyncOpenSearch] = None):
        self.client = client or get_opensearch_client()

    async def ensure_index(self) -> bool:
        """Ensure products index exists with proper mapping"""
        logger.info("Ensuring search index exists", index=PRODUCTS_INDEX)

        try:
            # Check if index exists
            exists = await self.client.indices.exists(index=PRODUCTS_INDEX)

            if not exists:
                # Create index with mapping
                mapping = {
                    "mappings": {
                        "properties": {
                            "id": {"type": "keyword"},
                            "sku": {"type": "keyword"},
                            "name": {
                                "type": "text",
                                "fields": {
                                    "keyword": {"type": "keyword"}
                                }
                            },
                            "slug": {"type": "keyword"},
                            "description": {"type": "text"},
                            "category_id": {"type": "keyword"},
                            "price": {"type": "float"},
                            "tags": {"type": "keyword"},
                            "brand": {"type": "keyword"},
                            "is_active": {"type": "boolean"},
                            "inventory_quantity": {"type": "integer"},
                            "created_at": {"type": "date"},
                            "updated_at": {"type": "date"},
                        }
                    },
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                    }
                }

                await self.client.indices.create(index=PRODUCTS_INDEX, body=mapping)
                logger.info("Search index created", index=PRODUCTS_INDEX)
            else:
                logger.debug("Search index already exists", index=PRODUCTS_INDEX)

            return True

        except Exception as e:
            logger.error("Failed to ensure index", error=str(e), index=PRODUCTS_INDEX)
            raise

    async def index_product(self, product: Product) -> bool:
        """Index a product in OpenSearch"""
        logger.debug("Indexing product", product_id=product.id, sku=product.sku)

        try:
            # Prepare document for indexing
            doc = {
                "id": product.id,
                "sku": product.sku,
                "name": product.name,
                "slug": product.slug,
                "description": product.description,
                "category_id": product.category_id,
                "price": product.price,
                "tags": product.tags,
                "brand": product.brand,
                "is_active": product.is_active,
                "inventory_quantity": product.inventory_quantity,
                "created_at": product.created_at.isoformat(),
                "updated_at": product.updated_at.isoformat(),
            }

            # Index document
            await self.client.index(
                index=PRODUCTS_INDEX,
                id=product.id,
                body=doc,
                refresh=True
            )

            logger.info("Product indexed", product_id=product.id)
            return True

        except Exception as e:
            logger.error("Failed to index product", product_id=product.id, error=str(e))
            return False

    async def delete_product(self, product_id: str) -> bool:
        """Remove a product from OpenSearch"""
        logger.debug("Deleting product from search index", product_id=product_id)

        try:
            await self.client.delete(
                index=PRODUCTS_INDEX,
                id=product_id,
                refresh=True
            )

            logger.info("Product deleted from index", product_id=product_id)
            return True

        except Exception as e:
            logger.error("Failed to delete product from index", product_id=product_id, error=str(e))
            return False

    async def search_products(
        self,
        query: str,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        tags: Optional[list[str]] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        """Search products with filters"""
        logger.debug("Searching products", query=query, category_id=category_id, skip=skip, limit=limit)

        try:
            # Build query
            must_clauses = [
                {"term": {"is_active": True}}
            ]

            # Add text search
            if query:
                must_clauses.append({
                    "multi_match": {
                        "query": query,
                        "fields": ["name^3", "description", "brand^2", "tags"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                })

            # Add filters
            filter_clauses = []

            if category_id:
                filter_clauses.append({"term": {"category_id": category_id}})

            if min_price is not None or max_price is not None:
                price_range: dict[str, Any] = {}
                if min_price is not None:
                    price_range["gte"] = min_price
                if max_price is not None:
                    price_range["lte"] = max_price
                filter_clauses.append({"range": {"price": price_range}})

            if tags:
                filter_clauses.append({"terms": {"tags": tags}})

            # Build full query
            search_body = {
                "query": {
                    "bool": {
                        "must": must_clauses,
                        "filter": filter_clauses
                    }
                },
                "from": skip,
                "size": limit,
                "sort": [
                    {"_score": {"order": "desc"}},
                    {"created_at": {"order": "desc"}}
                ]
            }

            # Execute search
            response = await self.client.search(
                index=PRODUCTS_INDEX,
                body=search_body
            )

            # Extract results
            hits = response["hits"]["hits"]
            total = response["hits"]["total"]["value"]

            results = [hit["_source"] for hit in hits]

            logger.info("Search completed", query=query, found=len(results), total=total)
            return results, total

        except Exception as e:
            logger.error("Search failed", query=query, error=str(e))
            raise

    async def get_product_suggestions(self, prefix: str, limit: int = 5) -> list[str]:
        """Get product name suggestions based on prefix"""
        logger.debug("Getting suggestions", prefix=prefix, limit=limit)

        try:
            search_body = {
                "query": {
                    "bool": {
                        "must": [
                            {"prefix": {"name": prefix.lower()}},
                            {"term": {"is_active": True}}
                        ]
                    }
                },
                "size": limit,
                "_source": ["name"]
            }

            response = await self.client.search(
                index=PRODUCTS_INDEX,
                body=search_body
            )

            suggestions = [hit["_source"]["name"] for hit in response["hits"]["hits"]]

            logger.info("Suggestions retrieved", prefix=prefix, count=len(suggestions))
            return suggestions

        except Exception as e:
            logger.error("Failed to get suggestions", prefix=prefix, error=str(e))
            return []
