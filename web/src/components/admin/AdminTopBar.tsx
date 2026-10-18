import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const breadcrumbMap: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Pengguna",
  "/admin/transactions": "Transaksi",
  "/admin/analytics": "Analytics",
  "/admin/projects": "Semua Proyek",
  "/admin/settings": "Pengaturan",
  "/admin/settings/api-keys": "API Keys",
  "/admin/settings/pricing": "Pricing & Kredit",
  "/admin/settings/limits": "Limit & Kuota",
  "/admin/audit-log": "Audit Log",
};

export function AdminTopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const location = useLocation();
  const pageName = breadcrumbMap[location.pathname] || "Admin";

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <nav className="text-sm text-slate-500">
          <span>Admin</span>
          <span className="mx-2">›</span>
          <span className="text-slate-900 font-medium">{pageName}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari user, proyek..."
            className="pl-9 w-64 h-9 text-sm bg-slate-50 border-slate-200"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-500" />
        </Button>

        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 hidden sm:inline">System Online</span>
        </div>
      </div>
    </header>
  );
}
