import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  BarChart3, Users, CreditCard, TrendingUp, FolderOpen, FileText,
  Settings, Key, DollarSign, Ruler, ClipboardList, LogOut, ArrowLeft,
  ChevronLeft, ChevronRight, Shield, Package, Settings2, Activity, Upload, PenSquare, Inbox, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const menuSections = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", icon: BarChart3, path: "/admin/dashboard" },
      { title: "Pengguna", icon: Users, path: "/admin/users" },
      { title: "Transaksi", icon: CreditCard, path: "/admin/transactions" },
      { title: "Analytics", icon: TrendingUp, path: "/admin/analytics" },
    ],
  },
  {
    label: "KONTEN",
    items: [
      { title: "Semua Proyek", icon: FolderOpen, path: "/admin/projects" },
    ],
  },
  {
    label: "MONETISASI",
    items: [
      { title: "Produk & Harga", icon: Package, path: "/admin/products" },
      { title: "Promo Code", icon: Tag, path: "/admin/promo" },
    ],
  },
  {
    label: "FOODINTEL",
    items: [
      { title: "Dashboard Analytics", icon: TrendingUp, path: "/admin/foodintel" },
      { title: "Log Analisis", icon: ClipboardList, path: "/admin/foodintel/analyses" },
      { title: "Kelola Data BPS", icon: FileText, path: "/admin/foodintel/data" },
      { title: "Import Data BPS", icon: Upload, path: "/admin/foodintel/import" },
    ],
  },
  {
    label: "BLOG",
    items: [
      { title: "Semua Artikel", icon: PenSquare, path: "/admin/blog" },
    ],
  },
  {
    label: "KOMUNIKASI",
    items: [
      { title: "Pesan Kontak", icon: Inbox, path: "/admin/messages" },
    ],
  },
  {
    label: "SISTEM",
    items: [
      { title: "Pengaturan", icon: Settings, path: "/admin/settings" },
      { title: "API Keys", icon: Key, path: "/admin/settings/api-keys" },
      { title: "Pricing & Kredit", icon: DollarSign, path: "/admin/settings/pricing" },
      { title: "Limit & Kuota", icon: Ruler, path: "/admin/settings/limits" },
      { title: "AI Prompts", icon: FileText, path: "/admin/settings/ai-prompts" },
      { title: "Engine Params", icon: Settings2, path: "/admin/engine-parameters" },
      { title: "Tracking", icon: Activity, path: "/admin/settings/tracking" },
      { title: "Audit Log", icon: ClipboardList, path: "/admin/audit-log" },
    ],
  },
];

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { role } = useAdminRole();

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#0F172A] text-slate-400 transition-all duration-300 relative",
        collapsed ? "w-16" : "w-[250px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-700/50">
        <Shield className="h-6 w-6 text-indigo-400 shrink-0" />
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-lg">MarketIntel</span>
            <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-2 text-[10px] font-semibold tracking-wider text-slate-500">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500"
                      : "hover:bg-slate-800 hover:text-slate-200"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-700/50 p-4 space-y-3">
        <Link
          to="/app/dashboard"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {!collapsed && <span>Ke App User</span>}
        </Link>

        {!collapsed && profile && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
              {profile.full_name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{profile.full_name}</p>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                {role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 bg-[#0F172A] border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
