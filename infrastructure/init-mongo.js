// MongoDB initialization script for catalog database

db = db.getSiblingDB('catalog_db');

// Create collections
db.createCollection('products');
db.createCollection('categories');

// Create indexes
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category_id: 1 });
db.products.createIndex({ is_active: 1 });
db.products.createIndex({ price: 1 });

db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ name: 1 });

// Insert sample categories
db.categories.insertMany([
  {
    _id: 'cat-electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    image_url: 'https://via.placeholder.com/300x200?text=Electronics',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat-computers',
    name: 'Computers',
    slug: 'computers',
    description: 'Laptops, desktops, and computer accessories',
    image_url: 'https://via.placeholder.com/300x200?text=Computers',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat-peripherals',
    name: 'Peripherals',
    slug: 'peripherals',
    description: 'Keyboards, mice, monitors, and more',
    image_url: 'https://via.placeholder.com/300x200?text=Peripherals',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat-audio',
    name: 'Audio',
    slug: 'audio',
    description: 'Headphones, speakers, and audio equipment',
    image_url: 'https://via.placeholder.com/300x200?text=Audio',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'cat-gaming',
    name: 'Gaming',
    slug: 'gaming',
    description: 'Gaming laptops, accessories, and peripherals',
    image_url: 'https://via.placeholder.com/300x200?text=Gaming',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
]);

// Insert sample products
db.products.insertMany([
  {
    _id: 'prod-laptop-001',
    sku: 'LAPTOP-001',
    name: 'Premium Ultrabook Pro 15',
    slug: 'premium-ultrabook-pro-15',
    description: 'High-performance ultrabook with 15-inch 4K display, Intel Core i7, 16GB RAM, 512GB SSD. Perfect for professionals and creatives.',
    price: 1299.99,
    category_id: 'cat-computers',
    brand: 'TechPro',
    image_url: 'https://via.placeholder.com/400x400?text=Ultrabook+Pro+15',
    specifications: {
      processor: 'Intel Core i7-12700H',
      ram: '16GB DDR5',
      storage: '512GB NVMe SSD',
      display: '15.6" 4K OLED',
      graphics: 'Intel Iris Xe',
      weight: '1.8kg'
    },
    is_active: true,
    inventory_quantity: 25,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-laptop-002',
    sku: 'LAPTOP-002',
    name: 'Gaming Beast X17',
    slug: 'gaming-beast-x17',
    description: 'Ultimate gaming laptop with RTX 4080, 17-inch 240Hz display, 32GB RAM. Dominate every game.',
    price: 2499.99,
    category_id: 'cat-gaming',
    brand: 'GameForce',
    image_url: 'https://via.placeholder.com/400x400?text=Gaming+Beast+X17',
    specifications: {
      processor: 'Intel Core i9-13900HX',
      ram: '32GB DDR5',
      storage: '1TB NVMe SSD',
      display: '17.3" QHD 240Hz',
      graphics: 'NVIDIA RTX 4080',
      weight: '2.9kg'
    },
    is_active: true,
    inventory_quantity: 15,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-mouse-001',
    sku: 'MOUSE-001',
    name: 'Precision Wireless Mouse',
    slug: 'precision-wireless-mouse',
    description: 'Ergonomic wireless mouse with 16,000 DPI, customizable buttons, and 70-hour battery life.',
    price: 79.99,
    category_id: 'cat-peripherals',
    brand: 'ClickMaster',
    image_url: 'https://via.placeholder.com/400x400?text=Wireless+Mouse',
    specifications: {
      dpi: '16,000',
      buttons: '6 programmable',
      connectivity: 'Wireless 2.4GHz + Bluetooth',
      battery: '70 hours',
      weight: '95g'
    },
    is_active: true,
    inventory_quantity: 150,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-keyboard-001',
    sku: 'KEYBOARD-001',
    name: 'Mechanical Gaming Keyboard RGB',
    slug: 'mechanical-gaming-keyboard-rgb',
    description: 'Premium mechanical keyboard with Cherry MX switches, per-key RGB lighting, and aluminum frame.',
    price: 149.99,
    category_id: 'cat-peripherals',
    brand: 'KeyForce',
    image_url: 'https://via.placeholder.com/400x400?text=Mechanical+Keyboard',
    specifications: {
      switches: 'Cherry MX Red',
      lighting: 'Per-key RGB',
      layout: 'Full-size (104 keys)',
      frame: 'Aluminum',
      cable: 'Detachable USB-C'
    },
    is_active: true,
    inventory_quantity: 80,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-headset-001',
    sku: 'HEADSET-001',
    name: 'Noise-Cancelling Wireless Headphones',
    slug: 'noise-cancelling-wireless-headphones',
    description: 'Premium wireless headphones with active noise cancellation, 40-hour battery, and studio-quality sound.',
    price: 299.99,
    category_id: 'cat-audio',
    brand: 'AudioPro',
    image_url: 'https://via.placeholder.com/400x400?text=Wireless+Headphones',
    specifications: {
      driver: '40mm dynamic',
      anc: 'Active Noise Cancellation',
      battery: '40 hours',
      connectivity: 'Bluetooth 5.3',
      weight: '250g'
    },
    is_active: true,
    inventory_quantity: 60,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-monitor-001',
    sku: 'MONITOR-001',
    name: '27" 4K Professional Monitor',
    slug: '27-inch-4k-professional-monitor',
    description: '27-inch 4K IPS monitor with 99% sRGB, HDR400, and USB-C connectivity. Perfect for content creators.',
    price: 549.99,
    category_id: 'cat-peripherals',
    brand: 'ViewMaster',
    image_url: 'https://via.placeholder.com/400x400?text=4K+Monitor',
    specifications: {
      size: '27 inches',
      resolution: '3840x2160 (4K)',
      panel: 'IPS',
      color: '99% sRGB',
      hdr: 'HDR400',
      ports: 'HDMI, DisplayPort, USB-C'
    },
    is_active: true,
    inventory_quantity: 40,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-webcam-001',
    sku: 'WEBCAM-001',
    name: '4K Streaming Webcam',
    slug: '4k-streaming-webcam',
    description: '4K webcam with auto-focus, HDR, and stereo microphones. Ideal for streaming and video calls.',
    price: 129.99,
    category_id: 'cat-peripherals',
    brand: 'StreamCam',
    image_url: 'https://via.placeholder.com/400x400?text=4K+Webcam',
    specifications: {
      resolution: '4K 30fps / 1080p 60fps',
      fov: '90 degrees',
      autofocus: 'Yes',
      microphone: 'Dual stereo',
      mount: 'Universal clip'
    },
    is_active: true,
    inventory_quantity: 90,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-speaker-001',
    sku: 'SPEAKER-001',
    name: 'Premium Bluetooth Speaker',
    slug: 'premium-bluetooth-speaker',
    description: 'Portable Bluetooth speaker with 360-degree sound, 20-hour battery, and waterproof design.',
    price: 199.99,
    category_id: 'cat-audio',
    brand: 'SoundWave',
    image_url: 'https://via.placeholder.com/400x400?text=Bluetooth+Speaker',
    specifications: {
      output: '50W',
      battery: '20 hours',
      waterproof: 'IPX7',
      connectivity: 'Bluetooth 5.2',
      weight: '900g'
    },
    is_active: true,
    inventory_quantity: 70,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-tablet-001',
    sku: 'TABLET-001',
    name: 'Pro Tablet 12.9"',
    slug: 'pro-tablet-12-9',
    description: '12.9-inch tablet with M2 chip, 256GB storage, and Apple Pencil support. Perfect for creativity.',
    price: 999.99,
    category_id: 'cat-electronics',
    brand: 'TabletPro',
    image_url: 'https://via.placeholder.com/400x400?text=Pro+Tablet',
    specifications: {
      screen: '12.9" Liquid Retina XDR',
      processor: 'M2 chip',
      storage: '256GB',
      ram: '8GB',
      camera: '12MP + 10MP',
      battery: '10 hours'
    },
    is_active: true,
    inventory_quantity: 35,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-router-001',
    sku: 'ROUTER-001',
    name: 'WiFi 6E Gaming Router',
    slug: 'wifi-6e-gaming-router',
    description: 'Tri-band WiFi 6E router with 10Gbps speeds, advanced QoS, and gaming optimization.',
    price: 399.99,
    category_id: 'cat-electronics',
    brand: 'NetSpeed',
    image_url: 'https://via.placeholder.com/400x400?text=Gaming+Router',
    specifications: {
      standard: 'WiFi 6E (802.11ax)',
      bands: 'Tri-band',
      speed: 'Up to 10Gbps',
      ports: '1x 10G WAN, 4x 1G LAN',
      antennas: '8 external'
    },
    is_active: true,
    inventory_quantity: 45,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-ssd-001',
    sku: 'SSD-001',
    name: '1TB NVMe SSD Gen4',
    slug: '1tb-nvme-ssd-gen4',
    description: 'Ultra-fast Gen4 NVMe SSD with 7000MB/s read speeds and 5-year warranty.',
    price: 149.99,
    category_id: 'cat-computers',
    brand: 'SpeedDrive',
    image_url: 'https://via.placeholder.com/400x400?text=NVMe+SSD',
    specifications: {
      capacity: '1TB',
      interface: 'PCIe Gen4 x4',
      read: '7000 MB/s',
      write: '5000 MB/s',
      form_factor: 'M.2 2280'
    },
    is_active: true,
    inventory_quantity: 120,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    _id: 'prod-chair-001',
    sku: 'CHAIR-001',
    name: 'Ergonomic Gaming Chair',
    slug: 'ergonomic-gaming-chair',
    description: 'Premium gaming chair with lumbar support, 4D armrests, and reclining back up to 180 degrees.',
    price: 449.99,
    category_id: 'cat-gaming',
    brand: 'SitComfort',
    image_url: 'https://via.placeholder.com/400x400?text=Gaming+Chair',
    specifications: {
      material: 'PU leather',
      max_weight: '150kg',
      armrests: '4D adjustable',
      recline: '90-180 degrees',
      lumbar: 'Adjustable lumbar support'
    },
    is_active: true,
    inventory_quantity: 30,
    created_at: new Date(),
    updated_at: new Date()
  }
]);

print('MongoDB catalog database initialized with sample data');
print('Categories inserted: 5');
print('Products inserted: 12');
