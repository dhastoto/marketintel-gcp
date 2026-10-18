import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getFeatures } from "@/lib/feature-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PlusCircle, Search, Eye, Archive, Trash2, FolderOpen, Scale, Sparkles } from "lucide-react";
import { TIER_RANK } from "@/lib/report-features";

interface Project {
  id: string;
  project_name: string;
  status: string;
  created_at: string;
  tier?: string;
}

const Projects = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const features = getFeatures(profile?.plan);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    const projectIds = (projectsData || []).map((p) => p.id);
    let tierMap: Record<string, string> = {};

    if (projectIds.length > 0) {
      const { data: purchases } = await supabase
        .from("user_purchases")
        .select("analysis_id, tier")
        .eq("status", "used")
        .in("analysis_id", projectIds);

      (purchases || []).forEach((row: { analysis_id: string | null; tier: string }) => {
        if (!row.analysis_id) return;
        const current = tierMap[row.analysis_id];
        if (!current || (TIER_RANK[row.tier] ?? 0) > (TIER_RANK[current] ?? 0)) {
          tierMap[row.analysis_id] = row.tier;
        }
      });
    }

    setProjects(
      (projectsData || []).map((p) => ({ ...p, tier: tierMap[p.id] || "free" }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Proyek dihapus");
    fetchProjects();
  };

  const archiveProject = async (id: string) => {
    await supabase.from("projects").update({ status: "archived" }).eq("id", id);
    toast.success("Proyek diarsipkan");
    fetchProjects();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
      analyzing: { label: "Menganalisis", className: "bg-amber-500/10 text-amber-500" },
      completed: { label: "Selesai", className: "bg-green-500/10 text-green-500" },
      archived: { label: "Diarsipkan", className: "bg-muted text-muted-foreground" },
    };
    const s = map[status] || map.draft;
    return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
  };

  const tierBadge = (tier: string) => {
    const map: Record<string, { label: string; className: string }> = {
      free: { label: "Free", className: "bg-muted text-muted-foreground border-transparent" },
      standard: { label: "Standard", className: "bg-blue-500/10 text-blue-600 border-transparent" },
      pro: { label: "Pro", className: "bg-amber-500/15 text-amber-600 border-transparent" },
    };
    const t = map[tier] || map.free;
    return <Badge variant="outline" className={t.className}>{t.label}</Badge>;
  };

  const filtered = projects.filter((p) => p.project_name.toLowerCase().includes(search.toLowerCase()));
  const filterByStatus = (status: string | null) => status ? filtered.filter((p) => p.status === status) : filtered;

  const ProjectList = ({ items }: { items: Project[] }) => (
    items.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Tidak ada proyek ditemukan</p>
      </div>
    ) : (
      <div className="divide-y">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
            <div>
              <div className="font-medium">{p.project_name}</div>
              <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("id-ID")}</div>
            </div>
            <div className="flex items-center gap-2">
              {tierBadge(p.tier || "free")}
              {statusBadge(p.status)}
              {p.status === "completed" && p.tier !== "pro" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
                  onClick={() => navigate(`/app/analysis/${p.id}?upgrade=1`)}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Upgrade
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <Link to={p.status === "completed" ? `/app/analysis/${p.id}` : `/app/analysis/${p.id}/loading`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => archiveProject(p.id)}><Archive className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteProject(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyek Saya</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/compare")}
            disabled={features.comparison_max === 0 || projects.filter(p => p.status === "completed").length < 2}
          >
            <Scale className="mr-1.5 h-4 w-4" /> Bandingkan Lokasi
          </Button>
          <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
            <Link to="/app/analysis/new"><PlusCircle className="mr-1.5 h-4 w-4" /> Analisis Baru</Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari proyek..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua ({filtered.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="completed">Selesai</TabsTrigger>
          <TabsTrigger value="archived">Diarsipkan</TabsTrigger>
        </TabsList>

        <div className="rounded-xl border bg-card">
          <TabsContent value="all" className="mt-0"><ProjectList items={filterByStatus(null)} /></TabsContent>
          <TabsContent value="draft" className="mt-0"><ProjectList items={filterByStatus("draft")} /></TabsContent>
          <TabsContent value="completed" className="mt-0"><ProjectList items={filterByStatus("completed")} /></TabsContent>
          <TabsContent value="archived" className="mt-0"><ProjectList items={filterByStatus("archived")} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Projects;
