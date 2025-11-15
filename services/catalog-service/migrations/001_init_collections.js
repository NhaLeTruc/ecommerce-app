// MongoDB initialization script for Catalog Service
// Run with: mongosh < 001_init_collections.js

db = db.getSiblingDB('catalog');

// Create products collection with indexes
db.createCollection('products');
db.products.createIndex({ 'sku': 1 }, { unique: true });
db.products.createIndex({ 'slug': 1 }, { unique: true });
db.products.createIndex({ 'category_id': 1 });
db.products.createIndex({ 'is_active': 1 });
db.products.createIndex({ 'created_at': -1 });
db.products.createIndex({ 'name': 'text', 'description': 'text', 'tags': 'text' });

// Create categories collection with indexes
db.createCollection('categories');
db.categories.createIndex({ 'slug': 1 }, { unique: true });
db.categories.createIndex({ 'parent_id': 1 });
db.categories.createIndex({ 'is_active': 1 });
db.categories.createIndex({ 'display_order': 1 });

// Create reviews collection with indexes
db.createCollection('reviews');
db.reviews.createIndex({ 'product_id': 1 });
db.reviews.createIndex({ 'user_id': 1 });
db.reviews.createIndex({ 'status': 1 });
db.reviews.createIndex({ 'created_at': -1 });
db.reviews.createIndex({ 'product_id': 1, 'status': 1 });

// Insert sample categories
db.categories.insertMany([
  {
    _id: 'cat_electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    parent_id: null,
    image_url: '/images/categories/electronics.jpg',
    display_order: 1,
    is_active: true,
    product_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat_clothing',
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel',
    parent_id: null,
    image_url: '/images/categories/clothing.jpg',
    display_order: 2,
    is_active: true,
    product_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat_home',
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home improvement and garden supplies',
    parent_id: null,
    image_url: '/images/categories/home.jpg',
    display_order: 3,
    is_active: true,
    product_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat_books',
    name: 'Books',
    slug: 'books',
    description: 'Books and reading materials',
    parent_id: null,
    image_url: '/images/categories/books.jpg',
    display_order: 4,
    is_active: true,
    product_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  }
]);

// Insert sample products
db.products.insertMany([
  {
    _id: 'prod_laptop_001',
    sku: 'LAPTOP-001',
    name: 'Professional Laptop 15"',
    slug: 'professional-laptop-15',
    description: 'High-performance laptop for professionals with 16GB RAM and 512GB SSD',
    category_id: 'cat_electronics',
    price: 1299.99,
    compare_at_price: 1499.99,
    brand: 'TechBrand',
    image_url: '/images/products/laptop.jpg',
    tags: ['laptop', 'computer', 'electronics', 'professional'],
    specifications: {
      processor: 'Intel Core i7',
      ram: '16GB',
      storage: '512GB SSD',
      screen: '15.6 inch Full HD'
    },
    is_active: true,
    inventory_quantity: 50,
    reserved_quantity: 0,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod_phone_001',
    sku: 'PHONE-001',
    name: 'Smartphone Pro X',
    slug: 'smartphone-pro-x',
    description: 'Latest flagship smartphone with 5G, triple camera system',
    category_id: 'cat_electronics',
    price: 999.99,
    compare_at_price: null,
    brand: 'PhoneCo',
    image_url: '/images/products/phone.jpg',
    tags: ['smartphone', 'mobile', '5g', 'electronics'],
    specifications: {
      screen: '6.5 inch OLED',
      camera: 'Triple 48MP',
      battery: '4500mAh',
      storage: '256GB'
    },
    is_active: true,
    inventory_quantity: 100,
    reserved_quantity: 5,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod_shirt_001',
    sku: 'SHIRT-001',
    name: 'Cotton T-Shirt',
    slug: 'cotton-t-shirt',
    description: 'Comfortable 100% cotton t-shirt, available in multiple colors',
    category_id: 'cat_clothing',
    price: 29.99,
    compare_at_price: 39.99,
    brand: 'FashionCo',
    image_url: '/images/products/tshirt.jpg',
    tags: ['tshirt', 'clothing', 'cotton', 'casual'],
    specifications: {
      material: '100% Cotton',
      fit: 'Regular',
      care: 'Machine washable'
    },
    is_active: true,
    inventory_quantity: 200,
    reserved_quantity: 10,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod_book_001',
    sku: 'BOOK-001',
    name: 'Complete Guide to Microservices',
    slug: 'complete-guide-microservices',
    description: 'Comprehensive guide to building scalable microservices',
    category_id: 'cat_books',
    price: 49.99,
    compare_at_price: null,
    brand: 'TechPublishing',
    image_url: '/images/products/book.jpg',
    tags: ['book', 'programming', 'microservices', 'technology'],
    specifications: {
      pages: '450',
      format: 'Paperback',
      language: 'English',
      isbn: '978-1234567890'
    },
    is_active: true,
    inventory_quantity: 75,
    reserved_quantity: 2,
    created_at: new Date(),
    updated_at: new Date()
  }
]);

print('Catalog database initialized successfully');
print('Collections created: products, categories, reviews');
print('Sample data inserted: 4 categories, 4 products');
