import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const OFFICIAL_APP_URL = "https://www.marketintel.id";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }
    if (!agreed) {
      toast.error("Harap setujui Syarat & Ketentuan");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: OFFICIAL_APP_URL,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Akun berhasil dibuat. Silakan cek email untuk link verifikasi.");
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-2xl font-bold">Buat Akun Gratis</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mulai analisis pasar pertama Anda</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Ulangi password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">Saya setuju dengan Syarat & Ketentuan</Label>
            </div>
            <Button type="submit" className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" disabled={loading}>
              {loading ? "Memproses..." : "Buat Akun Gratis"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
