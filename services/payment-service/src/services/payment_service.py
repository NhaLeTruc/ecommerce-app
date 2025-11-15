"""Payment service business logic"""
from typing import Optional
from datetime import datetime
import structlog

from ..models.payment import (
    Payment,
    PaymentStatus,
    ProcessPaymentRequest,
    PaymentResponse,
    RefundRequest,
    RefundResponse,
)
from ..database.repository import PaymentRepository
from .payment_processor import PaymentProcessor
from .event_publisher import EventPublisher

logger = structlog.get_logger(__name__)


class PaymentService:
    def __init__(
        self,
        repository: PaymentRepository,
        processor: PaymentProcessor,
        event_publisher: EventPublisher,
    ):
        self.repository = repository
        self.processor = processor
        self.event_publisher = event_publisher

    async def process_payment(self, request: ProcessPaymentRequest) -> PaymentResponse:
        """Process a payment for an order"""
        logger.info("Processing payment request", order_id=request.order_id, amount=request.amount)

        # Create payment record
        payment = await self.repository.create_payment(
            order_id=request.order_id,
            amount=request.amount,
            currency=request.currency,
            payment_method=request.payment_method,
        )

        try:
            # Update status to processing
            await self.repository.update_status(payment.id, PaymentStatus.PROCESSING)

            # Process payment with payment gateway
            result = await self.processor.process_payment(
                amount=request.amount,
                payment_method=request.payment_method,
                payment_details=request.payment_method_details or {},
            )

            if result["success"]:
                # Payment successful - update record
                payment = await self.repository.update_payment_success(
                    payment_id=payment.id,
                    transaction_id=result["transaction_id"],
                    payment_intent_id=result["payment_intent_id"],
                    provider_response=result,
                )

                # Publish success event
                await self.event_publisher.publish_payment_successful(payment)

                logger.info(
                    "Payment processed successfully",
                    payment_id=payment.id,
                    transaction_id=result["transaction_id"],
                )

                return PaymentResponse(
                    success=True,
                    transaction_id=result["transaction_id"],
                    payment_intent_id=result["payment_intent_id"],
                    status=PaymentStatus.CAPTURED,
                )
            else:
                # Payment failed - update record
                error_message = result.get("error_message", "Payment processing failed")

                payment = await self.repository.update_payment_failure(
                    payment_id=payment.id,
                    error_message=error_message,
                    provider_response=result,
                )

                # Publish failure event
                await self.event_publisher.publish_payment_failed(payment, error_message)

                logger.warning(
                    "Payment processing failed",
                    payment_id=payment.id,
                    error=error_message,
                )

                return PaymentResponse(
                    success=False,
                    status=PaymentStatus.FAILED,
                    error=error_message,
                )

        except Exception as e:
            logger.error("Payment processing error", payment_id=payment.id, error=str(e))

            # Update payment as failed
            await self.repository.update_payment_failure(
                payment_id=payment.id,
                error_message=str(e),
            )

            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error=f"Payment processing error: {str(e)}",
            )

    async def refund_payment(self, request: RefundRequest) -> RefundResponse:
        """Refund a payment"""
        logger.info(
            "Processing refund request",
            transaction_id=request.transaction_id,
            amount=request.amount,
        )

        # Find payment by transaction ID
        payment = await self.repository.get_by_transaction_id(request.transaction_id)

        if not payment:
            logger.warning("Payment not found for refund", transaction_id=request.transaction_id)
            return RefundResponse(
                success=False,
                amount=request.amount,
                error="Payment not found",
            )

        # Verify payment can be refunded
        if payment.status not in [PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED]:
            logger.warning(
                "Payment cannot be refunded",
                payment_id=payment.id,
                status=payment.status,
            )
            return RefundResponse(
                success=False,
                amount=request.amount,
                error=f"Payment in status {payment.status} cannot be refunded",
            )

        try:
            # Process refund with payment gateway
            result = await self.processor.refund_payment(
                transaction_id=request.transaction_id,
                amount=request.amount,
                reason=request.reason,
            )

            if result["success"]:
                # Update payment record
                if request.amount >= payment.amount:
                    new_status = PaymentStatus.REFUNDED
                else:
                    new_status = PaymentStatus.PARTIALLY_REFUNDED

                await self.repository.update_status(payment.id, new_status)
                await self.repository.add_refund_record(
                    payment_id=payment.id,
                    refund_id=result["refund_id"],
                    amount=request.amount,
                    reason=request.reason,
                )

                # Publish refund event
                await self.event_publisher.publish_payment_refunded(
                    payment, result["refund_id"], request.amount
                )

                logger.info(
                    "Refund processed successfully",
                    payment_id=payment.id,
                    refund_id=result["refund_id"],
                )

                return RefundResponse(
                    success=True,
                    refund_id=result["refund_id"],
                    amount=request.amount,
                )
            else:
                logger.warning("Refund processing failed", payment_id=payment.id)
                return RefundResponse(
                    success=False,
                    amount=request.amount,
                    error=result.get("error_message", "Refund processing failed"),
                )

        except Exception as e:
            logger.error("Refund processing error", payment_id=payment.id, error=str(e))
            return RefundResponse(
                success=False,
                amount=request.amount,
                error=f"Refund processing error: {str(e)}",
            )

    async def get_payment(self, payment_id: str) -> Optional[Payment]:
        """Get payment by ID"""
        return await self.repository.get_by_id(payment_id)

    async def get_payment_by_order(self, order_id: str) -> Optional[Payment]:
        """Get payment for an order"""
        return await self.repository.get_by_order_id(order_id)

    async def get_payment_by_transaction(self, transaction_id: str) -> Optional[Payment]:
        """Get payment by transaction ID"""
        return await self.repository.get_by_transaction_id(transaction_id)
