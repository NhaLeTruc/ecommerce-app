"""Kafka event producer for product events"""
import json
from typing import Optional, Any
from aiokafka import AIOKafkaProducer
import structlog

from ..config import settings

logger = structlog.get_logger(__name__)

_producer: Optional[AIOKafkaProducer] = None

PRODUCT_EVENTS_TOPIC = "product-events"

async def init_kafka_producer():
    """Initialize Kafka producer"""
    global _producer
    logger.info("Initializing Kafka producer", brokers=settings.kafka_brokers)

    try:
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers.split(','),
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
        )
        await _producer.start()
        logger.info("Kafka producer initialized")

    except Exception as e:
        logger.error("Failed to initialize Kafka producer", error=str(e))
        raise

async def close_kafka_producer():
    """Close Kafka producer"""
    global _producer
    if _producer:
        logger.info("Closing Kafka producer")
        await _producer.stop()
        _producer = None

def get_kafka_producer() -> AIOKafkaProducer:
    """Get Kafka producer instance"""
    if _producer is None:
        raise RuntimeError("Kafka producer not initialized")
    return _producer

async def publish_product_event(event_type: str, product_id: str, data: dict[str, Any]) -> bool:
    """Publish a product event to Kafka"""
    logger.debug("Publishing product event", event_type=event_type, product_id=product_id)

    try:
        producer = get_kafka_producer()

        event = {
            "event_type": event_type,
            "product_id": product_id,
            "data": data,
            "timestamp": data.get("updated_at") or data.get("created_at"),
        }

        # Send event with product_id as key for partitioning
        await producer.send(
            topic=PRODUCT_EVENTS_TOPIC,
            key=product_id,
            value=event
        )

        logger.info("Product event published", event_type=event_type, product_id=product_id)
        return True

    except Exception as e:
        logger.error("Failed to publish product event", event_type=event_type, product_id=product_id, error=str(e))
        return False

async def publish_product_created(product_id: str, product_data: dict[str, Any]) -> bool:
    """Publish product created event"""
    return await publish_product_event("product.created", product_id, product_data)

async def publish_product_updated(product_id: str, product_data: dict[str, Any]) -> bool:
    """Publish product updated event"""
    return await publish_product_event("product.updated", product_id, product_data)

async def publish_product_deleted(product_id: str, product_data: dict[str, Any]) -> bool:
    """Publish product deleted event"""
    return await publish_product_event("product.deleted", product_id, product_data)

async def publish_inventory_updated(product_id: str, inventory_data: dict[str, Any]) -> bool:
    """Publish inventory updated event"""
    return await publish_product_event("product.inventory_updated", product_id, inventory_data)
