# SFA Backoffice — Snapshot v1.0
**Tanggal:** 2026-09-15  
**Status:** Ready to Build  
**Platform:** Web App (React + Supabase) — bisa Lovable atau standalone

---

## 1. Konteks Bisnis

Web admin panel untuk owner dan admin perusahaan distributor/produsen yang berlangganan modul SFA (Marsa, Marca, Marco). Backoffice mengelola:
- Registrasi dan konfigurasi perusahaan
- Manajemen user lapangan (sales, canvasser, kurir)
- Lead pool dan assignment
- Monitoring aktivitas tim di lapangan real-time
- Laporan penjualan, kunjungan, dan pengiriman
- Katalog produk dan harga

Diakses dari MarketIntel (`marketintel.id`) via tombol redirect setelah user verifikasi punya subscription SFA aktif. Session Supabase langsung valid (same project = SSO otomatis).

---

## 2. Tech Stack

```
Framework    : React (Vite) + TypeScript  
               Atau: Lovable (jika ingin generasi cepat)
Routing      : React Router v6
UI           : shadcn/ui + Tailwind CSS (konsisten dengan MarketIntel)
State        : React Query (server state) + Zustand (UI state)
Backend      : Supabase (shared project dengan MarketIntel)
Auth         : Supabase Auth — SSO via redirect dari MarketIntel
Maps         : Google Maps JS API (live tracking tim lapangan)
Charts       : Recharts atau Tremor
Export       : react-csv + jspdf (export laporan)
Subdomain    : backoffice.marketintel.id
```

---

## 3. Auth & Access Flow

```
User di MarketIntel klik "Buka Backoffice SFA"
        │
        ├─ Cek user_purchases: product_type='sfa', status='active'
        │   └─ Tidak ada → tampilkan upgrade page
        │
        └─ Ada → redirect ke backoffice.marketintel.id
                  Supabase session langsung valid (cookie .marketintel.id)
                  │
                  ▼
                  Cek sfa_company_users WHERE user_id = auth.uid()
                  AND role IN ('owner','admin')
                  │
                  ├─ owner/admin → masuk ke backoffice
                  └─ sales/canvasser/driver → redirect ke mobile app
```

**Role matrix di backoffice:**

| Fitur | Owner | Admin | Sales | Canvasser | Driver |
|-------|-------|-------|-------|-----------|--------|
| Kelola perusahaan | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat semua leads | ✅ | ✅ | Milik sendiri | Milik sendiri | ❌ |
| Assign leads | ✅ | ✅ | ❌ | ❌ | ❌ |
| Import leads dari MarketIntel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat semua order/invoice | ✅ | ✅ | Milik sendiri | Milik sendiri | ❌ |
| Manage produk & harga | ✅ | ✅ | ❌ | ❌ | ❌ |
| Live tracking | ✅ | ✅ | ❌ | ❌ | ❌ |
| Laporan & export | ✅ | ✅ | Milik sendiri | Milik sendiri | Milik sendiri |

---

## 4. Database Schema (Supabase — shared dengan MarketIntel)

### Tabel yang sudah ada:
```
sfa_companies, sfa_company_users, sfa_leads,
sfa_activities, sfa_products,
subscriber_leads, directory_results (dari MarketIntel)
```

### Tabel tambahan (dari mobile snapshot):
```
sfa_orders       → order taking Marsa
sfa_invoices     → direct invoice Marca
sfa_vehicle_stocks → stok kendaraan Marca
sfa_deliveries   → delivery order Marco
sfa_route_plans  → rute harian
```

### Perubahan schema dari desain awal:

