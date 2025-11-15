import axios from 'axios';

const catalogApi = axios.create({
  baseURL: process.env.CATALOG_SERVICE_URL || 'http://localhost:8000',
  timeout: 10000,
});

const cartApi = axios.create({
  baseURL: process.env.CART_SERVICE_URL || 'http://localhost:3000',
  timeout: 10000,
});

const orderApi = axios.create({
  baseURL: process.env.ORDER_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000,
});

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: string;
  brand: string;
  image_url?: string;
  is_active: boolean;
  inventory_quantity: number;
}

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}

export interface Address {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentDetails?: {
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
  };
}

// Catalog API
export const catalogService = {
  async getProducts(skip = 0, limit = 20) {
    const response = await catalogApi.get('/api/v1/products', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getProduct(id: string) {
    const response = await catalogApi.get(`/api/v1/products/${id}`);
    return response.data;
  },

  async searchProducts(query: string, skip = 0, limit = 20) {
    const response = await catalogApi.get('/api/v1/search', {
      params: { q: query, skip, limit },
    });
    return response.data;
  },

  async getCategories() {
    const response = await catalogApi.get('/api/v1/categories');
    return response.data;
  },
};

// Cart API
export const cartService = {
  async getCart(userId: string) {
    try {
      const response = await cartApi.get(`/api/v1/cart/${userId}`);
      return response.data.cart;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async addToCart(userId: string, item: Omit<CartItem, 'quantity'> & { quantity: number }) {
    const response = await cartApi.post(`/api/v1/cart/${userId}/items`, item);
    return response.data.cart;
  },

  async updateQuantity(userId: string, productId: string, quantity: number) {
    const response = await cartApi.put(`/api/v1/cart/${userId}/items/${productId}`, {
      quantity,
    });
    return response.data.cart;
  },

  async removeItem(userId: string, productId: string) {
    const response = await cartApi.delete(`/api/v1/cart/${userId}/items/${productId}`);
    return response.data.cart;
  },

  async clearCart(userId: string) {
    await cartApi.delete(`/api/v1/cart/${userId}`);
  },
};

// Order API
export const orderService = {
  async createOrder(orderData: CreateOrderRequest) {
    const response = await orderApi.post('/api/v1/orders', orderData);
    return response.data.order;
  },

  async processPayment(orderId: string) {
    const response = await orderApi.post(`/api/v1/orders/${orderId}/payment`);
    return response.data;
  },

  async getOrder(orderId: string) {
    const response = await orderApi.get(`/api/v1/orders/${orderId}`);
    return response.data.order;
  },

  async getUserOrders(userId: string, skip = 0, limit = 20) {
    const response = await orderApi.get('/api/v1/orders', {
      params: { userId, skip, limit },
    });
    return response.data;
  },

  async cancelOrder(orderId: string) {
    const response = await orderApi.post(`/api/v1/orders/${orderId}/cancel`);
    return response.data.order;
  },
};
