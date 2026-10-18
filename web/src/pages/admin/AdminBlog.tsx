import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ArrowLeft, Trash2, Eye, Save } from "lucide-react";

interface BlogPost {
  id: string; slug: string; title: string; content: string; excerpt: string | null;
  category: string; status: string; tags: string[]; cover_image_url: string | null;
  seo_title: string | null; seo_description: string | null; published_at: string | null;
  created_at: string | null;
}

const EMPTY_POST = {
  title: "", slug: "", content: "", excerpt: "", category: "insight", status: "draft",
  tags: [] as string[], cover_image_url: "", seo_title: "", seo_description: "",
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

const AdminBlog = () => {
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog", filter],
    queryFn: async () => {
      let q = supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (filter === "published") q = q.eq("status", "published");
      else if (filter === "draft") q = q.eq("status", "draft");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title, slug: form.slug || slugify(form.title), content: form.content,
        excerpt: form.excerpt || null, category: form.category, status: form.status,
        tags: form.tags, cover_image_url: form.cover_image_url || null,
        seo_title: form.seo_title || null, seo_description: form.seo_description || null,
        published_at: form.status === "published" ? new Date().toISOString() : null,
      };
      if (editId) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Artikel diperbarui" : "Artikel dibuat");
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
      setView("list"); setEditId(null); setForm(EMPTY_POST);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Artikel dihapus"); qc.invalidateQueries({ queryKey: ["admin-blog"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (post: BlogPost) => {
    setEditId(post.id);
    setForm({
      title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt || "",
      category: post.category, status: post.status, tags: post.tags || [],
      cover_image_url: post.cover_image_url || "", seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
    });
    setView("edit");
  };

  const openNew = () => { setEditId(null); setForm(EMPTY_POST); setView("edit"); };

  if (view === "edit") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Button>
          <h1 className="text-xl font-bold">{editId ? "Edit Artikel" : "Tulis Artikel Baru"}</h1>
        </div>
        <div className="grid gap-4 max-w-3xl">
          <div>
            <label className="text-sm font-medium">Judul</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insight">Insight</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="peluang_kota">Peluang Kota</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.tags.map((t) => (
                <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>{t} ×</Badge>
              ))}
            </div>
            <Input placeholder="Tambah tag, tekan Enter" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); setForm({ ...form, tags: [...form.tags, tagInput.trim()] }); setTagInput(""); } }} />
          </div>
          <div>
            <label className="text-sm font-medium">Cover Image URL</label>
            <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Excerpt</label>
            <Textarea rows={3} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Konten</label>
            <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} />
          </div>
          <details className="rounded-lg border p-4">
            <summary className="text-sm font-medium cursor-pointer">SEO (opsional)</summary>
            <div className="mt-3 space-y-3">
              <Input placeholder="SEO Title" value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              <Textarea placeholder="SEO Description" rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
            </div>
          </details>
          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.content}>
              <Save className="h-4 w-4 mr-1" />{form.status === "published" ? "Publish" : "Simpan Draft"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Tulis Artikel</Button>
      </div>
      <div className="flex gap-2">
        {["all", "published", "draft"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Semua" : f === "published" ? "Published" : "Draft"}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-3">Judul</th>
              <th className="text-left p-3">Kategori</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Tanggal</th>
              <th className="p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y">
              {(posts || []).map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium max-w-xs truncate">{p.title}</td>
                  <td className="p-3"><Badge variant="secondary" className="text-xs">{p.category}</Badge></td>
                  <td className="p-3"><Badge variant={p.status === "published" ? "default" : "outline"} className="text-xs">{p.status === "published" ? "✅ Pub" : "📝 Draft"}</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Hapus artikel ini?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(posts || []).length === 0 && <div className="p-8 text-center text-muted-foreground">Belum ada artikel</div>}
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
