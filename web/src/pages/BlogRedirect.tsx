import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BLOG_BASE = "https://blog.marketintel.id";

const BlogRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    // Strip leading "/blog" and forward the remaining path + search + hash
    const rest = location.pathname.replace(/^\/blog/, "") || "/";
    const target = `${BLOG_BASE}${rest}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      <p>Mengalihkan ke blog…</p>
    </div>
  );
};

export default BlogRedirect;
