# SFA Field App — Snapshot v1.0
**Tanggal:** 2026-09-15  
**Status:** Ready to Build  
**Platform:** React Native (Expo) — iOS & Android

---

## 1. Konteks Bisnis

Aplikasi mobile lapangan yang digunakan oleh tim field force distributor/produsen yang sudah berlangganan MarketIntel Directory Search. Ada tiga modul dalam satu app:

| Modul | Nama | Pengguna | Model Kerja |
|-------|------|----------|-------------|
| **Marsa** | Sales / Taking Order | Sales person | Kunjungi outlet → catat pesanan → diproses gudang |
| **Marca** | Canvasser | Canvasser | Bawa stok di kendaraan → jual langsung → invoice di tempat |
| **Marco** | Courier | Kurir | Terima delivery order → antar ke outlet → proof of delivery |

Modul yang aktif ditentukan oleh `sfa_companies.active_modules` (array). User hanya melihat modul yang di-subscribe perusahaannya.

---

## 2. Tech Stack

```
Framework    : React Native + Expo SDK (latest)
Navigation   : Expo Router (file-based routing)
State        : Zustand (global) + React Query (server state)
Backend      : Supabase (shared project dengan MarketIntel)
Auth         : Supabase Auth — session shared via same project
               SSO dari MarketIntel: user sudah login di MarketIntel,
               redirect ke app mobile dengan token yang sama
Maps         : react-native-maps + Expo Location
Camera       : Expo Camera (proof of delivery, foto outlet)
Storage      : Expo SecureStore (token), AsyncStorage (offline cache)
Offline      : SQLite lokal (expo-sqlite) untuk queue transaksi offline
Push Notif   : Expo Notifications
```

---

## 3. Auth & SSO Flow

```
User login di MarketIntel (web) atau langsung di Field App
        │
        ▼
Supabase Auth (shared project)
        │
        ▼
Cek sfa_company_users WHERE user_id = auth.uid() AND is_active = true
        │
        ├─ Tidak ada → tampilkan halaman "Hubungi admin perusahaan Anda"
        │
        └─ Ada → baca company_id + module_roles + active_modules
                 → arahkan ke home screen sesuai modul aktif
```

User bisa punya multi-role di multi-modul:
```json
module_roles: {
  "marsa": "sales",
  "marco": "driver"
}
```

---

## 4. Database Schema (Supabase — shared project MarketIntel)

### Tabel yang sudah ada (dari migration MarketIntel):
```sql
sfa_companies (id, app_type→active_modules[], owner_user_id, company_name, 
               company_code, subscription_status, max_users, settings)
sfa_company_users (id, company_id, user_id, role→module_roles JSONB, 
                   full_name, phone, area_coverage[], is_active)
sfa_leads (id, company_id, place_id, nama, alamat, provinsi, kabkota, 
           telepon, lat, lng, assigned_to_id, lead_status, priority, 
           last_visited_at, visit_count, notes, tags)
sfa_activities (id, company_id, lead_id, user_id, activity_type, result, 
                notes, lat, lng, photo_urls[], order_amount, order_items JSONB)
sfa_products (id, company_id, product_code, product_name, category, price, unit)
```

### Tabel tambahan yang perlu dibuat:

