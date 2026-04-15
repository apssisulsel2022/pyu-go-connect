import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Role } from "@/lib/rbac";

export function useAuth() {
  const navigate = useNavigate();
  const { setSession, setLoading, setRole, user, session, isLoading, isGuest, role, permissions } = useAuthStore();

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error || !data) {
        setRole("user"); // Default role
      } else {
        setRole(data.role as Role);
      }
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      setRole("user");
    }
  }, [setRole]);

  const handleAuthError = useCallback(async (error: any) => {
    if (error?.message?.includes("Invalid Refresh Token") || error?.message?.includes("Refresh Token Not Found")) {
      console.warn("Refresh token invalid, signing out user");
      await supabase.auth.signOut();
      useAuthStore.getState().reset();
      navigate("/auth");
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Attempt to recover session from URL (after OAuth redirect)
        const { data: { session: urlSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          if (mounted) {
            setSession(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        // Validate that session has both access and refresh tokens
        if (urlSession && (!urlSession.access_token || !urlSession.refresh_token)) {
          console.warn("Session missing tokens, clearing invalid session");
          await supabase.auth.signOut();
          if (mounted) {
            setSession(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setSession(urlSession);
          if (urlSession?.user) {
            await fetchUserRole(urlSession.user.id);
          } else {
            setRole(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        if (mounted) {
          setSession(null);
          setRole(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sessionData) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED_ERROR") {
        setSession(null);
        setRole(null);
      } else if (sessionData) {
        // Validate session has required tokens before setting
        if (sessionData.access_token && sessionData.refresh_token) {
          setSession(sessionData);
          try {
            await fetchUserRole(sessionData.user.id);
          } catch (err) {
            console.error("Failed to fetch role on auth state change:", err);
          }
        } else {
          console.warn("Session missing tokens on state change, signing out");
          await supabase.auth.signOut();
          setSession(null);
          setRole(null);
        }
      }
      
      setLoading(false);
    });

    // Set up periodic token refresh to prevent expiration
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.warn("Token refresh failed:", error.message);
          handleAuthError(error);
          return;
        }

        // Validate refreshed session has tokens
        if (currentSession && (!currentSession.access_token || !currentSession.refresh_token)) {
          console.warn("Refreshed session missing tokens");
          await supabase.auth.signOut();
          handleAuthError(new Error("Session missing tokens after refresh"));
        }
      } catch (err) {
        console.error("Error in token refresh interval:", err);
        handleAuthError(err);
      }
    }, 1000 * 60 * 50); // Refresh every 50 minutes

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [setSession, setLoading, setRole, fetchUserRole, handleAuthError]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: authSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "auth_settings")
        .maybeSingle();
      
      const settings = (authSetting?.value as any) || { email_verification_required: true };
      const emailVerificationRequired = settings.email_verification_required;

      let { data, error } = await supabase.auth.signInWithPassword({ email, password });

      // If email is not confirmed but verification is NOT required by app settings,
      // we attempt to auto-confirm the user via Edge Function and retry sign-in.
      if (error && error.message.toLowerCase().includes("email not confirmed") && !emailVerificationRequired) {
        console.log("Email not confirmed but verification is not required. Attempting auto-confirm...");
        
        // 1. Get user ID from the error or by searching (Supabase might not return user ID in this error)
        // Since we can't get user ID easily here without being logged in, 
        // we'll need the Edge Function to look up the user by email.
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke("register-user", {
          body: { 
            action: "confirm_by_email", // New action
            email 
          },
        });

        if (!confirmError) {
          // Retry sign-in
          const retry = await supabase.auth.signInWithPassword({ email, password });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        handleAuthError(error);
      }
      return { error };
    } catch (err) {
      handleAuthError(err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, options?: { phone?: string; license_number?: string; isDriver?: boolean }) => {
    try {
      // 1. Check for email verification setting
      const { data: authSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "auth_settings")
        .maybeSingle();
      
      const settings = (authSetting?.value as any) || { email_verification_required: true };
      const emailVerificationRequired = settings.email_verification_required;

      // 2. Validate driver duplication before signup
      if (options?.isDriver) {
        if (options.phone) {
          const { data: existingPhone } = await supabase
            .from("drivers")
            .select("id")
            .eq("phone", options.phone)
            .maybeSingle();
          if (existingPhone) {
            return { error: new Error("Nomor telepon sudah terdaftar sebagai driver.") };
          }
        }
        if (options.license_number) {
          const { data: existingLicense } = await supabase
            .from("drivers")
            .select("id")
            .eq("license_number", options.license_number)
            .maybeSingle();
          if (existingLicense) {
            return { error: new Error("Nomor SIM sudah terdaftar.") };
          }
        }
      }

      // 3. Signup — use Edge Function if verification is disabled for auto-confirm
      if (!emailVerificationRequired) {
        const { data, error } = await supabase.functions.invoke("register-user", {
          body: { 
            email, 
            password, 
            fullName, 
            options: {
              ...options,
              email_confirm: true 
            }
          },
        });

        if (error) {
          handleAuthError(error);
          return { error };
        }
        
        // If successful, log in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          handleAuthError(signInError);
          return { error: signInError };
        }
        
        return { error: null, success: true };
      }

      // Default Signup with Email Verification Required
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: options?.phone,
            license_number: options?.license_number,
            is_driver: options?.isDriver || false,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        handleAuthError(error);
        return { error };
      }
      return { error: null };
    } catch (err) {
      handleAuthError(err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      useAuthStore.getState().reset();
      navigate("/auth");
    } catch (err) {
      console.error("Sign out error:", err);
      useAuthStore.getState().reset();
      navigate("/auth");
    }
  };

  // Manual refresh function for explicit token refresh
  const refreshToken = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        handleAuthError(error);
        return { success: false, error };
      }
      return { success: true, session: data.session };
    } catch (err) {
      handleAuthError(err);
      return { success: false, error: err };
    }
  };

  return { user, session, isLoading, isGuest, role, permissions, signIn, signUp, signOut, refreshToken };
}
