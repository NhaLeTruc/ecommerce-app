"""Configuration settings"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Server
    port: int = 8001
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://ecommerce:dev_password@postgres:5432/ecommerce"

    # Kafka
    kafka_brokers: str = "kafka:9092"
    kafka_topic: str = "payment-events"

    # OpenTelemetry
    otlp_endpoint: str = "otel-collector:4317"

    # CORS
    cors_origins: List[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def kafka_brokers_list(self) -> List[str]:
        return self.kafka_brokers.split(",")


settings = Settings()