```sql
-- MARSA: Order taking (sales tanpa bawa stok)
CREATE TABLE sfa_orders (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES sfa_companies(id),
  lead_id         BIGINT REFERENCES sfa_leads(id),
  salesperson_id  UUID NOT NULL REFERENCES sfa_company_users(id),
  order_number    TEXT UNIQUE NOT NULL,   -- auto-generate: ORD-YYYYMMDD-XXXX
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT DEFAULT 'draft' CHECK (
    status IN ('draft','submitted','confirmed','delivered','cancelled')
  ),
  payment_term    TEXT,                   -- cash, net7, net14, net30
  notes           TEXT,
  items           JSONB NOT NULL,         -- [{product_id, qty, price, subtotal}]
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- MARCA: Vehicle stock management (canvasser bawa stok di kendaraan)
CREATE TABLE sfa_vehicle_stocks (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES sfa_companies(id),
  canvasser_id    UUID NOT NULL REFERENCES sfa_company_users(id),
  stock_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_stock   JSONB NOT NULL DEFAULT '[]', -- [{product_id, qty}]
  closing_stock   JSONB DEFAULT '[]',
  total_sold      NUMERIC(15,2) DEFAULT 0,
  total_return    NUMERIC(15,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvasser_id, stock_date)
);

-- MARCA: Direct invoice di lapangan (canvasser)
CREATE TABLE sfa_invoices (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES sfa_companies(id),
  lead_id         BIGINT REFERENCES sfa_leads(id),
  canvasser_id    UUID NOT NULL REFERENCES sfa_company_users(id),
  vehicle_stock_id BIGINT REFERENCES sfa_vehicle_stocks(id),
  invoice_number  TEXT UNIQUE NOT NULL,   -- auto-generate: INV-YYYYMMDD-XXXX
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT CHECK (payment_method IN ('cash','transfer','qris')),
  payment_status  TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid','pending','return')),
  items           JSONB NOT NULL,         -- [{product_id, qty, price, subtotal}]
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(15,2) DEFAULT 0,
  change_amount   NUMERIC(15,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- MARCO: Delivery order (kurir)
CREATE TABLE sfa_deliveries (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES sfa_companies(id),
  order_id        BIGINT REFERENCES sfa_orders(id),  -- dari Marsa order
  driver_id       UUID NOT NULL REFERENCES sfa_company_users(id),
  lead_id         BIGINT REFERENCES sfa_leads(id),
  delivery_number TEXT UNIQUE NOT NULL,
  scheduled_date  DATE,
  status          TEXT DEFAULT 'assigned' CHECK (
    status IN ('assigned','in_transit','delivered','failed','returned')
  ),
  picked_up_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  recipient_name  TEXT,
  pod_photo_urls  TEXT[],   -- proof of delivery photos
  failure_reason  TEXT,
  notes           TEXT,
  lat_delivered   DOUBLE PRECISION,
  lng_delivered   DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Route plan harian (Marsa & Marco)
CREATE TABLE sfa_route_plans (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES sfa_companies(id),
  user_id         UUID NOT NULL REFERENCES sfa_company_users(id),
  plan_date       DATE NOT NULL,
  module          TEXT CHECK (module IN ('marsa','marco')),
  stops           JSONB NOT NULL DEFAULT '[]', 
                  -- [{lead_id, sequence, estimated_time, status}]
  status          TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_date, module)
);
```

---

