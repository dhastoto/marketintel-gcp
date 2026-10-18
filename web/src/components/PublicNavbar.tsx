import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Fitur", href: "/fitur", external: false },
  { label: "Harga", href: "/harga", external: false },
  { label: "FAQ", href: "/faq", external: false },
  { label: "Kontak", href: "/kontak", external: false },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/"><Logo /></Link>
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                to={l.href}
                className={`text-sm transition-colors hover:text-foreground ${
                  location.pathname === l.href ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {l.label}
              </Link>
            )
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Button size="sm" className="gradient-amber rounded-full border-0 text-accent-foreground hover:opacity-90" asChild>
              <Link to="/app/dashboard"><LayoutDashboard className="mr-1.5 h-4 w-4" />Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button size="sm" className="gradient-amber rounded-full border-0 text-accent-foreground hover:opacity-90" asChild>
                <Link to="/register">Mulai Gratis</Link>
              </Button>
            </>
          )}
          <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 py-3 space-y-2">
          {navLinks.map((l) => (
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            )
          ))}
          {isLoggedIn ? (
            <Link to="/app/dashboard" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-foreground">
              Masuk
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
