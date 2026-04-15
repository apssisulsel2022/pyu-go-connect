import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Check session on initial mount and redirect if already authenticated
  useEffect(() => {
    if (isLoading) {
      // Still checking session, don't redirect yet
      return;
    }

    // Session check complete
    if (user && role) {
      console.log("[Auth] Active session detected - redirecting to dashboard", { user: user.email, role });
      const from = location.state?.from?.pathname;
      
      // Redirect back to original page if available
      if (from && from !== "/auth" && from !== "/driver/auth") {
        navigate(from, { replace: true });
      } else {
        // Otherwise use default path based on role
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "driver") {
          navigate("/driver", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    }
  }, [user, role, isLoading, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Selamat datang kembali!");
        // ✅ useAuth hook automatically handles role fetching and app routing
        // ✅ No need for manual redirect - let the auth state update trigger navigation
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success("Silakan cek email Anda untuk konfirmasi akun!");
        
        // ✅ Send verification email via edge function
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              full_name: fullName,
              is_driver: false,
            }),
          });
        } catch (emailErr) {
          console.warn("Email notification failed, but user will get verification link via Supabase:", emailErr);
        }
        
        // ✅ Redirect to email verification page
        sessionStorage.setItem("authRedirect", "/auth");
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="gradient-primary px-6 pt-16 pb-12 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-12 h-12 rounded-xl" />
          <h1 className="text-3xl font-extrabold text-primary-foreground">PYU GO</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm">
          {isLogin ? "Masuk ke akun Anda" : "Buat akun baru"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 px-6 pt-8 space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Anda" required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
        </div>

        <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold" size="lg" disabled={loading}>
          {loading ? "Mohon tunggu..." : isLogin ? "Masuk" : "Daftar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold">
            {isLogin ? "Daftar" : "Masuk"}
          </button>
        </p>

        {isLogin && (
          <div className="text-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-slate-500 hover:text-primary font-medium"
            >
              Lupa Password?
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 mb-2">Ingin bergabung sebagai mitra?</p>
          <button 
            type="button" 
            onClick={() => navigate("/driver/auth")} 
            className="text-emerald-600 text-sm font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            Daftar Jadi Driver Partner
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
