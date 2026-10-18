import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isPasswordRecovery, user, loading: authLoading, clearPasswordRecovery } = useAuth();

  // Ready when we know this is a recovery flow OR there is already a session
  // (Supabase may have auto-exchanged the code before we mounted).
  const ready = isPasswordRecovery || (!authLoading && !!user);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Clear recovery flag, sign out, and force fresh login with new password.
    clearPasswordRecovery();
    await supabase.auth.signOut();
    toast.success("Password berhasil diubah! Silakan login dengan password baru.");
    navigate("/login", { replace: true });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan password baru Anda</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">Memverifikasi link reset... Jika tidak berhasil, silakan minta link reset baru dari halaman login.</p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="password">Password Baru</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm">Konfirmasi Password</Label>
                <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="Ulangi password baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" disabled={loading}>
                {loading ? "Memproses..." : "Ubah Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
