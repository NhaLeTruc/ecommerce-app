"""Kafka event publisher for payment events"""
from aiokafka import AIOKafkaProducer
import json
from datetime import datetime
import structlog

from ..config import settings
from ..models.payment import Payment

logger = structlog.get_logger(__name__)


class EventPublisher:
    def __init__(self):
        self.producer: AIOKafkaProducer = None
        self.topic = settings.kafka_topic

    async def start(self):
        """Start Kafka producer"""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
        )
        await self.producer.start()
        logger.info("Kafka producer started")

    async def stop(self):
        """Stop Kafka producer"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka producer stopped")

    async def _publish_event(self, event_type: str, payment_id: str, data: dict):
        """Publish event to Kafka"""
        try:
            event = {
                "event_type": event_type,
                "payment_id": payment_id,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data,
            }

            await self.producer.send(
                topic=self.topic,
                key=payment_id,
                value=event,
            )

            logger.debug("Event published", event_type=event_type, payment_id=payment_id)

        except Exception as e:
            logger.error("Failed to publish event", event_type=event_type, error=str(e))

    async def publish_payment_successful(self, payment: Payment):
        """Publish payment successful event"""
        await self._publish_event(
            "payment.successful",
            payment.id,
            {
                "order_id": payment.order_id,
                "amount": payment.amount,
                "currency": payment.currency.value,
                "payment_method": payment.payment_method.value,
                "transaction_id": payment.transaction_id,
                "payment_intent_id": payment.payment_intent_id,
            },
        )

    async def publish_payment_failed(self, payment: Payment, error_message: str):
        """Publish payment failed event"""
        await self._publish_event(
            "payment.failed",
            payment.id,
            {
                "order_id": payment.order_id,
                "amount": payment.amount,
                "currency": payment.currency.value,
                "payment_method": payment.payment_method.value,
                "error": error_message,
            },
        )

    async def publish_payment_refunded(self, payment: Payment, refund_id: str, amount: float):
        """Publish payment refunded event"""
        await self._publish_event(
            "payment.refunded",
            payment.id,
            {
                "order_id": payment.order_id,
                "refund_id": refund_id,
                "amount": amount,
                "original_amount": payment.amount,
                "currency": payment.currency.value,
            },
        )
