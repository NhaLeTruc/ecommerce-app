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
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface AddToCartRequest {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartResponse {
  cart: Cart;
}

export interface CartSummary {
  totalItems: number;
  subtotal: number;
  itemCount: number;
}
