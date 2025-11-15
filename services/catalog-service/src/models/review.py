"""Product review model"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum

class ReviewStatus(str, Enum):
    """Review moderation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ReviewBase(BaseModel):
    """Base review fields"""
    product_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=1, max_length=200)
    comment: str = Field(..., min_length=1, max_length=2000)
    verified_purchase: bool = Field(default=False)

    @validator('rating')
    def validate_rating(cls, v):
        """Validate rating is between 1 and 5"""
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewCreate(ReviewBase):
    """Review creation schema"""
    pass

class ReviewUpdate(BaseModel):
    """Review update schema - limited fields can be updated"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    comment: Optional[str] = Field(None, min_length=1, max_length=2000)
    rating: Optional[int] = Field(None, ge=1, le=5)

    @validator('rating')
    def validate_rating(cls, v):
        """Validate rating is between 1 and 5"""
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v

class Review(ReviewBase):
    """Review with database fields"""
    id: str = Field(alias="_id")
    status: ReviewStatus = Field(default=ReviewStatus.PENDING)
    helpful_count: int = Field(default=0)
    not_helpful_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ReviewResponse(BaseModel):
    """Review API response"""
    id: str
    product_id: str
    user_id: str
    rating: int
    title: str
    comment: str
    verified_purchase: bool
    status: ReviewStatus
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ReviewStats(BaseModel):
    """Aggregated review statistics for a product"""
    total_reviews: int
    average_rating: float
    rating_distribution: dict[int, int]  # {1: count, 2: count, ...}
