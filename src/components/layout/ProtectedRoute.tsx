import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { Permission, Role } from "@/lib/rbac";

interface ProtectedRouteProps {
  requiredRole?: Role;
  requiredPermission?: Permission | Permission[];
}

export function ProtectedRoute({ requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading: authLoading, role } = useAuth();
  const { checkPermission, checkAnyPermission } = useRBAC();
  const location = useLocation();

  // If not authenticated, redirect to login immediately
  // Don't wait for loading to complete - if no user, must be unauthenticated
  if (!user && !authLoading) {
    const loginPath = location.pathname.startsWith("/driver") ? "/driver/auth" : "/auth";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If still loading and no user yet, show loading
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Wait for role to be loaded before checking permissions
  // This fixes the race condition where role is undefined during refresh
  if (user && !role && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User is authenticated - check role (only after role is loaded)
  if (user && role && requiredRole) {
    const isDriverEquivalent = (role === "driver" || role === "moderator") && 
                               (requiredRole === "driver" || requiredRole === "moderator");
    
    if (role !== requiredRole && role !== "admin" && !isDriverEquivalent) {
      return <Navigate to="/forbidden" state={{ from: location }} replace />;
    }
  }

  // Check permission if required
  if (requiredPermission) {
    const isAllowed = Array.isArray(requiredPermission)
      ? checkAnyPermission(requiredPermission)
      : checkPermission(requiredPermission);

    if (!isAllowed) {
      return <Navigate to="/forbidden" state={{ from: location }} replace />;
    }
  }

  // Render nested routes
  return <Outlet />;
}
