import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import DOMPurify from "dompurify";

const CATEGORY_LABELS: Record<string, string> = {
  insight: "Insight",
  tutorial: "Tutorial",
  peluang_kota: "Peluang Kota",
  update: "Update",
};

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: ["blog-related", post?.category, post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title")
        .eq("status", "published")
        .eq("category", post!.category)
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!post,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-96 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Artikel Tidak Ditemukan</h1>
          <Button asChild><Link to="/blog">Kembali ke Blog</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.meta_description,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "MarketIntel" },
    publisher: { "@type": "Organization", name: "MarketIntel" },
    mainEntityOfPage: `https://marketintel.id/blog/${post.slug}`,
  };

  return (
    <PublicLayout>
      <SEOHead
        title={`${post.seo_title || post.title} — MarketIntel`}
        description={post.seo_description || post.excerpt || post.meta_description || ""}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.cover_image_url || undefined}
        jsonLd={jsonLd}
      />
      <article className="container mx-auto px-4 py-16 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Blog
        </Link>

        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{CATEGORY_LABELS[post.category] || post.category}</Badge>
          <span>•</span>
          <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} className="w-full rounded-xl mb-8 object-cover max-h-96" loading="lazy" />
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.content, {
              ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
            }),
          }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="font-bold mb-2">Ingin analisis lebih detail?</h2>
          <p className="text-sm text-muted-foreground mb-4">Gunakan MarketIntel untuk analisis lokasi dan peluang bisnis berbasis data.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
              <Link to="/register">Cari Peluang <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/register">Analisis Lokasi <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Related */}
        {related && related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-bold mb-4">Artikel Terkait</h2>
            <div className="space-y-2">
              {related.map((r) => (
                <Link key={r.slug} to={`/blog/${r.slug}`} className="block text-sm text-accent hover:underline">
                  • {r.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PublicLayout>
  );
};

export default BlogPostPage;
