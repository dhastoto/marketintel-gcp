import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Rocket, Home, Store, Building, Factory, Check, Edit2, Wallet } from "lucide-react";
import { PROVINCES, CITIES_BY_PROVINCE, DISTRICTS_BY_CITY, PRODUCT_CATEGORIES, TARGET_SEGMENTS } from "@/lib/constants";
import { generateMockAnalysis } from "@/lib/mockAnalysis";
import { QuickStartInput, type QuickStartResult } from "@/components/QuickStartInput";

const STEPS = ["Informasi Produk", "Skala & Target", "Lokasi Fokus", "Review & Konfirmasi"];

const AnalysisWizard = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [usp, setUsp] = useState("");

  // Step 2 state
  const [businessScale, setBusinessScale] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [operatingHours, setOperatingHours] = useState([8]);
  const [ageRange, setAgeRange] = useState([12, 45]);
  const [targetGender, setTargetGender] = useState("semua");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);

  // Step 2 economic fields
  const [initialCapital, setInitialCapital] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");

  // Step 3 state
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [specificLocations, setSpecificLocations] = useState("");

  // Step 4 state
  const [projectName, setProjectName] = useState("");

  const toggleSegment = (seg: string) => {
    setSelectedSegments((prev) => prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]);
  };

  const toggleDistrict = (d: string) => {
    if (selectedDistricts.includes(d)) {
      setSelectedDistricts((prev) => prev.filter((x) => x !== d));
    } else if (selectedDistricts.length < 1) {
      setSelectedDistricts([d]);
    } else {
      toast.error("Maksimal 1 kecamatan per analisis");
    }
  };

  const canNext = () => {
    if (step === 0) return productName && productCategory;
    if (step === 1) return businessScale;
    if (step === 2) return province && city && selectedDistricts.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 2 && !projectName) {
      const date = new Date().toLocaleDateString("id-ID");
      setProjectName(`Analisis ${productName} - ${city} - ${date}`);
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const runAnalysis = async (override?: {
    productName: string;
    productCategory: string;
    priceMin: string;
    priceMax: string;
    businessScale: string;
    province: string;
    city: string;
    selectedDistricts: string[];
    projectName: string;
  }) => {
    if (!user || !profile) return;
    setLoading(true);

    const v = override
      ? override
      : {
          productName,
          productCategory,
          priceMin,
          priceMax,
          businessScale,
          province,
          city,
          selectedDistricts,
          projectName,
        };

    try {
      // Akses analisis dikontrol via user_purchases (per-laporan), bukan kredit.
      // Create project
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({ user_id: user.id, project_name: v.projectName || `Analisis ${v.productName}`, status: "analyzing" })
        .select()
        .single();

      if (projError) throw projError;

      // Save business input
      const inputData = {
        project_id: project.id,
        product_name: v.productName,
        product_category: v.productCategory,
        product_description: override ? null : (productDescription || null),
        price_range_min: v.priceMin ? parseInt(v.priceMin) : null,
        price_range_max: v.priceMax ? parseInt(v.priceMax) : null,
        unique_selling_point: override ? null : (usp || null),
        business_scale: v.businessScale || null,
        monthly_budget: null,
        target_age_min: ageRange[0],
        target_age_max: ageRange[1],
        target_gender: targetGender,
        target_segments: selectedSegments.length > 0 ? selectedSegments : null,
        province: v.province,
        city: v.city,
        districts: v.selectedDistricts,
        specific_locations: override ? null : (specificLocations || null),
      };

      const { error: inputError } = await supabase.from("business_inputs").insert(inputData);
      if (inputError) throw inputError;

      // Link best available marketintel purchase (Pro > Standard > Free) to this project
      try {
        const { getAvailablePurchase } = await import("@/lib/purchase-manager");
        const purchase = await getAvailablePurchase(user.id, "marketintel");
        if (purchase) {
          const { error: consumeErr } = await supabase.functions.invoke("consume-purchase", {
            body: {
              purchase_id: purchase.id,
              analysis_id: project.id,
              expected_product_type: "marketintel",
            },
          });
          if (consumeErr) {
            console.error("[consume-purchase] failed:", consumeErr);
            toast.warning("Analisis berjalan, tapi gagal menandai paket terpakai. Hubungi admin jika tier tidak sesuai.");
          }
        } else {
          console.warn("[consume-purchase] no available marketintel purchase for user", user.id);
        }
      } catch (e) {
        console.error("[consume-purchase] exception:", e);
      }

      // Save economic params to localStorage for loading page
      const economicParams = {
        initial_capital: initialCapital ? parseInt(initialCapital) : 0,
        monthly_cost: monthlyCost ? parseInt(monthlyCost) : 0,
        target_margin_pct: 0, // deprecated — engine uses benchmark margin from DB
        base_price_min: v.priceMin ? parseInt(v.priceMin) : 0,
        base_price_max: v.priceMax ? parseInt(v.priceMax) : 0,
        business_scale: v.businessScale || 'mikro',
        employee_count: employeeCount ? parseInt(employeeCount) : 1,
        operating_hours: operatingHours[0],
      };
      localStorage.setItem(`economic-params-${project.id}`, JSON.stringify(economicParams));

      // Refresh profile to reflect server-side credit deduction
      refreshProfile();

      // Navigate to loading page
      navigate(`/app/analysis/${project.id}/loading`, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    }
    setLoading(false);
  };

  const handleSubmit = () => runAnalysis();

  const handleQuickStart = (result: QuickStartResult, mode: "auto" | "manual") => {
    const { parsed, matched } = result;
    // Auto-fill state in either mode
    setProductName(parsed.business_name);
    setProductCategory(parsed.category);
    if (parsed.price_min != null) setPriceMin(String(parsed.price_min));
    if (parsed.price_max != null) setPriceMax(String(parsed.price_max));
    if (parsed.business_scale) setBusinessScale(parsed.business_scale);
    if (matched.province) setProvince(matched.province);
    if (matched.city) setCity(matched.city);
    if (matched.district) setSelectedDistricts([matched.district]);

    if (mode === "auto" && matched.province && matched.city && matched.district) {
      const date = new Date().toLocaleDateString("id-ID");
      const pname = `Analisis ${parsed.business_name} - ${matched.city} - ${date}`;
      setProjectName(pname);
      // Run with explicit override (state batch may not have flushed yet)
      runAnalysis({
        productName: parsed.business_name,
        productCategory: parsed.category,
        priceMin: parsed.price_min != null ? String(parsed.price_min) : "",
        priceMax: parsed.price_max != null ? String(parsed.price_max) : "",
        businessScale: parsed.business_scale || "mikro",
        province: matched.province,
        city: matched.city,
        selectedDistricts: [matched.district],
        projectName: pname,
      });
    } else {
      // Edit manual: jump to step 0 + scroll to wizard
      setStep(0);
      toast.success("Form sudah terisi otomatis. Silakan review setiap step.");
      setTimeout(() => {
        document.getElementById("wizard-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const scaleOptions = [
    { value: "gerobak", icon: Home, label: "Gerobak / Keliling", desc: "1 orang, tanpa tempat tetap" },
    { value: "rumahan", icon: Home, label: "Rumahan", desc: "1-2 orang, dari rumah" },
    { value: "mikro", icon: Store, label: "Mikro", desc: "2-5 orang, 1 outlet kecil" },
    { value: "kecil", icon: Building, label: "Kecil", desc: "5-15 orang, ruko/toko" },
    { value: "menengah", icon: Factory, label: "Menengah", desc: "15-50 orang, beberapa lokasi" },
    { value: "besar", icon: Factory, label: "Besar", desc: "50+ orang, franchise/chain" },
  ];

  const cities = CITIES_BY_PROVINCE[province] || [];
  const districts = DISTRICTS_BY_CITY[city] || [];

  return (
    <div className="mx-auto max-w-3xl animate-fade-in-up space-y-6">
      <h1 className="text-2xl font-bold">Analisis Baru</h1>

      {/* Quick Start (AI) */}
      <QuickStartInput onConfirm={handleQuickStart} />

      <div id="wizard-form">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i <= step ? "gradient-amber text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-xs md:block ${i <= step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < 3 && <div className={`h-px flex-1 ${i < step ? "bg-accent" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Informasi Produk</h2>
            <div>
              <Label>Nama Produk *</Label>
              <Input placeholder="Steak Daging Sapi" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div>
              <Label>Kategori Produk *</Label>
              <Select value={productCategory} onValueChange={setProductCategory}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deskripsi Singkat Produk</Label>
              <Textarea placeholder="Steak daging sapi segar dengan cheese melt, target pasar anak muda..." value={productDescription} onChange={(e) => setProductDescription(e.target.value)} maxLength={300} />
              <p className="mt-1 text-xs text-muted-foreground">{productDescription.length}/300 karakter</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Harga Minimum (Rp)</Label>
                <Input type="number" placeholder="15000" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
              </div>
              <div>
                <Label>Harga Maksimum (Rp)</Label>
                <Input type="number" placeholder="50000" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Keunikan Produk / USP</Label>
              <Textarea placeholder="Apa yang membuat produk Anda berbeda dari kompetitor?" value={usp} onChange={(e) => setUsp(e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Skala & Target</h2>
            <div>
              <Label className="mb-3 block">Skala Bisnis *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {scaleOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setBusinessScale(opt.value)} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${businessScale === opt.value ? "border-accent bg-accent/5 shadow-sm" : "border-border hover:border-accent/50"}`}>
                    <opt.icon className={`h-5 w-5 ${businessScale === opt.value ? "text-accent" : "text-muted-foreground"}`} />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Jumlah Karyawan (opsional)</Label>
              <Input type="number" placeholder="Termasuk Anda sendiri" min={1} value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} />
            </div>
            <div>
              <Label className="mb-3 block">Jam Operasional: {operatingHours[0]} jam/hari</Label>
              <Slider min={4} max={16} step={1} value={operatingHours} onValueChange={setOperatingHours} className="py-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>4 jam</span>
                <span>16 jam</span>
              </div>
            </div>
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Estimasi Ekonomi <Badge variant="secondary" className="text-[10px]">Opsional</Badge></h3>
              <p className="text-xs text-muted-foreground">Isi untuk mendapatkan estimasi profit dan BEP. Jika dikosongkan, kami gunakan benchmark industri.</p>
              <div>
                <Label>Modal Awal (Rp)</Label>
                <Input type="number" placeholder="Kosongkan jika belum tahu — kami pakai benchmark" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} />
              </div>
              <div>
                <Label>Biaya Operasional Bulanan (Rp)</Label>
                <Input type="number" placeholder="Kosongkan jika belum tahu — kami pakai benchmark" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-3 block">Target Usia: {ageRange[0]} - {ageRange[1]} tahun</Label>
              <Slider min={10} max={60} step={1} value={ageRange} onValueChange={setAgeRange} className="py-2" />
            </div>
            <div>
              <Label className="mb-3 block">Target Gender</Label>
              <div className="flex gap-3">
                {["semua", "pria", "wanita"].map((g) => (
                  <button key={g} onClick={() => setTargetGender(g)} className={`rounded-lg border px-4 py-2 text-sm capitalize transition-all ${targetGender === g ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-3 block">Segmen Target</Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_SEGMENTS.map((seg) => (
                  <button key={seg.value} onClick={() => toggleSegment(seg.value)} className={`rounded-full border px-3 py-1.5 text-sm transition-all ${selectedSegments.includes(seg.value) ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Lokasi Fokus</h2>
            <div>
              <Label>Provinsi *</Label>
              <Select value={province} onValueChange={(v) => { setProvince(v); setCity(""); setSelectedDistricts([]); }}>
                <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kota/Kabupaten *</Label>
              <Select value={city} onValueChange={(v) => { setCity(v); setSelectedDistricts([]); }} disabled={!province}>
                <SelectTrigger><SelectValue placeholder={province ? "Pilih kota" : "Pilih provinsi dulu"} /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {city && districts.length > 0 && (
              <div>
                <Label className="mb-2 block">Kecamatan Fokus * (pilih 1 kecamatan)</Label>
                <div className="flex flex-wrap gap-2">
                  {districts.map((d) => (
                    <button key={d} onClick={() => toggleDistrict(d)} className={`rounded-full border px-3 py-1.5 text-sm transition-all ${selectedDistricts.includes(d) ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {city && districts.length === 0 && (
              <div>
                <Label>Kecamatan Fokus * (ketik manual, pisahkan dengan koma)</Label>
                <Input placeholder="Nama Kecamatan" onChange={(e) => setSelectedDistricts(e.target.value.trim() ? [e.target.value.trim()] : [])} />
              </div>
            )}
            <div>
              <Label>Catatan Lokasi Spesifik (opsional)</Label>
              <Textarea placeholder="Dekat kampus, area perumahan padat, dekat stasiun, dll." value={specificLocations} onChange={(e) => setSpecificLocations(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Konfirmasi</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Produk</h3>
                  <button onClick={() => setStep(0)} className="text-accent hover:underline"><Edit2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">{productName}</span></p>
                  <p>Kategori: {PRODUCT_CATEGORIES.find(c => c.value === productCategory)?.label ?? productCategory}</p>
                  {priceMin && priceMax && <p>Harga: Rp{parseInt(priceMin).toLocaleString("id-ID")} - Rp{parseInt(priceMax).toLocaleString("id-ID")}</p>}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Target</h3>
                  <button onClick={() => setStep(1)} className="text-accent hover:underline"><Edit2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Skala: <span className="capitalize">{businessScale}</span></p>
                  <p>Usia: {ageRange[0]}-{ageRange[1]} tahun</p>
                  <p>Gender: <span className="capitalize">{targetGender}</span></p>
                </div>
              </div>

              <div className="rounded-lg border p-4 md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Lokasi</h3>
                  <button onClick={() => setStep(2)} className="text-accent hover:underline"><Edit2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{province}, {city}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDistricts.map((d) => <Badge key={d} variant="secondary">{d}</Badge>)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Nama Proyek</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm">
                Analisis akan menggunakan salah satu laporan MarketIntel yang tersedia di akun Anda.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} disabled={!canNext()} className="gradient-amber border-0 text-accent-foreground hover:opacity-90">
            Selanjutnya <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading} className="gradient-amber border-0 text-accent-foreground hover:opacity-90">
            {loading ? "Memproses..." : <><Rocket className="mr-1.5 h-4 w-4" /> Mulai Analisis</>}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
};

export default AnalysisWizard;
