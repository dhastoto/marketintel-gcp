import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const footerLinks = {
  Fitur: [
    { label: "Analisis Lokasi", href: "/fitur" },
    { label: "Cari Peluang", href: "/fitur" },
    { label: "Harga", href: "/harga" },
  ],
  Perusahaan: [
    { label: "Tentang Kami", href: "/tentang" },
    { label: "FAQ", href: "/faq" },
    { label: "Kontak", href: "/kontak" },
  ],
  Legal: [
    { label: "Syarat & Ketentuan", href: "/terms" },
    { label: "Kebijakan Privasi", href: "/privacy" },
  ],
};

export function PublicFooter() {
  return (
    <footer className="gradient-navy-dark border-t py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-primary-foreground/50">
              Platform analisis pasar berbasis data untuk UMKM Indonesia
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-primary-foreground/10 pt-6 text-center text-sm text-primary-foreground/40">
          © {new Date().getFullYear()} MarketIntel. Data: BPS Susenas 2025.
        </div>
      </div>
    </footer>
  );
}
