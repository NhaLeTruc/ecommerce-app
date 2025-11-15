import axios from 'axios';

const catalogApi = axios.create({
  baseURL: process.env.CATALOG_SERVICE_URL || 'http://localhost:8000',
  timeout: 10000,
});

const cartApi = axios.create({
  baseURL: process.env.CART_SERVICE_URL || 'http://localhost:3000',
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
