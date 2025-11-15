import { Request, Response, NextFunction } from 'express';
import { validateBody, addToCartSchema, updateCartItemSchema } from '../validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('addToCartSchema', () => {
    it('should validate valid cart item', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 2,
        imageUrl: 'https://example.com/image.jpg',
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject missing required fields', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        // Missing sku, name, price, quantity
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'sku' }),
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'price' }),
            expect.objectContaining({ field: 'quantity' }),
          ]),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid UUID', () => {
      mockRequest.body = {
        productId: 'invalid-uuid',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 1,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'productId',
              message: expect.stringContaining('UUID'),
            }),
          ]),
        })
      );
    });

    it('should reject negative price', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: -10.00,
        quantity: 1,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'price',
              message: expect.stringContaining('non-negative'),
            }),
          ]),
        })
      );
    });

    it('should reject price exceeding maximum', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 9999999.99,
        quantity: 1,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'price',
              message: expect.stringContaining('999999.99'),
            }),
          ]),
        })
      );
    });

    it('should reject quantity less than 1', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 0,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'quantity',
              message: expect.stringContaining('at least 1'),
            }),
          ]),
        })
      );
    });

    it('should reject quantity greater than 10', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 11,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'quantity',
              message: expect.stringContaining('cannot exceed 10'),
            }),
          ]),
        })
      );
    });

    it('should reject non-integer quantity', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 2.5,
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'quantity',
              message: expect.stringContaining('integer'),
            }),
          ]),
        })
      );
    });

    it('should strip unknown fields', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 1,
        unknownField: 'should be removed',
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body).not.toHaveProperty('unknownField');
    });

    it('should allow optional imageUrl', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 1,
        // imageUrl is optional
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid imageUrl', () => {
      mockRequest.body = {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'PROD-123',
        name: 'Test Product',
        price: 99.99,
        quantity: 1,
        imageUrl: 'not-a-valid-url',
      };

      const middleware = validateBody(addToCartSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'imageUrl',
              message: expect.stringContaining('valid URL'),
            }),
          ]),
        })
      );
    });
  });

  describe('updateCartItemSchema', () => {
    it('should validate valid quantity', () => {
      mockRequest.body = { quantity: 5 };

      const middleware = validateBody(updateCartItemSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow quantity of 0 (for removing)', () => {
      mockRequest.body = { quantity: 0 };

      const middleware = validateBody(updateCartItemSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject negative quantity', () => {
      mockRequest.body = { quantity: -1 };

      const middleware = validateBody(updateCartItemSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'quantity',
              message: expect.stringContaining('at least 0'),
            }),
          ]),
        })
      );
    });

    it('should reject quantity greater than 10', () => {
      mockRequest.body = { quantity: 11 };

      const middleware = validateBody(updateCartItemSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should require quantity field', () => {
      mockRequest.body = {};

      const middleware = validateBody(updateCartItemSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'quantity',
              message: expect.stringContaining('required'),
            }),
          ]),
        })
      );
    });
  });
});
