import axios from 'axios';

// Create axios instances with credentials enabled for cookie-based auth
const catalogApi = axios.create({
  baseURL: process.env.CATALOG_SERVICE_URL || 'http://localhost:8000',
  timeout: 10000,
  withCredentials: true, // Send cookies with requests
});

const cartApi = axios.create({
  baseURL: process.env.CART_SERVICE_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true, // Send cookies with requests
});

const orderApi = axios.create({
  baseURL: process.env.ORDER_SERVICE_URL || 'http://localhost:3001',
  timeout: 10000,
  withCredentials: true, // Send cookies with requests
});

const authApi = axios.create({
  baseURL: process.env.USER_SERVICE_URL || 'http://localhost:8084',
  timeout: 10000,
  withCredentials: true, // Send cookies with requests
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

// Cart API (now uses authenticated user from cookie)
export const cartService = {
  async getCart() {
    try {
      const response = await cartApi.get(`/api/v1/cart`);
      return response.data.cart;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async addToCart(item: Omit<CartItem, 'quantity'> & { quantity: number }) {
    const response = await cartApi.post(`/api/v1/cart/items`, item);
    return response.data.cart;
  },

  async updateQuantity(productId: string, quantity: number) {
    const response = await cartApi.put(`/api/v1/cart/items/${productId}`, {
      quantity,
    });
    return response.data.cart;
  },

  async removeItem(productId: string) {
    const response = await cartApi.delete(`/api/v1/cart/items/${productId}`);
    return response.data.cart;
  },

  async clearCart() {
    await cartApi.delete(`/api/v1/cart`);
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

  async getAllOrders(limit = 20, skip = 0, status?: string) {
    const response = await orderApi.get('/api/v1/orders', {
      params: { limit, skip, status },
    });
    return response.data;
  },
};

// User Auth API
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async register(data: RegisterRequest): Promise<{ user: User }> {
    const response = await authApi.post('/api/v1/auth/register', data);
    // Token is now set as httpOnly cookie by the server
    // Only user data is returned in response
    return response.data;
  },

  async login(data: LoginRequest): Promise<{ user: User }> {
    const response = await authApi.post('/api/v1/auth/login', data);
    // Token is now set as httpOnly cookie by the server
    // Only user data is returned in response
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await authApi.post('/api/v1/auth/logout');
      // Cookie is cleared by the server
    } catch (error) {
      // Even if logout fails on server, we still consider the user logged out
      console.error('Logout error:', error);
    }
  },

  async getProfile(): Promise<User> {
    const response = await authApi.get('/api/v1/users/profile');
    return response.data;
  },

  async updateProfile(data: { first_name?: string; last_name?: string; phone?: string }): Promise<User> {
    const response = await authApi.put('/api/v1/users/profile', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await authApi.post('/api/v1/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      // Try to fetch profile - if successful, user is authenticated
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  },
};