## 5. Struktur Navigasi (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx          → Supabase Auth login
│   └── no-access.tsx      → Jika tidak ada di sfa_company_users
│
├── (app)/
│   ├── _layout.tsx        → Bottom tab navigation (modul aktif saja)
│   │
│   ├── home.tsx           → Dashboard ringkasan (multi-modul)
│   │
│   ├── marsa/             → MARSA MODULE (Sales TO)
│   │   ├── index.tsx      → Daftar kunjungan hari ini + target
│   │   ├── leads.tsx      → Daftar outlet yang di-assign
│   │   ├── lead/[id].tsx  → Detail outlet + history + form order
│   │   ├── order/new.tsx  → Form order baru
│   │   ├── order/[id].tsx → Detail order
│   │   ├── route.tsx      → Route plan hari ini (peta)
│   │   └── report.tsx     → Laporan kunjungan & order harian
│   │
│   ├── marca/             → MARCA MODULE (Canvasser)
│   │   ├── index.tsx      → Ringkasan stok kendaraan hari ini
│   │   ├── stock/open.tsx → Buka stok pagi (input stok awal dari gudang)
│   │   ├── stock/close.tsx→ Tutup stok sore (rekap sisa + setoran)
│   │   ├── leads.tsx      → Daftar outlet area canvassing
│   │   ├── lead/[id].tsx  → Detail outlet + form invoice langsung
│   │   ├── invoice/new.tsx→ Form penjualan langsung
│   │   ├── invoice/[id].tsx → Detail invoice
│   │   └── report.tsx     → Rekap penjualan hari ini
│   │
│   ├── marco/             → MARCO MODULE (Courier)
│   │   ├── index.tsx      → Delivery queue hari ini
│   │   ├── delivery/[id].tsx → Detail DO + navigasi + POD
│   │   ├── pod/[id].tsx   → Form proof of delivery (foto + tanda tangan)
│   │   └── report.tsx     → Rekap pengiriman harian
│   │
│   └── profile/
│       ├── index.tsx      → Profil user + ganti password
│       └── settings.tsx   → Notifikasi, offline mode, sync
│
└── _layout.tsx            → Root layout, auth check
```

---

## 6. Fitur Per Modul

### MARSA — Sales Taking Order

**Home:**
- Target kunjungan hari ini vs tercapai
- Total order hari ini (Rp)
- Notifikasi order yang perlu di-follow up

**Leads (Outlet):**
- List outlet yang di-assign ke user ini
- Filter: belum dikunjungi, sudah, perlu follow-up
- Search by nama/alamat
- Badge: terakhir dikunjungi kapan, total order lifetime

**Detail Outlet:**
- Info: nama, alamat, telepon (tap → call), maps (tap → navigate)
- History kunjungan & order
- Tombol: Mulai Kunjungan, Buat Order

**Check-in / Visit:**
- GPS auto-capture saat check-in
- Form: hasil kunjungan (order/tidak ada/tutup/lain-lain), foto opsional, catatan
- Timer kunjungan (check-in → check-out)

**Form Order:**
- Pilih produk dari katalog perusahaan
- Input qty per produk
- Catatan tambahan, payment term
- Preview total sebelum submit

**Route Plan:**
- Peta dengan pin semua outlet hari ini
- Urutan kunjungan yang direkomendasikan (nearest-next)
- Tombol "Navigasi" → buka Google Maps / Waze

---

### MARCA — Canvasser Direct Selling

**Buka Stok Pagi:**
- Input stok yang diambil dari gudang per produk
- Konfirmasi → stok terkunci untuk hari ini

**Leads (Outlet Canvassing):**
- List outlet di area canvassing
- Filter: belum didatangi hari ini, sudah
- Badge: stok terjual di outlet ini (history)

**Form Invoice (Jual Langsung):**
- Pilih produk + qty (dibatasi stok tersedia di kendaraan)
- Harga otomatis dari katalog
- Input pembayaran: cash/transfer/QRIS
- Kalkulasi kembalian otomatis
- Print/share invoice via WhatsApp

**Tutup Stok Sore:**
- Input stok sisa yang dikembalikan ke gudang
- Sistem hitung: stok awal - terjual - retur = sisa (validasi)
- Rekap total penjualan hari ini

---

### MARCO — Courier Delivery

**Delivery Queue:**
- List DO hari ini yang di-assign ke driver ini
- Status: assigned, in_transit, delivered, failed
- Sort by rute terdekat

**Detail DO:**
- Info penerima + alamat + nomor telpon
- Tombol: Navigasi, Mulai Antar, Gagal Antar

**Proof of Delivery:**
- Foto paket/penerimaan (wajib)
- Nama penerima (input manual atau tanda tangan digital opsional)
- Timestamp + GPS auto-capture
- Submit → status jadi delivered

---

## 7. Offline Support

Semua transaksi di-queue lokal (SQLite) jika tidak ada koneksi:
- Check-in / check-out kunjungan
- Order baru (Marsa)
- Invoice baru (Marca)
- POD (Marco) — foto disimpan lokal, upload saat online

Sync otomatis background saat koneksi pulih. Badge di header menunjukkan jumlah transaksi pending sync.

---

## 8. Integrasi dengan MarketIntel

- `sfa_leads` di-populate dari `subscriber_leads` milik owner company di MarketIntel
- Owner bisa import leads dari backoffice web (tombol "Impor dari Directory Search")
- Data outlet (nama, alamat, telepon, koordinat) sudah tersedia tanpa input manual

---

## 9. Pending / Belum Diputuskan

- [ ] Tech stack untuk invoice print: Bluetooth thermal printer atau PDF share via WhatsApp?
- [ ] Apakah Marco perlu fitur multi-stop optimization (TSP routing)?
- [ ] Tanda tangan digital di POD: pakai react-native-signature-canvas?
- [ ] Apakah Marca perlu fitur piutang/kredit atau selalu cash?
- [ ] Push notification untuk new order assignment (Marsa) atau new DO (Marco)
