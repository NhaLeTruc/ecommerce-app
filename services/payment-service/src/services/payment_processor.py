"""Payment processor service - simulates payment gateway"""
import random
import uuid
from datetime import datetime
from typing import Dict, Any
import structlog

from ..models.payment import PaymentMethod, PaymentStatus

logger = structlog.get_logger(__name__)


class PaymentProcessor:
    """
    Simulated payment processor that mimics Stripe/PayPal behavior.
    In production, this would integrate with actual payment gateways.
    """

    def __init__(self):
        # Simulate different success rates for testing
        self.success_rate = 0.95  # 95% success rate

    async def authorize_payment(
        self, amount: float, payment_method: PaymentMethod, payment_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Authorize a payment (hold funds without capturing).
        Returns authorization details.
        """
        logger.info("Authorizing payment", amount=amount, method=payment_method)

        # Simulate processing delay
        await self._simulate_processing()

        # Simulate success/failure
        if self._should_succeed():
            payment_intent_id = f"pi_{uuid.uuid4().hex[:24]}"
            transaction_id = f"txn_{uuid.uuid4().hex[:16]}"

            result = {
                "success": True,
                "payment_intent_id": payment_intent_id,
                "transaction_id": transaction_id,
                "status": "authorized",
                "authorized_at": datetime.utcnow().isoformat(),
                "amount": amount,
                "currency": "USD",
            }

            logger.info("Payment authorized", transaction_id=transaction_id)
            return result
        else:
            error_code = random.choice(["insufficient_funds", "card_declined", "expired_card"])
            error_message = self._get_error_message(error_code)

            result = {
                "success": False,
                "error_code": error_code,
                "error_message": error_message,
                "status": "failed",
            }

            logger.warning("Payment authorization failed", error=error_code)
            return result

    async def capture_payment(self, payment_intent_id: str, amount: float) -> Dict[str, Any]:
        """
        Capture a previously authorized payment.
        """
        logger.info("Capturing payment", payment_intent_id=payment_intent_id, amount=amount)

        await self._simulate_processing()

        if self._should_succeed():
            transaction_id = f"txn_{uuid.uuid4().hex[:16]}"

            result = {
                "success": True,
                "transaction_id": transaction_id,
                "payment_intent_id": payment_intent_id,
                "status": "captured",
                "captured_at": datetime.utcnow().isoformat(),
                "amount": amount,
            }

            logger.info("Payment captured", transaction_id=transaction_id)
            return result
        else:
            result = {
                "success": False,
                "error_code": "capture_failed",
                "error_message": "Failed to capture payment",
                "status": "failed",
            }

            logger.warning("Payment capture failed")
            return result

    async def process_payment(
        self, amount: float, payment_method: PaymentMethod, payment_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process payment in one step (authorize + capture).
        This is the most common flow for immediate payment.
        """
        logger.info("Processing payment", amount=amount, method=payment_method)

        # First authorize
        auth_result = await self.authorize_payment(amount, payment_method, payment_details)

        if not auth_result["success"]:
            return auth_result

        # Then capture
        capture_result = await self.capture_payment(auth_result["payment_intent_id"], amount)

        return capture_result

    async def refund_payment(self, transaction_id: str, amount: float, reason: str = None) -> Dict[str, Any]:
        """
        Refund a captured payment.
        """
        logger.info("Processing refund", transaction_id=transaction_id, amount=amount, reason=reason)

        await self._simulate_processing()

        if self._should_succeed():
            refund_id = f"re_{uuid.uuid4().hex[:16]}"

            result = {
                "success": True,
                "refund_id": refund_id,
                "transaction_id": transaction_id,
                "amount": amount,
                "status": "refunded",
                "refunded_at": datetime.utcnow().isoformat(),
            }

            logger.info("Refund processed", refund_id=refund_id)
            return result
        else:
            result = {
                "success": False,
                "error_code": "refund_failed",
                "error_message": "Failed to process refund",
            }

            logger.warning("Refund failed")
            return result

    async def void_authorization(self, payment_intent_id: str) -> Dict[str, Any]:
        """
        Void (cancel) an authorization before it's captured.
        """
        logger.info("Voiding authorization", payment_intent_id=payment_intent_id)

        await self._simulate_processing()

        result = {
            "success": True,
            "payment_intent_id": payment_intent_id,
            "status": "voided",
        }

        logger.info("Authorization voided")
        return result

    # Helper methods

    async def _simulate_processing(self):
        """Simulate network delay for payment processing"""
        import asyncio
        await asyncio.sleep(0.1)  # 100ms simulated delay

    def _should_succeed(self) -> bool:
        """Randomly determine if payment should succeed based on success rate"""
        return random.random() < self.success_rate

    def _get_error_message(self, error_code: str) -> str:
        """Get human-readable error message for error code"""
        error_messages = {
            "insufficient_funds": "Insufficient funds in account",
            "card_declined": "Card was declined by issuer",
            "expired_card": "Card has expired",
            "invalid_card": "Invalid card number",
            "capture_failed": "Failed to capture payment",
            "refund_failed": "Failed to process refund",
        }
        return error_messages.get(error_code, "Payment processing error")
