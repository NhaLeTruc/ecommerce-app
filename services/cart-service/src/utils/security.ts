import crypto from 'crypto';

/**
 * Security utility functions
 */
export class SecurityUtils {
  /**
   * Generate a cryptographically secure random string
   * Useful for tokens, secrets, etc.
   *
   * @param length - Length of the random string (default: 32)
   * @returns Base64-encoded random string
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Generate a secure random token (URL-safe)
   *
   * @param length - Length in bytes (default: 32)
   * @returns URL-safe random token
   */
  static generateToken(length: number = 32): string {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Hash a value using SHA-256
   * Useful for creating checksums, cache keys, etc.
   *
   * @param value - Value to hash
   * @returns Hex-encoded hash
   */
  static hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Create HMAC signature
   * Useful for API request signing, webhook verification
   *
   * @param data - Data to sign
   * @param secret - Secret key
   * @returns Hex-encoded HMAC signature
   */
  static createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   *
   * @param data - Original data
   * @param signature - Signature to verify
   * @param secret - Secret key
   * @returns True if signature is valid
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expected = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Sanitize user input for logging
   * Removes or masks sensitive information
   *
   * @param data - Object to sanitize
   * @returns Sanitized copy of the object
   */
  static sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
      'cardNumber',
      'cvv',
      'ssn',
      'socialSecurity',
    ];

    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive information
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()))) {
        // Mask the value
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = sanitized[key].length > 4
            ? '***' + sanitized[key].slice(-4)
            : '***';
        } else {
          sanitized[key] = '***';
        }
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Validate UUID format
   *
   * @param uuid - String to validate
   * @returns True if valid UUID v4
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate email format
   *
   * @param email - Email to validate
   * @returns True if valid email format
   */
  static isValidEmail(email: string): boolean {
    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Check if string contains potentially malicious patterns
   * Basic XSS/SQL injection detection
   *
   * @param input - String to check
   * @returns True if suspicious patterns detected
   */
  static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,  // Script tags
      /javascript:/gi,                          // JavaScript protocol
      /on\w+\s*=/gi,                           // Event handlers
      /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,  // SQL keywords
      /\.\.\/|\.\.\\|\.\.%2[fF]/g,             // Path traversal
      /\0/g,                                    // Null bytes
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Calculate rate limit key
   * Combines IP address and optional user ID for rate limiting
   *
   * @param ip - IP address
   * @param userId - Optional user ID
   * @returns Rate limit key
   */
  static getRateLimitKey(ip: string, userId?: string): string {
    if (userId) {
      return `ratelimit:user:${userId}`;
    }
    return `ratelimit:ip:${this.hash(ip)}`;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   *
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  static constantTimeCompare(a: string, b: string): boolean {
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Generate a Content Security Policy nonce
   * For inline scripts in CSP
   *
   * @returns Base64-encoded nonce
   */
  static generateCSPNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Detect potential bot/automated requests
   * Basic heuristics
   *
   * @param userAgent - User-Agent header
   * @returns True if likely a bot
   */
  static isLikelyBot(userAgent?: string): boolean {
    if (!userAgent) {
      return true;  // No User-Agent is suspicious
    }

    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java(?!script)/i,
    ];

    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Parse and validate JWT without verifying signature
   * Useful for extracting claims before full validation
   *
   * @param token - JWT token
   * @returns Decoded payload or null if invalid
   */
  static decodeJWT(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  /**
   * Check if JWT is expired (without verifying signature)
   *
   * @param token - JWT token
   * @returns True if expired
   */
  static isJWTExpired(token: string): boolean {
    const decoded = this.decodeJWT(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  }
}
