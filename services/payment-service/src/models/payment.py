"""Payment models and schemas"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    STRIPE = "stripe"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class PaymentBase(BaseModel):
    order_id: str
    amount: float = Field(..., gt=0)
    currency: Currency = Currency.USD
    payment_method: PaymentMethod


class ProcessPaymentRequest(PaymentBase):
    payment_method_details: Optional[dict] = None


class RefundRequest(BaseModel):
    transaction_id: str
    amount: float = Field(..., gt=0)
    reason: Optional[str] = None


class Payment(BaseModel):
    id: str
    order_id: str
    amount: float
    currency: Currency
    payment_method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    provider_response: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    authorized_at: Optional[datetime] = None
    captured_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    status: PaymentStatus
    error: Optional[str] = None


class RefundResponse(BaseModel):
    success: bool
    refund_id: Optional[str] = None
    amount: float
    error: Optional[str] = None
