import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Home, PlusCircle, FolderOpen, Settings, LogOut, ShoppingBag, Bell, Search, Lightbulb, FileText, Receipt, Store } from "lucide-react";
import { Input } from "@/components/ui/input";

const menuItems = [
  { title: "Dashboard", url: "/app/dashboard", icon: Home },
  { title: "Analisis Baru", url: "/app/analysis/new", icon: PlusCircle },
  { title: "Cari Peluang", url: "/app/food-opportunity", icon: Lightbulb },
  { title: "Proyek Saya", url: "/app/projects", icon: FolderOpen },
  { title: "Direktori Toko", url: "/app/directory", icon: Store },
  { title: "Kredit & Paket", url: "/app/my-reports", icon: FileText },
  { title: "Riwayat Bayar", url: "/app/my-transactions", icon: Receipt },
  { title: "Pengaturan", url: "/app/settings", icon: Settings },
];

function AppSidebarContent() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <div className="flex h-14 items-center px-4">
          {!collapsed && <Logo size="small" />}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-3">
        {!collapsed && (
          <div className="mb-3 rounded-lg bg-sidebar-accent p-3">
            <div className="mb-2 text-xs text-sidebar-foreground/70">
              Beli laporan analisis sesuai kebutuhan Anda.
            </div>
            <Button size="sm" className="w-full gradient-amber border-0 text-xs text-accent-foreground hover:opacity-90" onClick={() => navigate("/harga")}>
              <ShoppingBag className="mr-1 h-3 w-3" /> Lihat Paket
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium text-sidebar-foreground">{profile?.full_name}</div>
            </div>
          )}
          <button onClick={() => { signOut(); navigate("/"); }} className="text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();

  // Generate breadcrumb from path
  const pathParts = location.pathname.split("/").filter(Boolean).slice(1);
  const breadcrumb = pathParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " "));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-14 items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden text-sm text-muted-foreground md:flex items-center gap-1.5">
                {breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span>/</span>}
                    <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>{b}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari..." className="h-8 w-48 pl-9 text-sm" />
              </div>
              <button className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </button>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent/10 text-xs text-accent">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
