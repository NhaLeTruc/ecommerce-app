"""Category model for product organization"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

class CategoryBase(BaseModel):
    """Base category fields"""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)

    @validator('slug')
    def validate_slug(cls, v):
        """Validate slug is URL-safe"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug must be URL-safe (alphanumeric, hyphens, underscores only)')
        return v.lower()

class CategoryCreate(CategoryBase):
    """Category creation schema"""
    pass

class CategoryUpdate(BaseModel):
    """Category update schema - all fields optional"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

    @validator('slug')
    def validate_slug(cls, v):
        """Validate slug is URL-safe"""
        if v is not None and not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug must be URL-safe (alphanumeric, hyphens, underscores only)')
        return v.lower() if v else v

class Category(CategoryBase):
    """Category with database fields"""
    id: str = Field(alias="_id")
    product_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CategoryResponse(BaseModel):
    """Category API response"""
    id: str
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    image_url: Optional[str]
    display_order: int
    is_active: bool
    product_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CategoryTree(CategoryResponse):
    """Category with nested children for hierarchy display"""
    children: list['CategoryTree'] = Field(default_factory=list)
