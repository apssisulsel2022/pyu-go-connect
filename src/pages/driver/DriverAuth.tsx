import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car, ArrowLeft } from "lucide-react";

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { signIn, signUp, user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Check session on initial mount and redirect if already authenticated as driver
  useEffect(() => {
    if (isLoading) {
      // Still checking session, don't redirect yet
      return;
    }

    // Session check complete
    if (user && role === "driver") {
      console.log("[DriverAuth] Active driver session detected - redirecting to driver dashboard", { user: user.email, role });
      const from = location.state?.from?.pathname;
      
      // Redirect back to original driver page if available
      if (from && from.startsWith("/driver")) {
        navigate(from, { replace: true });
      } else {
        // Otherwise default to driver dashboard
        navigate("/driver", { replace: true });
      }
    }
  }, [user, role, isLoading, location.state, navigate]);

  // Validation helpers
  const validatePhone = (phoneNumber: string): string | null => {
    // Indonesia phone format: +62XXXXXXXXXX or 08XXXXXXXXXX or 62XXXXXXXXXX
    const phoneRegex = /^(\+62|62|0)[0-9]{9,11}$/;
    if (!phoneNumber) return "Nomor telepon diperlukan";
    const cleanedPhone = phoneNumber.replace(/\s/g, "");
    if (!phoneRegex.test(cleanedPhone)) {
      return "Format: +6281234567 atau 0812345678";
    }
    return null;
  };

  const validateLicense = (license: string): string | null => {
    // Indonesia SIM format: 8-12 digits
    const licenseRegex = /^\d{8,12}$/;
    if (!license) return "Nomor SIM diperlukan";
    if (!licenseRegex.test(license)) {
      return "Nomor SIM harus 8-12 digit (contoh: 12345678)";
    }
    return null;
  };

  const validateDriverForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) errors.fullName = "Nama lengkap diperlukan";
    if (!email.includes("@")) errors.email = "Email tidak valid";
    if (password.length < 6) errors.password = "Password minimal 6 karakter";

    const phoneError = validatePhone(phone);
    if (phoneError) errors.phone = phoneError;

    const licenseError = validateLicense(licenseNumber);
    if (licenseError) errors.license = licenseError;

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form if registering
    if (!isLogin) {
      const errors = validateDriverForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        const firstError = Object.values(errors)[0];
        toast.error(firstError);
        return;
      }
    }

    setFormErrors({});
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Selamat datang kembali, Kapten!");
      } else {
        const { error } = await signUp(email, password, fullName, {
          phone,
          license_number: licenseNumber,
          isDriver: true,
        });
        if (error) throw error;
        toast.success("Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.");
        
        // ✅ Send verification email via edge function
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              full_name: fullName,
              is_driver: true,
            }),
          });
        } catch (emailErr) {
          console.warn("Email notification failed, but user will get verification link via Supabase:", emailErr);
        }
        
        // ✅ Redirect to email verification page
        sessionStorage.setItem("authRedirect", "/driver/auth");
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="bg-emerald-600 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <Car size={200} />
        </div>
        
        <button 
          onClick={() => navigate("/")} 
          className="mb-6 text-white/80 hover:text-white flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Kembali ke User App
        </button>

        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="bg-white p-2 rounded-xl shadow-inner">
            <Car className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PYU DRIVER</h1>
        </div>
        <p className="text-emerald-50/90 text-sm font-medium relative z-10">
          {isLogin ? "Masuk ke Dashboard Driver" : "Daftar sebagai Driver Partner"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="flex-1 px-6 -mt-4 pb-10">
          <form 
          onSubmit={handleSubmit} 
          className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-5"
        >
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-slate-700 font-semibold ml-1">Nama Lengkap</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Nama sesuai KTP" 
                  className={`rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${
                    formErrors.fullName ? "border-red-500" : ""
                  }`}
                  required 
                />
                {formErrors.fullName && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.fullName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-700 font-semibold ml-1">Nomor Telepon</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="0812xxxx" 
                  className={`rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${
                    formErrors.phone ? "border-red-500" : ""
                  }`}
                  required 
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber" className="text-slate-700 font-semibold ml-1">Nomor SIM</Label>
                <Input 
                  id="licenseNumber" 
                  value={licenseNumber} 
                  onChange={(e) => setLicenseNumber(e.target.value)} 
                  placeholder="Nomor SIM aktif" 
                  className={`rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${
                    formErrors.license ? "border-red-500" : ""
                  }`}
                  required 
                />
                {formErrors.license && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.license}</p>
                )}
              </div>
            </>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700 font-semibold ml-1">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="driver@email.com" 
              className={`rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${
                formErrors.email ? "border-red-500" : ""
              }`}
              required 
            />
            {formErrors.email && (
              <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700 font-semibold ml-1">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className={`rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${
                formErrors.password ? "border-red-500" : ""
              }`}
              required 
              minLength={6} 
            />
            {formErrors.password && (
              <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md transition-all active:scale-[0.98]" 
            disabled={loading}
          >
            {loading ? "Memproses..." : isLogin ? "Masuk Sekarang" : "Daftar Driver"}
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-500">
              {isLogin ? "Belum jadi partner?" : "Sudah punya akun?"}{" "}
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-emerald-600 font-bold hover:underline"
              >
                {isLogin ? "Daftar Driver" : "Masuk"}
              </button>
            </p>
          </div>
        </form>
        
        <div className="mt-8 text-center px-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi PYU Partner.
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
