import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "Semua" },
  { key: "insight", label: "Insight" },
  { key: "tutorial", label: "Tutorial" },
  { key: "peluang_kota", label: "Peluang Kota" },
  { key: "update", label: "Update" },
];

const CATEGORY_LABELS: Record<string, string> = {
  insight: "Insight",
  tutorial: "Tutorial",
  peluang_kota: "Peluang Kota",
  update: "Update",
};

const PER_PAGE = 10;

const BlogListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("cat") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", category, page],
    queryFn: async () => {
      let q = supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, category, published_at, tags", { count: "exact" })
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

      if (category !== "all") q = q.eq("category", category);
      const { data: posts, count, error } = await q;
      if (error) throw error;
      return { posts: posts || [], total: count || 0 };
    },
    staleTime: 60_000,
  });

  const totalPages = Math.ceil((data?.total || 0) / PER_PAGE);

  return (
    <PublicLayout>
      <SEOHead
        title="Blog MarketIntel — Insight & Peluang Bisnis Makanan"
        description="Analisis pasar, peluang bisnis makanan, dan tips UMKM berbasis data BPS Susenas 2025 di 514 kabupaten/kota Indonesia."
        canonical="/blog"
      />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Blog MarketIntel</h1>
        <p className="text-muted-foreground mb-8">Insight, analisis pasar, dan peluang bisnis makanan di Indonesia</p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <Button
              key={c.key}
              size="sm"
              variant={category === c.key ? "default" : "outline"}
              onClick={() => setSearchParams({ cat: c.key, page: "1" })}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : (data?.posts || []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Belum ada artikel untuk kategori ini.</div>
        ) : (
          <div className="space-y-6">
            {data!.posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="block rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[post.category] || post.category}</Badge>
                    <span>•</span>
                    <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</span>
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                  <span className="mt-3 inline-flex items-center text-sm text-accent font-medium">
                    Baca Selengkapnya <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setSearchParams({ cat: category, page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setSearchParams({ cat: category, page: String(page + 1) })}
            >
              Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default BlogListPage;
