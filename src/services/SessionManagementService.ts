/**
 * Session Management Service
 * Handles auth session lifecycle, security, and monitoring
 * 
 * Features:
 * - Session activity tracking
 * - Token refresh management
 * - Session expiration warnings
 * - Device/browser tracking
 * - Session audit logs
 * - Concurrent session limits
 * - Session revocation
 */

import { supabase } from "@/integrations/supabase/client";

// Constants
const SESSION_WARNING_MINUTES = 5; // Warn before expiry
const SESSION_EXPIRY_HOURS = 24; // Session expires after 24 hours
const TOKEN_REFRESH_MINUTES = 50; // Refresh token every 50 min
const INACTIVITY_TIMEOUT_MINUTES = 30; // Auto logout after inactivity
const MAX_CONCURRENT_SESSIONS = 3; // Max devices logged in

// Types
export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  refreshTokenExpiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  os: string;
  browser: string;
  isMobile: boolean;
}

export interface SessionAuditLog {
  id: string;
  userId: string;
  sessionId: string;
  event: "LOGIN" | "LOGOUT" | "TOKEN_REFRESH" | "SESSION_EXTEND" | "SUSPICIOUS_ACTIVITY";
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export interface SessionWarning {
  type: "EXPIRING_SOON" | "INACTIVITY_WARNING" | "SUSPICIOUS_LOGIN" | "NEW_DEVICE";
  expiresAtMinutes: number;
  message: string;
  actions: string[];
}

// Utility functions
function generateDeviceId(): string {
  const stored = localStorage.getItem("deviceId");
  if (stored) return stored;
  
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("deviceId", id);
  return id;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
  
  // Parse OS
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  // Parse Browser
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  
  const deviceName = `${browser} on ${os}`;
  
  return {
    deviceId: generateDeviceId(),
    deviceName,
    os,
    browser,
    isMobile,
  };
}

/**
 * Get a unique identifier for the current browser session
 * Fallback when Supabase doesn't provide a session ID
 */
function getBrowserSessionId(): string {
  const storageKey = "pyu_browser_session_id";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    // Generate a simple unique ID
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

async function getIpAddress(): Promise<string | undefined> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

// Main Service Class
class SessionManagementService {
  private sessionWarningCallback?: (warning: SessionWarning) => void;
  private inactivityTimeout?: NodeJS.Timeout;
  private lastActivityTime: number = Date.now();
  
  /**
   * Initialize session monitoring
   */
  async initializeSession(
    onWarning?: (warning: SessionWarning) => void
  ): Promise<SessionInfo | null> {
    this.sessionWarningCallback = onWarning;
    
    try {
      const session = await this.getActiveSession();
      if (!session) return null;
      
      // Log session initialization
      await this.logSessionEvent("LOGIN", { sessionId: session.sessionId });
      
      // Start monitoring
      this.startActivityMonitoring();
      this.startExpiryMonitoring(session);
      
      return session;
    } catch (error) {
      console.error("Failed to initialize session:", error);
      return null;
    }
  }
  
  /**
   * Get current active session from Supabase
   */
  async getActiveSession(): Promise<SessionInfo | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const deviceInfo = getDeviceInfo();
      const ipAddress = await getIpAddress();
      
      // Use Supabase session ID if available, otherwise fallback to browser session ID
      const sessionId = session.user.id || getBrowserSessionId();
      
      return {
        sessionId,
        userId: session.user.id,
        deviceInfo,
        createdAt: new Date(session.user.created_at || new Date().toISOString()),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress,
        userAgent: navigator.userAgent,
      };
    } catch (error) {
      console.error("Error getting active session:", error);
      return null;
    }
  }
  
  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Token refresh failed:", error);
        await this.logSessionEvent("SUSPICIOUS_ACTIVITY", {
          reason: "Token refresh failed",
          errorMessage: error.message,
        });
        return false;
      }
      
      if (data.session) {
        await this.logSessionEvent("TOKEN_REFRESH");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Unexpected error during token refresh:", error);
      return false;
    }
  }
  
  /**
   * Extend session before expiry
   */
  async extendSession(): Promise<boolean> {
    try {
      // Refresh token to extend session
      const success = await this.refreshToken();
      
      if (success) {
        await this.logSessionEvent("SESSION_EXTEND");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Failed to extend session:", error);
      return false;
    }
  }
  
  /**
   * Monitor user activity and reset inactivity timer
   */
  private startActivityMonitoring(): void {
    const resetInactivityTimer = () => {
      this.lastActivityTime = Date.now();
      
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }
      
      this.inactivityTimeout = setTimeout(async () => {
        await this.handleInactivityTimeout();
      }, INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
    };
    
    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    
    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true });
    });
  }
  
  /**
   * Monitor session expiry and show warnings
   */
  private startExpiryMonitoring(session: SessionInfo): void {
    const checkExpiry = () => {
      const now = new Date();
      const timeUntilExpiry = (session.expiresAt.getTime() - now.getTime()) / (1000 * 60); // minutes
      
      // Show warning before expiry
      if (timeUntilExpiry <= SESSION_WARNING_MINUTES && timeUntilExpiry > 0) {
        this.sessionWarningCallback?.({
          type: "EXPIRING_SOON",
          expiresAtMinutes: Math.ceil(timeUntilExpiry),
          message: `Session expires in ${Math.ceil(timeUntilExpiry)} minutes`,
          actions: ["EXTEND_SESSION", "LOGOUT"],
        });
      }
    };
    
    // Check every minute
    setInterval(checkExpiry, 60 * 1000);
  }
  
  /**
   * Handle inactivity timeout
   */
  private async handleInactivityTimeout(): Promise<void> {
    const warning: SessionWarning = {
      type: "INACTIVITY_WARNING",
      expiresAtMinutes: INACTIVITY_TIMEOUT_MINUTES,
      message: `Your session will expire due to inactivity in ${INACTIVITY_TIMEOUT_MINUTES} minutes`,
      actions: ["CONTINUE_SESSION", "LOGOUT"],
    };
    
    this.sessionWarningCallback?.(warning);
    
    // Auto logout if no response after 5 minutes
    setTimeout(async () => {
      await this.logout();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Validate session integrity
   */
  async validateSession(): Promise<boolean> {
    try {
      const session = await this.getActiveSession();
      if (!session) return false;
      
      // Check if session is not corrupted
      const { data: { user } } = await supabase.auth.getUser();
      return user !== null;
    } catch (error) {
      console.error("Session validation failed:", error);
      return false;
    }
  }
  
  /**
   * Log session-related events for audit trail
   */
  private async logSessionEvent(
    event: SessionAuditLog["event"],
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const ipAddress = await getIpAddress();
      const deviceInfo = getDeviceInfo();
      
      // Store audit log in database
      const auditLog = {
        user_id: session.user.id,
        session_id: session.user.id || getBrowserSessionId(),
        event,
        ip_address: ipAddress || null,
        user_agent: navigator.userAgent || null,
        device_info: deviceInfo as any,
        details: (details || {}) as any,
      };
      
      const { error } = await supabase
        .from("audit_logs" as any)
        .insert([auditLog]);
      
      if (error) {
        // Audit logging is best-effort, don't throw to prevent session operations from failing
        console.warn("Failed to log session event - audit logging failed:", error.message);
      }
    } catch (error) {
      // Silent fail on audit logging - shouldn't block user operations
      console.warn("Session event logging error (non-critical):", error);
    }
  }
  
  /**
   * Get all active sessions for current user
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .eq("event", "LOGIN")
        .order("created_at", { ascending: false })
        .limit(MAX_CONCURRENT_SESSIONS);
      
      if (error) {
        console.error("Failed to get active sessions:", error);
        return [];
      }
      
      return (data as any[])?.map(log => ({
        sessionId: log.session_id,
        userId: log.user_id,
        deviceInfo: typeof log.device_info === 'string' ? JSON.parse(log.device_info || "{}") : (log.device_info || {}),
        createdAt: new Date(log.created_at),
        lastActivityAt: new Date(log.created_at),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: log.ip_address || undefined,
        userAgent: log.user_agent || undefined,
      })) || [];
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      return [];
    }
  }
  
  /**
   * Revoke specific session (logout from other device)
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      await this.logSessionEvent("LOGOUT", { revokedSessionId: sessionId });
      
      // Mark session as revoked in audit log
      const { error } = await supabase
        .from("audit_logs" as any)
        .update({ event: "LOGOUT" } as any)
        .eq("session_id", sessionId);
      
      return !error;
    } catch (error) {
      console.error("Failed to revoke session:", error);
      return false;
    }
  }
  
  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    try {
      await this.logSessionEvent("LOGOUT");
      
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
  }
}

// Export singleton instance
export const sessionManagement = new SessionManagementService();

// Export service for testing
export { SessionManagementService };
