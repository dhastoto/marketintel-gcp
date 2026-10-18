import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPlanBadgeClass, getPlanLabel } from "@/lib/plan-utils";

const Settings = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [businessName, setBusinessName] = useState(profile?.business_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, business_name: businessName, phone }).eq("id", profile.id);
    if (error) toast.error(error.message);
    else { toast.success("Profil berhasil disimpan"); refreshProfile(); }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setChangingPassword(false);
  };

  const currentPlanLabel = getPlanLabel(profile?.plan);
  const currentPlanClassName = getPlanBadgeClass(profile?.plan);

  // Check if user logged in via OAuth (no password change needed)
  const isOAuthUser = user?.app_metadata?.provider && user.app_metadata.provider !== "email";

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up space-y-6">
      <h1 className="text-2xl font-bold">Pengaturan</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
          <TabsTrigger value="subscription">Langganan</TabsTrigger>
          <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Informasi Profil</h2>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
                <p className="mt-1 text-xs text-muted-foreground">Email tidak dapat diubah</p>
              </div>
              <div>
                <Label>Nama Lengkap</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Nama Bisnis</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nama bisnis Anda" />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gradient-amber border-0 text-accent-foreground hover:opacity-90">
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Ubah Password</h2>
            {isOAuthUser ? (
              <p className="text-sm text-muted-foreground">Anda login menggunakan Google. Pengelolaan password dilakukan melalui akun Google Anda.</p>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label>Password Baru</Label>
                  <div className="relative">
                    <Input type={showNewPassword ? "text" : "password"} placeholder="Minimal 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Konfirmasi Password Baru</Label>
                  <Input type={showNewPassword ? "text" : "password"} placeholder="Ulangi password baru" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={changingPassword} className="gradient-amber border-0 text-accent-foreground hover:opacity-90">
                  {changingPassword ? "Mengubah..." : "Ubah Password"}
                </Button>
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Paket Saat Ini</h2>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Badge className={currentPlanClassName}>{currentPlanLabel}</Badge>
              <span className="text-sm text-muted-foreground">Kredit tersisa: <span className="font-bold text-foreground">{profile?.credits_remaining}</span></span>
            </div>
            <Button onClick={() => navigate("/app/upgrade")} className="mt-4 gradient-amber border-0 text-accent-foreground hover:opacity-90">
              <Crown className="mr-1.5 h-4 w-4" /> Upgrade Plan
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Preferensi Notifikasi</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Email analisis selesai</div>
                  <div className="text-xs text-muted-foreground">Terima email saat analisis Anda selesai diproses</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Newsletter tips bisnis</div>
                  <div className="text-xs text-muted-foreground">Tips & insight bisnis mingguan</div>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