```sql
-- sfa_companies: ganti app_type (single) → active_modules (array)
ALTER TABLE sfa_companies
  DROP COLUMN IF EXISTS app_type,
  ADD COLUMN active_modules TEXT[] DEFAULT '{}';
-- Contoh value: '{marsa}', '{marsa,marca}', '{marsa,marca,marco}'

-- sfa_company_users: ganti role (single) → module_roles (JSONB)
ALTER TABLE sfa_company_users
  DROP COLUMN IF EXISTS role,
  ADD COLUMN module_roles JSONB DEFAULT '{}';
-- Contoh value: {"marsa":"sales"} atau {"marsa":"sales","marco":"driver"}
-- Tetap ada kolom role legacy untuk backward compat jika diperlukan
```

---

## 5. Struktur Halaman (Routing)

```
/                       → Redirect ke /dashboard
/login                  → Login (jika session expired)
/no-access              → User bukan owner/admin

/dashboard              → Home: ringkasan KPI semua modul aktif
/company                → Profil & setting perusahaan
/users                  → Manajemen user (daftar, tambah, edit, nonaktif)
/users/invite           → Undang user baru (kirim email invite)

/leads                  → Lead pool perusahaan
/leads/import           → Import dari subscriber_leads MarketIntel
/leads/[id]             → Detail lead + history aktivitas + assignment

/marsa                  → Overview modul Marsa
/marsa/orders           → Daftar semua order
/marsa/orders/[id]      → Detail order + ubah status
/marsa/targets          → Set target per sales per periode
/marsa/report           → Laporan kunjungan & order (filter tanggal, sales)

/marca                  → Overview modul Marca
/marca/stock            → Rekap stok kendaraan per hari
/marca/invoices         → Daftar semua invoice langsung
/marca/invoices/[id]    → Detail invoice
/marca/report           → Laporan canvassing harian/mingguan

/marco                  → Overview modul Marco
/marco/deliveries       → Daftar delivery order
/marco/deliveries/new   → Buat DO baru (dari order Marsa atau manual)
/marco/deliveries/[id]  → Detail DO + POD foto
/marco/report           → Laporan pengiriman + success rate

/products               → Katalog produk & harga perusahaan
/products/new           → Tambah produk
/products/[id]          → Edit produk / harga / status

/tracking               → Live tracking posisi tim di lapangan (peta)
/reports                → Laporan gabungan + export CSV/PDF
```

---

## 6. Halaman Kunci — Detail Fitur

### Dashboard (`/dashboard`)
Grid KPI cards per modul aktif:
```
MARSA:
- Kunjungan hari ini: X / target Y
- Order hari ini: Rp X
- Sales aktif di lapangan: X orang

MARCA:
- Invoice hari ini: X transaksi, Rp Y
- Canvasser aktif: X orang
- Stok terjual vs dibawa: X%

MARCO:
- DO hari ini: X / Y terkirim
- On-time rate: X%
- Driver aktif: X orang
```
+ Grafik trend 7 hari terakhir per modul
+ Live activity feed (5 aktivitas terbaru dari semua tim)

---

### Manajemen User (`/users`)
- Tabel user: nama, role per modul, area coverage, status, last active
- Tambah user: input nama + nomor HP → kirim invite link (Supabase magic link)
- Edit user: ubah module_roles, area_coverage, aktif/nonaktif
- User yang di-nonaktifkan tidak bisa login ke mobile app (is_active=false)

---

### Lead Pool (`/leads`)
- Tabel leads: nama outlet, alamat, kab/kota, telepon, status, di-assign ke siapa
- Filter: belum di-assign, sudah, per wilayah, per keyword
- Bulk assign: pilih beberapa lead → assign ke sales/canvasser tertentu
- Import button → tarik dari `subscriber_leads_dedup` view:
  - Preview jumlah lead available dari MarketIntel
  - Pilih filter kabkota/keyword
  - Konfirmasi → INSERT ke `sfa_leads` (UNIQUE per company+place_id)

---

