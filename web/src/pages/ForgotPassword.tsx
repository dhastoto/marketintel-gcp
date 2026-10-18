import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OFFICIAL_APP_URL = "https://www.marketintel.id";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-reset-email", {
        body: {
          email: email.trim(),
          redirectTo: `${OFFICIAL_APP_URL}/reset-password`,
        },
      });

      // Functions client surfaces non-2xx as `error`; the JSON body is in `data`
      // because our function returns JSON for both success and failure.
      const apiError = (data && (data as any).error) || (error as any)?.context?.error;
      if (apiError) {
        toast.error(apiError);
      } else if (error) {
        toast.error("Gagal mengirim email reset password");
      } else {
        setSent(true);
        toast.success("Link reset password telah dikirim ke email Anda");
      }
    } catch {
      toast.error("Terjadi kesalahan, coba lagi nanti");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-2xl font-bold">Lupa Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan email Anda untuk menerima link reset password</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Link reset password telah dikirim ke <span className="font-medium text-foreground">{email}</span>. Silakan cek inbox atau folder spam Anda.</p>
              <Link to="/login" className="text-sm text-accent hover:underline">← Kembali ke halaman login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-accent hover:underline">← Kembali ke login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
