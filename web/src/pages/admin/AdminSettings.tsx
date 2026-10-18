import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "sonner";
import { Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

interface ConfigItem {
  id: string;
  config_key: string;
  config_value: string | null;
  config_type: string;
  category: string;
  label: string;
  description: string | null;
  is_sensitive: boolean;
}

const tabFromPath: Record<string, string> = {
  '/admin/settings': 'general',
  '/admin/settings/api-keys': 'api_keys',
  '/admin/settings/smtp': 'smtp',
  '/admin/settings/pricing': 'pricing',
  '/admin/settings/limits': 'limits',
  '/admin/settings/ai-prompts': 'ai_prompts',
  '/admin/settings/tracking': 'tracking',
};

export default function AdminSettings() {
  const { isSuperAdmin } = useAdminRole();
  const location = useLocation();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const defaultTab = tabFromPath[location.pathname] || 'general';
  const smtpConfigKeys = [
    'smtp_host',
    'smtp_port',
    'smtp_username',
    'smtp_password',
    'smtp_from_email',
    'smtp_from_name',
    'smtp_encryption',
    'smtp_app_hostname',
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase.from('system_config').select('*').order('category');
    if (error) {
      toast.error('Gagal memuat konfigurasi');
      setLoading(false);
      return;
    }
    const items = (data || []) as unknown as ConfigItem[];
    setConfigs(items);
    const vals: Record<string, string> = {};
    items.forEach(c => { vals[c.config_key] = c.config_value || ''; });
    setEditValues(vals);
    setLoading(false);
  };

  const saveConfig = async (key: string) => {
    if (!isSuperAdmin && ['api_keys', 'pricing'].includes(configs.find(c => c.config_key === key)?.category || '')) {
      toast.error('Hanya Super Admin yang bisa mengubah pengaturan ini');
      return;
    }
    setSaving(key);
    const { error } = await supabase.from('system_config')
      .update({ config_value: editValues[key], updated_at: new Date().toISOString() })
      .eq('config_key', key);
    if (error) toast.error('Gagal menyimpan');
    else toast.success(`${key} berhasil disimpan`);
    setSaving(null);
  };

  const configsByCategory = (cat: string) => {
    if (cat === 'smtp') {
      return configs.filter(c => c.category === 'smtp' || smtpConfigKeys.includes(c.config_key));
    }

    return configs.filter(c => c.category === cat);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="api_keys">API Keys</TabsTrigger>
          <TabsTrigger value="smtp">SMTP Email</TabsTrigger>
          <TabsTrigger value="payment">Pembayaran</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Kredit</TabsTrigger>
          <TabsTrigger value="limits">Limit & Kuota</TabsTrigger>
          <TabsTrigger value="ai_prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="general">Umum</TabsTrigger>
          <TabsTrigger value="notification">Notifikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="api_keys">
          <div className="space-y-4">
            {configsByCategory('api_keys').map(c => (
              <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={!!showSensitive[c.config_key]} onToggleShow={() => setShowSensitive({ ...showSensitive, [c.config_key]: !showSensitive[c.config_key] })} disabled={!isSuperAdmin} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="smtp">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Konfigurasi SMTP</CardTitle>
                <CardDescription>Pengaturan server SMTP untuk pengiriman email (reset password, notifikasi). Jika belum dikonfigurasi, sistem akan menggunakan email bawaan.</CardDescription>
              </CardHeader>
            </Card>
            {configsByCategory('smtp').map(c => {
              const val = editValues[c.config_key] ?? c.config_value ?? '';
              if (c.config_key === 'smtp_encryption') {
                return (
                  <Card key={c.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 mb-1">{c.label}</p>
                          <p className="text-xs text-slate-500 mb-3">{c.description}</p>
                          <div className="flex gap-2">
                            <select
                              value={val}
                              onChange={e => setEditValues(prev => ({ ...prev, [c.config_key]: e.target.value }))}
                              disabled={!isSuperAdmin}
                              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="tls">TLS (Port 587)</option>
                              <option value="ssl">SSL (Port 465)</option>
                              <option value="none">None (Port 25)</option>
                            </select>
                            <Button size="sm" onClick={() => saveConfig(c.config_key)} disabled={saving === c.config_key || !isSuperAdmin} className="bg-indigo-600 text-white hover:bg-indigo-700">
                              {saving === c.config_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Simpan</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <ConfigCard
                  key={c.id}
                  config={c}
                  value={val}
                  onValueChange={v => setEditValues(prev => ({ ...prev, [c.config_key]: v }))}
                  onSave={() => saveConfig(c.config_key)}
                  saving={saving === c.config_key}
                  showValue={!c.is_sensitive || !!showSensitive[c.config_key]}
                  onToggleShow={() => setShowSensitive(prev => ({ ...prev, [c.config_key]: !prev[c.config_key] }))}
                  disabled={!isSuperAdmin}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="space-y-4">
            {configsByCategory('payment').map(c => (
              <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={!c.is_sensitive || !!showSensitive[c.config_key]} onToggleShow={() => setShowSensitive({ ...showSensitive, [c.config_key]: !showSensitive[c.config_key] })} disabled={!isSuperAdmin} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="space-y-4">
            {configsByCategory('pricing').map(c => (
              <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={true} onToggleShow={() => {}} disabled={!isSuperAdmin} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="limits">
          <div className="space-y-4">
            {configsByCategory('limits').map(c => (
              <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={true} onToggleShow={() => {}} disabled={false} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai_prompts">
          <div className="space-y-4">
            {configsByCategory('ai_prompts').map(c => {
              if (c.config_type === 'textarea') {
                return (
                  <Card key={c.id}>
                    <CardContent className="pt-6">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-1">{c.label}</p>
                        <p className="text-xs text-slate-500 mb-3">{c.description}</p>
                        <textarea
                          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={editValues[c.config_key] || ''}
                          onChange={e => setEditValues({ ...editValues, [c.config_key]: e.target.value })}
                          disabled={!isSuperAdmin}
                        />
                        <div className="flex justify-end mt-2">
                          <Button size="sm" onClick={() => saveConfig(c.config_key)} disabled={saving === c.config_key || !isSuperAdmin} className="bg-indigo-600 text-white hover:bg-indigo-700">
                            {saving === c.config_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Simpan</>}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={true} onToggleShow={() => {}} disabled={!isSuperAdmin} />;
            })}
          </div>
        </TabsContent>

        <TabsContent value="tracking">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Google Analytics & Meta Pixel</CardTitle>
                <CardDescription>Konfigurasi tracking ID untuk SEO dan digital marketing.</CardDescription>
              </CardHeader>
            </Card>
            {configsByCategory('tracking').map(c => {
              const val = editValues[c.config_key] ?? c.config_value ?? '';
              return (
                <ConfigCard
                  key={c.id}
                  config={c}
                  value={val}
                  onValueChange={v => setEditValues(prev => ({ ...prev, [c.config_key]: v }))}
                  onSave={() => saveConfig(c.config_key)}
                  saving={saving === c.config_key}
                  showValue={showSensitive[c.config_key] || false}
                  onToggleShow={() => setShowSensitive(prev => ({ ...prev, [c.config_key]: !prev[c.config_key] }))}
                  disabled={!isSuperAdmin}
                />
              );
            })}
            {configsByCategory('tracking').length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada konfigurasi tracking.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="space-y-4">
            {configsByCategory('general').map(c => {
              if (c.config_type === 'boolean') {
                return (
                  <Card key={c.id}>
                    <CardContent className="pt-6 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{c.label}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={editValues[c.config_key] === 'true'} onCheckedChange={v => { setEditValues({ ...editValues, [c.config_key]: v.toString() }); }} disabled={!isSuperAdmin} />
                        <Button size="sm" onClick={() => saveConfig(c.config_key)} disabled={saving === c.config_key} className="bg-indigo-600 text-white hover:bg-indigo-700">
                          {saving === c.config_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={true} onToggleShow={() => {}} disabled={!isSuperAdmin} />;
            })}
          </div>
        </TabsContent>

        <TabsContent value="notification">
          <div className="space-y-4">
            {configsByCategory('notification').map(c => (
              <ConfigCard key={c.id} config={c} value={editValues[c.config_key]} onValueChange={v => setEditValues({ ...editValues, [c.config_key]: v })} onSave={() => saveConfig(c.config_key)} saving={saving === c.config_key} showValue={true} onToggleShow={() => {}} disabled={false} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigCard({ config, value, onValueChange, onSave, saving, showValue, onToggleShow, disabled }: {
  config: ConfigItem; value: string; onValueChange: (v: string) => void; onSave: () => void;
  saving: boolean; showValue: boolean; onToggleShow: () => void; disabled: boolean;
}) {
  const isConfigured = !!value;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-slate-900">{config.label}</p>
              {config.is_sensitive && (
                isConfigured
                  ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Terkonfigurasi</Badge>
                  : <Badge className="bg-amber-100 text-amber-700 text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Belum dikonfigurasi</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">{config.description}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                {config.config_type === 'select' && config.config_key === 'midtrans_mode' ? (
                  <select
                    value={value}
                    onChange={e => onValueChange(e.target.value)}
                    disabled={disabled}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                    <option value="auto">Auto (deteksi dari key prefix)</option>
                  </select>
                ) : (
                  <Input
                    type={config.is_sensitive && !showValue ? 'password' : 'text'}
                    value={value}
                    onChange={e => onValueChange(e.target.value)}
                    className="h-9 text-sm pr-10"
                    disabled={disabled}
                  />
                )}
                {config.is_sensitive && config.config_type !== 'select' && (
                  <button onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <Button size="sm" onClick={onSave} disabled={saving || disabled} className="bg-indigo-600 text-white hover:bg-indigo-700">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />Simpan</>}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
