/**
 * Auth Middleware: JWT Validation & Session Management
 * PHASE 1 CRITICAL FIX #2
 * 
 * Purpose: Validate JWT tokens on all protected endpoints
 * Security: Prevents unauthorized access to APIs
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { log_security_event } from './auditLogger';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
      token?: string;
    }
  }
}

/**
 * Get JWT token from request
 * Priority: Authorization header > HttpOnly cookie
 */
export function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check HttpOnly cookie (Express middleware must parse cookies first)
  // Install: npm install cookie-parser
  if (req.cookies?.['sb-access-token']) {
    return req.cookies['sb-access-token'];
  }

  return null;
}

/**
 * Main JWT Validation Middleware
 * Apply to all protected routes
 */
export async function validateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      await log_security_event('failed_login', 'jwt_validation', 'no_token', 'failed', {
        endpoint: req.path,
        ip: req.ip
      });

      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      await log_security_event('failed_login', 'jwt_validation', 'invalid_token', 'failed', {
        endpoint: req.path,
        error: error?.message,
        ip: req.ip
      });

      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request for downstream handlers
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    };
    req.token = token;

    // Log successful auth
    await log_security_event('login', 'jwt_validation', 'token_verified', 'success', {
      user_id: user.id,
      endpoint: req.path
    });

    next();
  } catch (err: any) {
    await log_security_event('failed_login', 'jwt_validation', 'error', 'failed', {
      endpoint: req.path,
      error: err.message
    });

    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional: Enhanced JWT validation with role-based access
 */
export function validateJWTWithRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractToken(req);

      if (!token) {
        res.status(401).json({ error: 'No authentication token provided' });
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const userRole = user.user_metadata?.role || 'user';

      // Check if user has required role
      if (!allowedRoles.includes(userRole)) {
        await log_security_event('unauthorized_access', req.path, 'insufficient_role', 'failed', {
          user_id: user.id,
          user_role: userRole,
          required_roles: allowedRoles
        });

        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: userRole
      };
      req.token = token;

      next();
    } catch (err: any) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Verify token expiration
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
}

/**
 * Refresh expired token
 * TODO: Implement token refresh logic
 */
export async function refreshToken(userId: string): Promise<string | null> {
  try {
    // This is a placeholder - implement based on your auth strategy
    // Typically you'd call Supabase refresh_token endpoint
    return null;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
}
