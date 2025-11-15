"""Payment API routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from ...database.connection import get_session
from ...database.repository import PaymentRepository
from ...services.payment_service import PaymentService
from ...services.payment_processor import PaymentProcessor
from ...services.event_publisher import EventPublisher
from ...models.payment import (
    ProcessPaymentRequest,
    PaymentResponse,
    RefundRequest,
    RefundResponse,
    Payment,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

# Global instances (will be initialized in main.py)
_event_publisher: EventPublisher = None


def set_event_publisher(publisher: EventPublisher):
    global _event_publisher
    _event_publisher = publisher


def get_payment_service(session: AsyncSession = Depends(get_session)) -> PaymentService:
    """Dependency to get payment service instance"""
    repository = PaymentRepository(session)
    processor = PaymentProcessor()
    return PaymentService(repository, processor, _event_publisher)


@router.post("/process", response_model=PaymentResponse, status_code=status.HTTP_200_OK)
async def process_payment(
    request: ProcessPaymentRequest,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Process a payment for an order.

    This endpoint handles the complete payment flow:
    1. Creates payment record
    2. Processes payment with gateway
    3. Updates payment status
    4. Publishes events
    """
    logger.info("Processing payment", order_id=request.order_id, amount=request.amount)

    try:
        response = await service.process_payment(request)
        return response

    except Exception as e:
        logger.error("Payment processing failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}",
        )


@router.post("/refund", response_model=RefundResponse, status_code=status.HTTP_200_OK)
async def refund_payment(
    request: RefundRequest,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Refund a payment.

    Processes a full or partial refund for a captured payment.
    """
    logger.info("Processing refund", transaction_id=request.transaction_id, amount=request.amount)

    try:
        response = await service.refund_payment(request)

        if not response.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.error,
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Refund processing failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refund processing failed: {str(e)}",
        )


@router.get("/payment/{payment_id}", response_model=Payment)
async def get_payment(
    payment_id: str,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment details by payment ID"""
    logger.info("Getting payment", payment_id=payment_id)

    payment = await service.get_payment(payment_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


@router.get("/order/{order_id}", response_model=Payment)
async def get_payment_by_order(
    order_id: str,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment details for an order"""
    logger.info("Getting payment for order", order_id=order_id)

    payment = await service.get_payment_by_order(order_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found for this order",
        )

    return payment


@router.get("/transaction/{transaction_id}", response_model=Payment)
async def get_payment_by_transaction(
    transaction_id: str,
    service: PaymentService = Depends(get_payment_service),
):
    """Get payment details by transaction ID"""
    logger.info("Getting payment by transaction", transaction_id=transaction_id)

    payment = await service.get_payment_by_transaction(transaction_id)

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment
