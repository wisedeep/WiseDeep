interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  max: number;          // Max requests per window
  message?: string;     // Error message
  statusCode?: number;  // Status code for rate limit exceeded
}

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs || 60 * 1000, // Default 1 minute
      max: options.max || 100,                 // Default 100 requests
      message: options.message || 'Too many requests, please try again later.',
      statusCode: options.statusCode || 429
    };
  }

  middleware() {
    return (socket: any, next: (err?: Error) => void) => {
      const ip = socket.handshake.address;
      const now = Date.now();

      // Initialize or reset the store for this IP
      if (!this.store[ip] || this.store[ip].resetTime <= now) {
        this.store[ip] = {
          count: 0,
          resetTime: now + this.options.windowMs
        };
      }

      // Increment the request count
      this.store[ip].count += 1;

      // Check if rate limit is exceeded
      if (this.store[ip].count > this.options.max) {
        // Clean up old entries
        this.cleanup();
        return next(new Error(this.options.message));
      }

      // Set reset time in headers
      socket.handshake.headers['X-RateLimit-Limit'] = this.options.max.toString();
      socket.handshake.headers['X-RateLimit-Remaining'] = (this.options.max - this.store[ip].count).toString();
      socket.handshake.headers['X-RateLimit-Reset'] = this.store[ip].resetTime.toString();

      next();
    };
  }

  // Clean up old entries
  private cleanup() {
    const now = Date.now();
    for (const ip in this.store) {
      if (this.store[ip].resetTime <= now) {
        delete this.store[ip];
      }
    }
  }
}