/**
 * Audit Logger & Security Event Tracking
 * PHASE 1 SUPPORT UTILITY
 * 
 * Purpose: Track security events for compliance and debugging
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export interface SecurityEvent {
  eventType: string;
  resource?: string;
  action?: string;
  status: 'success' | 'failed' | 'blocked';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log security event to database
 */
export async function log_security_event(
  eventType: string,
  resource?: string,
  action?: string,
  status: string = 'success',
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('log_security_event', {
        p_event_type: eventType,
        p_resource: resource,
        p_action: action,
        p_status: status,
        p_details: details || {},
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

    if (error) {
      console.error('Failed to log security event:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error logging security event:', err);
    return null;
  }
}

/**
 * Get audit log for user
 */
export async function getUserAuditLog(
  userId: string,
  limit: number = 100,
  eventType?: string
) {
  try {
    let query = supabase
      .from('security_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to get audit log:', err);
    return [];
  }
}

/**
 * Get security events by type
 */
export async function getSecurityEventsByType(
  eventType: string,
  hoursBack: number = 24
) {
  try {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('security_audit_log')
      .select('*')
      .eq('event_type', eventType)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to get security events:', err);
    return [];
  }
}

/**
 * Get failed login attempts
 */
export async function getFailedLoginAttempts(
  userId?: string,
  hoursBack: number = 24
) {
  try {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    let query = supabase
      .from('security_audit_log')
      .select('*')
      .eq('event_type', 'failed_login')
      .gte('created_at', startTime.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to get login attempts:', err);
    return [];
  }
}

/**
 * Check for suspicious activity
 */
export async function checkSuspiciousActivity(userId: string): Promise<{
  failedLogins: number;
  rateViolations: number;
  lastFailedLogin?: Date;
}> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [failedLogins, rateViolations] = await Promise.all([
      (async () => {
        const { count } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', 'failed_login')
          .gte('created_at', oneDayAgo.toISOString());
        return count || 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from('security_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', 'rate_limit_exceeded')
          .gte('created_at', oneDayAgo.toISOString());
        return count || 0;
      })()
    ]);

    // Get most recent failed login
    const { data: failedLog } = await supabase
      .from('security_audit_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'failed_login')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      failedLogins,
      rateViolations,
      lastFailedLogin: failedLog ? new Date(failedLog.created_at) : undefined
    };
  } catch (err) {
    console.error('Failed to check suspicious activity:', err);
    return { failedLogins: 0, rateViolations: 0 };
  }
}

/**
 * Flag account if suspicious activity detected
 */
export async function flagSuspiciousAccount(userId: string, reason: string): Promise<boolean> {
  try {
    await log_security_event(
      'suspicious_activity_detected',
      'user_account',
      'flag_suspicious',
      'blocked',
      { reason, user_id: userId }
    );

    // TODO: Implement account flagging logic
    // Could include: temp disable, send security alert email, etc.

    return true;
  } catch (err) {
    console.error('Failed to flag suspicious account:', err);
    return false;
  }
}
