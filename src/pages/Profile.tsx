import { lazy, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Profile page - routes to user profile component
 * Handles user account settings and profile information
 * Drivers are automatically redirected to /driver/profile
 */
const UserProfile = lazy(() => import("./user/UserProfile"));

export default function Profile() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (role === "driver" || role === "moderator")) {
      navigate("/driver/profile", { replace: true });
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If driver, show nothing while redirecting
  if (role === "driver" || role === "moderator") return null;

  return <UserProfile />;
}
