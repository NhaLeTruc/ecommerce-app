"""SQLAlchemy database models"""
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class PaymentModel(Base):
    __tablename__ = "payments"

    id = Column(String(255), primary_key=True)
    order_id = Column(String(255), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    payment_method = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, index=True)

    # Payment gateway details
    transaction_id = Column(String(255), unique=True, index=True)
    payment_intent_id = Column(String(255), unique=True)
    provider_response = Column(JSON)
    error_message = Column(String(500))

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    authorized_at = Column(DateTime)
    captured_at = Column(DateTime)
    refunded_at = Column(DateTime)


class RefundModel(Base):
    __tablename__ = "refunds"

    id = Column(String(255), primary_key=True)
    payment_id = Column(String(255), ForeignKey("payments.id"), nullable=False, index=True)
    refund_id = Column(String(255), nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    reason = Column(String(500))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
