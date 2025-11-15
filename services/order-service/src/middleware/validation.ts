import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { OrderStatus } from '../models/order';

/**
 * Schema for address validation
 */
const addressSchema = Joi.object({
  fullName: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Full name must not be empty',
    'string.max': 'Full name must not exceed 200 characters',
    'any.required': 'Full name is required',
  }),
  street: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Street address must not be empty',
    'string.max': 'Street address must not exceed 500 characters',
    'any.required': 'Street address is required',
  }),
  city: Joi.string().min(1).max(100).required().messages({
    'string.min': 'City must not be empty',
    'string.max': 'City must not exceed 100 characters',
    'any.required': 'City is required',
  }),
  state: Joi.string().min(2).max(100).required().messages({
    'string.min': 'State must be at least 2 characters',
    'string.max': 'State must not exceed 100 characters',
    'any.required': 'State is required',
  }),
  zipCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).required().messages({
    'string.pattern.base': 'Zip code must be in format 12345 or 12345-6789',
    'any.required': 'Zip code is required',
  }),
  country: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Country must be at least 2 characters',
    'string.max': 'Country must not exceed 100 characters',
    'any.required': 'Country is required',
  }),
  phone: Joi.string().pattern(/^[0-9+\-\s()]{10,20}$/).required().messages({
    'string.pattern.base': 'Phone number must be 10-20 characters and contain only numbers, +, -, (), and spaces',
    'any.required': 'Phone number is required',
  }),
});

/**
 * Schema for order items
 */
const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.guid': 'Product ID must be a valid UUID',
    'any.required': 'Product ID is required',
  }),
  sku: Joi.string().min(1).max(100).required(),
  name: Joi.string().min(1).max(500).required(),
  price: Joi.number().min(0).max(999999.99).precision(2).required().messages({
    'number.min': 'Price must be non-negative',
    'number.max': 'Price must not exceed 999999.99',
  }),
  quantity: Joi.number().integer().min(1).max(100).required().messages({
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Quantity cannot exceed 100',
  }),
  imageUrl: Joi.string().uri().max(2000).optional().allow(''),
});

/**
 * Schema for creating an order
 */
export const createOrderSchema = Joi.object({
  userId: Joi.string().uuid().optional(), // Will be overridden by authenticated user
  items: Joi.array().items(orderItemSchema).min(1).max(100).required().messages({
    'array.min': 'Order must contain at least 1 item',
    'array.max': 'Order cannot contain more than 100 items',
    'any.required': 'Items are required',
  }),
  shippingAddress: addressSchema.required(),
  billingAddress: addressSchema.required(),
  paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'stripe').required().messages({
    'any.only': 'Payment method must be one of: credit_card, debit_card, paypal, stripe',
    'any.required': 'Payment method is required',
  }),
  paymentDetails: Joi.object().optional(), // Don't validate - should use external payment provider
});

/**
 * Schema for updating order status
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
      'any.required': 'Status is required',
    }),
  notes: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Notes must not exceed 1000 characters',
  }),
});

/**
 * Schema for canceling an order
 */
export const cancelOrderSchema = Joi.object({
  reason: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Cancellation reason must not be empty',
    'string.max': 'Cancellation reason must not exceed 1000 characters',
    'any.required': 'Cancellation reason is required',
  }),
});

/**
 * Schema for shipping information
 */
export const shippingInfoSchema = Joi.object({
  trackingNumber: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Tracking number must not be empty',
    'string.max': 'Tracking number must not exceed 200 characters',
    'any.required': 'Tracking number is required',
  }),
  carrier: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Carrier must not be empty',
    'string.max': 'Carrier must not exceed 100 characters',
    'any.required': 'Carrier is required',
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

/**
 * Middleware for validating query parameters
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
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

    req.query = value;
    next();
  };
}