### Live Tracking (`/tracking`)
- Google Maps dengan marker tiap anggota tim yang aktif hari ini
- Marker warna berbeda per modul (Marsa=biru, Marca=kuning, Marco=hijau)
- Klik marker → popup: nama, modul, outlet terakhir dikunjungi, jam update
- Data dari `sfa_activities` terbaru per user (lat, lng, created_at)
- Auto-refresh setiap 60 detik

---

### Katalog Produk (`/products`)
- Tabel produk: kode, nama, kategori, harga, unit, status aktif
- Form tambah/edit produk
- Produk aktif = yang muncul di form order/invoice mobile app
- Import produk via CSV (opsional)

---

### Laporan (`/reports`)
Filter: rentang tanggal, modul, sales/canvasser, wilayah

**Marsa:**
- Visit report: tanggal, sales, outlet, hasil, order/tidak
- Order report: tanggal, sales, outlet, produk, qty, total

**Marca:**
- Canvass report: tanggal, canvasser, outlet, invoice, total
- Stock report: stok awal vs terjual vs sisa per hari per canvasser

**Marco:**
- Delivery report: tanggal, driver, DO, status, waktu antar
- Success rate per driver, per area

Export: CSV (semua) + PDF ringkasan (per modul)

---

## 7. Komponen UI Reusable

```
<ModuleGuard module="marsa">   → render hanya jika modul aktif
<RoleGuard roles={["owner","admin"]}> → render hanya jika role sesuai
<LeadCard />                   → card outlet standard
<ActivityFeed />               → feed aktivitas real-time
<KpiCard />                    → metric tile dengan trend
<LiveMap />                    → Google Maps wrapper + markers
<StatusBadge status="..." />   → badge warna per status
<ExportButton />               → trigger CSV/PDF export
```

---

## 8. Integrasi dengan MarketIntel (Parent App)

**Entry point dari MarketIntel:**
```
marketintel.id/app/directory 
  → tombol "Buka Backoffice SFA" (jika punya subscription SFA)
  → window.open('https://backoffice.marketintel.id', '_blank')
  → Supabase session cookie .marketintel.id otomatis terbaca
```

**Data yang diambil dari MarketIntel DB:**
- `subscriber_leads_dedup` (view) → sumber import lead ke `sfa_leads`
- `directory_results` → detail outlet (koordinat, rating, jam buka)
- `user_purchases` → validasi subscription SFA aktif

---

## 9. Setup Deployment

```
Domain       : backoffice.marketintel.id
Hosting      : Vercel / Netlify (static React build)
Supabase     : Project yang sama dengan MarketIntel
               URL: https://bbakmvokezhjijzmwsdu.supabase.co
Env vars:
  VITE_SUPABASE_URL=https://bbakmvokezhjijzmwsdu.supabase.co
  VITE_SUPABASE_ANON_KEY=[sama dengan MarketIntel]
  VITE_GOOGLE_MAPS_API_KEY=[pisah dari GOOGLE_PLACES_API_KEY]
```

Cookie domain Supabase harus dikonfigurasi ke `.marketintel.id` agar SSO bekerja:
```typescript
// supabase client init
const supabase = createClient(url, anonKey, {
  auth: {
    storageKey: 'marketintel-auth',  // harus SAMA dengan MarketIntel app
    cookieOptions: { domain: '.marketintel.id' }
  }
})
```

---

## 10. Pending / Belum Diputuskan

- [ ] Apakah backoffice dibangun dengan Lovable (cepat) atau standalone Vite?
- [ ] Apakah ada notifikasi real-time ke backoffice (misalnya: order masuk dari Marsa)?
- [ ] Target (Marsa): per sales per bulan, set dari backoffice atau dari owner saja?
- [ ] Apakah Marco DO bisa dibuat manual (bukan dari order Marsa)?
- [ ] Pricing subscription SFA: per modul atau bundled?
- [ ] Apakah perlu approval flow order Marsa (submitted → confirmed oleh admin)?
- [ ] Integrasi accounting (Accurate Online / Jurnal) untuk invoice Marca?
