import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}
