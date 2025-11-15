import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Schema for adding items to cart
 */
export const addToCartSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required',
  }),
  sku: Joi.string().min(1).max(100).required().messages({
    'string.min': 'SKU must not be empty',
    'string.max': 'SKU must not exceed 100 characters',
    'any.required': 'SKU is required',
  }),
  name: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Product name must not be empty',
    'string.max': 'Product name must not exceed 500 characters',
    'any.required': 'Product name is required',
  }),
  price: Joi.number().min(0).max(999999.99).precision(2).required().messages({
    'number.min': 'Price must be non-negative',
    'number.max': 'Price must not exceed 999999.99',
    'any.required': 'Price is required',
  }),
  quantity: Joi.number().integer().min(1).max(10).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Quantity cannot exceed 10',
    'any.required': 'Quantity is required',
  }),
  imageUrl: Joi.string().uri().max(2000).optional().allow('').messages({
    'string.uri': 'Image URL must be a valid URL',
    'string.max': 'Image URL must not exceed 2000 characters',
  }),
});

/**
 * Schema for updating cart item quantity
 */
export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(10).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 0',
    'number.max': 'Quantity cannot exceed 10',
    'any.required': 'Quantity is required',
  }),
});

/**
 * Middleware factory for validating request body against a Joi schema
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // Replace request body with validated/sanitized value
    req.body = value;
    next();
  };
}
