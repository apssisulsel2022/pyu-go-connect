import { useAuthStore } from "@/stores/authStore";
import { Permission, hasPermission, hasAnyPermission } from "@/lib/rbac";
import React from "react";

/**
 * Custom hook to check user permissions
 */
export function useRBAC() {
  const { role, permissions } = useAuthStore();

  const checkPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  const checkAnyPermission = (requiredPermissions: Permission[]): boolean => {
    if (!role) return false;
    return hasAnyPermission(role, requiredPermissions);
  };

  const isAdmin = role === "admin";
  const isDriver = role === "driver";
  const isUser = role === "user";

  return {
    role,
    permissions,
    checkPermission,
    checkAnyPermission,
    isAdmin,
    isDriver,
    isUser
  };
}

interface CanProps {
  perform: Permission | Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to wrap elements that require specific permissions
 */
export function Can({ perform, children, fallback = null }: CanProps) {
  const { checkPermission, checkAnyPermission } = useRBAC();

  const isAllowed = Array.isArray(perform)
    ? checkAnyPermission(perform)
    : checkPermission(perform);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
