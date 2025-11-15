"""Payment database repository"""
from typing import Optional
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import structlog

from .models import PaymentModel, RefundModel
from ..models.payment import Payment, PaymentStatus, PaymentMethod, Currency

logger = structlog.get_logger(__name__)


class PaymentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_payment(
        self,
        order_id: str,
        amount: float,
        currency: Currency,
        payment_method: PaymentMethod,
    ) -> Payment:
        """Create a new payment record"""
        payment_id = str(uuid.uuid4())

        db_payment = PaymentModel(
            id=payment_id,
            order_id=order_id,
            amount=amount,
            currency=currency.value,
            payment_method=payment_method.value,
            status=PaymentStatus.PENDING.value,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.session.add(db_payment)
        await self.session.commit()
        await self.session.refresh(db_payment)

        logger.info("Payment record created", payment_id=payment_id, order_id=order_id)

        return self._to_domain(db_payment)

    async def update_status(self, payment_id: str, status: PaymentStatus) -> Payment:
        """Update payment status"""
        stmt = (
            update(PaymentModel)
            .where(PaymentModel.id == payment_id)
            .values(status=status.value, updated_at=datetime.utcnow())
        )

        await self.session.execute(stmt)
        await self.session.commit()

        return await self.get_by_id(payment_id)

    async def update_payment_success(
        self,
        payment_id: str,
        transaction_id: str,
        payment_intent_id: str,
        provider_response: dict,
    ) -> Payment:
        """Update payment with success details"""
        now = datetime.utcnow()

        stmt = (
            update(PaymentModel)
            .where(PaymentModel.id == payment_id)
            .values(
                status=PaymentStatus.CAPTURED.value,
                transaction_id=transaction_id,
                payment_intent_id=payment_intent_id,
                provider_response=provider_response,
                authorized_at=now,
                captured_at=now,
                updated_at=now,
            )
        )

        await self.session.execute(stmt)
        await self.session.commit()

        return await self.get_by_id(payment_id)

    async def update_payment_failure(
        self,
        payment_id: str,
        error_message: str,
        provider_response: dict = None,
    ) -> Payment:
        """Update payment with failure details"""
        stmt = (
            update(PaymentModel)
            .where(PaymentModel.id == payment_id)
            .values(
                status=PaymentStatus.FAILED.value,
                error_message=error_message,
                provider_response=provider_response,
                updated_at=datetime.utcnow(),
            )
        )

        await self.session.execute(stmt)
        await self.session.commit()

        return await self.get_by_id(payment_id)

    async def add_refund_record(
        self,
        payment_id: str,
        refund_id: str,
        amount: float,
        reason: Optional[str] = None,
    ) -> None:
        """Add a refund record"""
        refund = RefundModel(
            id=str(uuid.uuid4()),
            payment_id=payment_id,
            refund_id=refund_id,
            amount=amount,
            reason=reason,
            created_at=datetime.utcnow(),
        )

        self.session.add(refund)
        await self.session.commit()

        logger.info("Refund record created", refund_id=refund_id, payment_id=payment_id)

    async def get_by_id(self, payment_id: str) -> Optional[Payment]:
        """Get payment by ID"""
        stmt = select(PaymentModel).where(PaymentModel.id == payment_id)
        result = await self.session.execute(stmt)
        db_payment = result.scalar_one_or_none()

        if not db_payment:
            return None

        return self._to_domain(db_payment)

    async def get_by_order_id(self, order_id: str) -> Optional[Payment]:
        """Get payment by order ID"""
        stmt = select(PaymentModel).where(PaymentModel.order_id == order_id)
        result = await self.session.execute(stmt)
        db_payment = result.scalar_one_or_none()

        if not db_payment:
            return None

        return self._to_domain(db_payment)

    async def get_by_transaction_id(self, transaction_id: str) -> Optional[Payment]:
        """Get payment by transaction ID"""
        stmt = select(PaymentModel).where(PaymentModel.transaction_id == transaction_id)
        result = await self.session.execute(stmt)
        db_payment = result.scalar_one_or_none()

        if not db_payment:
            return None

        return self._to_domain(db_payment)

    def _to_domain(self, db_payment: PaymentModel) -> Payment:
        """Convert database model to domain model"""
        return Payment(
            id=db_payment.id,
            order_id=db_payment.order_id,
            amount=db_payment.amount,
            currency=Currency(db_payment.currency),
            payment_method=PaymentMethod(db_payment.payment_method),
            status=PaymentStatus(db_payment.status),
            transaction_id=db_payment.transaction_id,
            payment_intent_id=db_payment.payment_intent_id,
            provider_response=db_payment.provider_response,
            error_message=db_payment.error_message,
            created_at=db_payment.created_at,
            updated_at=db_payment.updated_at,
            authorized_at=db_payment.authorized_at,
            captured_at=db_payment.captured_at,
            refunded_at=db_payment.refunded_at,
        )
