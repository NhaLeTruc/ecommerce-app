"""Configuration for Catalog Service"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Application
    service_name: str = "catalog-service"
    environment: str = "development"
    port: int = 5001
    log_level: str = "INFO"

    # MongoDB
    mongodb_uri: str = "mongodb://ecommerce:dev_password@mongodb:27017/catalog?authSource=admin"
    mongodb_database: str = "catalog"
    mongodb_max_pool_size: int = 50
    mongodb_min_pool_size: int = 10

    # OpenSearch
    opensearch_url: str = "http://opensearch:9200"
    opensearch_index_prefix: str = "products"
    opensearch_username: str = "admin"
    opensearch_password: str = "admin"

    # Redis
    redis_url: str = "redis://:dev_password@redis:6379/0"
    cache_ttl_seconds: int = 3600

    # Kafka
    kafka_brokers: str = "kafka:9092"
    kafka_topic_product_events: str = "product-events"
    kafka_group_id: str = "catalog-service"

    # OpenTelemetry
    otlp_endpoint: str = "http://otel-collector:4317"

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
