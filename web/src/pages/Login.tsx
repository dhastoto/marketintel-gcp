import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      const redirect = searchParams.get("redirect");
      if (redirect) {
        // Preserve other query params (buy, bundle, etc.)
        const extraParams = new URLSearchParams();
        searchParams.forEach((value, key) => {
          if (key !== "redirect") extraParams.set(key, value);
        });
        const qs = extraParams.toString();
        navigate(qs ? `${redirect}?${qs}` : redirect);
      } else {
        navigate("/app/dashboard");
      }
    }
    setLoading(false);
  };

  // Google login removed - not properly integrated with Lovable Cloud

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-2xl font-bold">Selamat Datang Kembali</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk ke akun MarketIntel Anda</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">Lupa password?</Link>
            </div>
            <Button type="submit" className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/register" className="font-medium text-accent hover:underline">Daftar gratis</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
