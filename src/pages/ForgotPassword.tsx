import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Masukkan email Anda");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if email verification is required
      const { data: authSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "auth_settings")
        .maybeSingle();
      
      const settings = (authSetting?.value as any) || { email_verification_required: true };
      const emailVerificationRequired = settings.email_verification_required;

      // 2. If verification is NOT required, proactively confirm the email
      // so that Supabase doesn't block sending the reset link to unconfirmed users.
      if (!emailVerificationRequired) {
        console.log("Proactively confirming email for reset password (verification not required)...");
        await supabase.functions.invoke("register-user", {
          body: { 
            action: "confirm_by_email",
            email 
          },
        });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Link reset password telah dikirim ke email Anda");
      setSent(true);
    } catch (err: any) {
      toast.error("Error: " + (err.message || "Gagal mengirim link reset"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="gradient-primary px-6 pt-16 pb-12 rounded-b-3xl">
        <button
          onClick={() => navigate("/auth")}
          className="mb-6 flex items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium"
        >
          <ArrowLeft size={16} /> Kembali ke Login
        </button>
        <div className="flex items-center gap-3 mb-4">
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-12 h-12 rounded-xl" />
          <h1 className="text-3xl font-extrabold text-primary-foreground">PYU GO</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm">Reset Password</p>
      </div>

      {sent ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-green-50 p-6 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Email Terkirim!</h2>
              <p className="text-muted-foreground text-sm">
                Kami telah mengirimkan link reset password ke:<br />
                <span className="font-semibold">{email}</span>
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900">
                <strong>📧 Langkah Berikutnya:</strong><br />
                1. Buka email Anda<br />
                2. Klik link "Reset Password"<br />
                3. Masukkan password baru Anda<br />
                4. Kemudian bisa login
              </p>
            </div>
            <div className="space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">Tidak menerima email?</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Kirim Ulang
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleRequestReset}
          className="flex-1 px-6 pt-8 pb-8 max-w-md mx-auto w-full space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email Terdaftar</Label>
            <Input
              id="email"
              type="email"
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            Masukkan email yang Anda gunakan saat mendaftar. Kami akan mengirimkan link reset
            password ke email tersebut.
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground font-semibold"
            size="lg"
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </Button>
        </form>
      )}
    </div>
  );
}
