import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for order operations
 * Limit: 50 requests per 15 minutes per IP
 */
export const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Stricter rate limiter for payment operations
 * Limit: 10 requests per hour per IP
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 payment attempts per hour
  message: 'Too many payment attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
