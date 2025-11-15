"""Product model for catalog service"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class ProductSpecifications(BaseModel):
    """Product specifications (flexible schema)"""
    processor: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    display: Optional[str] = None
    graphics: Optional[str] = None
    battery: Optional[str] = None
    # Additional fields stored as dict
    additional: Dict[str, Any] = Field(default_factory=dict)


class ProductBase(BaseModel):
    """Base product schema"""
    sku: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=250)
    description: str = Field(..., min_length=1, max_length=5000)
    price: float = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    category: str = Field(..., min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    images: List[str] = Field(default_factory=list)
    specifications: Optional[ProductSpecifications] = None
    tags: List[str] = Field(default_factory=list)
    in_stock: bool = True
    rating: Optional[float] = Field(None, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)

    @validator('slug')
    def validate_slug(cls, v):
        """Ensure slug is URL-safe"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Slug must be URL-safe (alphanumeric, hyphens, underscores)')
        return v.lower()

    @validator('tags')
    def validate_tags(cls, v):
        """Ensure tags are lowercase"""
        return [tag.lower() for tag in v]


class ProductCreate(ProductBase):
    """Schema for creating a product"""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    images: Optional[List[str]] = None
    specifications: Optional[ProductSpecifications] = None
    tags: Optional[List[str]] = None
    in_stock: Optional[bool] = None
    rating: Optional[float] = Field(None, ge=0, le=5)
    review_count: Optional[int] = Field(None, ge=0)


class Product(ProductBase):
    """Complete product schema with database fields"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}


class ProductResponse(BaseModel):
    """Product response schema"""
    id: str
    sku: str
    name: str
    slug: str
    description: str
    price: float
    currency: str
    category: str
    brand: Optional[str]
    images: List[str]
    specifications: Optional[ProductSpecifications]
    tags: List[str]
    in_stock: bool
    rating: Optional[float]
    review_count: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_product(cls, product: Product) -> "ProductResponse":
        """Convert Product model to response"""
        return cls(
            id=str(product.id),
            sku=product.sku,
            name=product.name,
            slug=product.slug,
            description=product.description,
            price=product.price,
            currency=product.currency,
            category=product.category,
            brand=product.brand,
            images=product.images,
            specifications=product.specifications,
            tags=product.tags,
            in_stock=product.in_stock,
            rating=product.rating,
            review_count=product.review_count,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )


class ProductListResponse(BaseModel):
    """Paginated product list response"""
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
