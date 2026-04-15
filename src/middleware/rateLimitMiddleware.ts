/**
 * Rate Limiting Middleware
 * PHASE 1 CRITICAL FIX #3
 * 
 * Purpose: Prevent DDoS attacks and abuse
 * Security: Limits requests per user/IP within time window
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { log_security_event } from './auditLogger';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * In-memory store for rate limiting
 * Phase 2: Upgrade to Redis for distributed systems
 */
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Custom key generator: Use user ID if authenticated, IP otherwise
 */
function keyGenerator(req: Request): string {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  return `ip_${req.ip || 'unknown'}`;
}

/**
 * Custom handler: Log violations to security audit
 */
async function handleRateLimitViolation(req: Request, res: Response): Promise<void> {
  const key = keyGenerator(req);
  
  await log_security_event(
    'rate_limit_exceeded',
    req.path,
    'too_many_requests',
    'blocked',
    {
      key,
      endpoint: req.path,
      ip: req.ip,
      user_id: req.user?.id
    }
  );

  res.status(429).json({
    error: 'Too many requests. Please try again later.'
  });
}

/**
 * GENERAL API RATE LIMITER
 * 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/status';
  },
  handler: handleRateLimitViolation,
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

/**
 * AUTH ENDPOINTS RATE LIMITER
 * 5 attempts per 15 minutes
 * Protects against brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per window
  keyGenerator: (req) => {
    // Use email if available, otherwise IP
    return req.body?.email || req.ip || 'unknown';
  },
  skip: (req) => req.method !== 'POST',
  handler: async (req: Request, res: Response) => {
    await log_security_event(
      'rate_limit_exceeded',
      '/auth/login',
      'too_many_login_attempts',
      'blocked',
      {
        endpoint: '/auth/login',
        email: req.body?.email,
        ip: req.ip
      }
    );

    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  },
  message: 'Too many login attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * PAYMENT ENDPOINTS RATE LIMITER
 * 10 requests per 1 minute
 * Strictest limits for financial operations
 */
export const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => {
    // Use authenticated user ID for payment endpoints
    return req.user?.id || req.ip || 'unknown';
  },
  skip: (req) => req.method !== 'POST' && req.method !== 'PUT',
  handler: async (req: Request, res: Response) => {
    await log_security_event(
      'rate_limit_exceeded',
      req.path,
      'too_many_payment_requests',
      'blocked',
      {
        endpoint: req.path,
        user_id: req.user?.id,
        ip: req.ip
      }
    );

    res.status(429).json({
      error: 'Payment rate limit exceeded. Please try again in a minute.'
    });
  },
  message: 'Payment rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * SHUTTLE BOOKING RATE LIMITER
 * 20 bookings per 1 hour per user
 */
export const shuttleBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  skip: (req) => req.method !== 'POST',
  handler: handleRateLimitViolation,
  message: 'Booking limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * WALLET OPERATIONS RATE LIMITER
 * 30 operations per 1 hour per user
 */
export const walletLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  skip: (req) => req.method !== 'POST' && req.method !== 'PUT',
  handler: handleRateLimitViolation,
  message: 'Wallet operation limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * DOCUMENT UPLOAD RATE LIMITER
 * 5 uploads per 1 hour per user
 */
export const documentUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  skip: (req) => req.method !== 'POST' && req.method !== 'PUT',
  handler: async (req: Request, res: Response) => {
    await log_security_event(
      'rate_limit_exceeded',
      '/documents/upload',
      'too_many_uploads',
      'blocked',
      {
        user_id: req.user?.id,
        ip: req.ip
      }
    );

    res.status(429).json({
      error: 'Document upload limit exceeded. Please try again later.'
    });
  },
  message: 'Upload limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CUSTOM RATE LIMITER for specific endpoints
 */
export function createCustomRateLimiter(
  windowMs: number,
  maxRequests: number,
  message: string
): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator,
    handler: handleRateLimitViolation,
    message,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Check current rate limit status for a user
 */
export async function checkRateLimitStatus(
  userId: string,
  endpoint: string,
  limitType: 'general' | 'auth' | 'payment' | 'booking' = 'general'
): Promise<{
  remaining: number;
  reset: number;
  isLimited: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('*')
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(1);

    if (error || !data || data.length === 0) {
      return { remaining: 100, reset: Date.now() + 15 * 60 * 1000, isLimited: false };
    }

    const violation = data[0];
    const maxAttempts = limitType === 'auth' ? 5 : 100;
    const remaining = Math.max(0, maxAttempts - violation.violation_count);

    return {
      remaining,
      reset: new Date(violation.timestamp).getTime() + 15 * 60 * 1000,
      isLimited: remaining === 0
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return { remaining: 100, reset: Date.now() + 15 * 60 * 1000, isLimited: false };
  }
}

/**
 * Reset rate limit for a specific user (admin only)
 */
export async function resetRateLimit(userId: string, endpoint?: string): Promise<boolean> {
  try {
    const query = supabase
      .from('rate_limit_logs')
      .delete()
      .eq('user_id', userId);

    if (endpoint) {
      query.eq('endpoint', endpoint);
    }

    const { error } = await query;
    return !error;
  } catch (err) {
    console.error('Rate limit reset failed:', err);
    return false;
  }
}
