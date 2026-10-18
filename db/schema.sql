-- MarketIntel standalone Postgres schema (GCP VM deployment)
-- Replaces Supabase auth.users + auth.uid() with a self-hosted equivalent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- AUTH: self-hosted users/sessions (replaces Supabase auth.users + GoTrue)
-- NEVER granted to marketintel_app below — not reachable via PostgREST/REST.
-- Only the Deno API's admin connection (marketintel_admin, the owner) may
-- read/write these two tables directly.
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_sessions (
  refresh_token TEXT PRIMARY KEY,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);

-- RLS identity function: mirrors Supabase's auth.uid(), but reads the
-- 'sub' claim from request.jwt.claims — the same GUC PostgREST sets from
-- the verified JWT. Our own API sets the same GUC manually via
-- set_config('request.jwt.claims', ..., true) before running user-scoped
-- queries, so both PostgREST and the Deno API share one identity mechanism.
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- CORE DOMAIN TABLES (ported from Supabase migrations)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES app_users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  credits_remaining INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON profiles FOR SELECT USING (app_current_user_id() = id);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (app_current_user_id() = id);
CREATE POLICY "own_profile_insert" ON profiles FOR INSERT WITH CHECK (app_current_user_id() = id);

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'input_complete', 'analyzing', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_projects_select" ON projects FOR SELECT USING (app_current_user_id() = user_id);
CREATE POLICY "own_projects_insert" ON projects FOR INSERT WITH CHECK (app_current_user_id() = user_id);
CREATE POLICY "own_projects_update" ON projects FOR UPDATE USING (app_current_user_id() = user_id);
CREATE POLICY "own_projects_delete" ON projects FOR DELETE USING (app_current_user_id() = user_id);

CREATE TABLE IF NOT EXISTS business_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  product_description TEXT,
  price_range_min INT,
  price_range_max INT,
  unique_selling_point TEXT,
  business_scale TEXT CHECK (business_scale IN ('gerobak', 'rumahan', 'mikro', 'kecil', 'menengah', 'besar')),
  monthly_budget INT,
  target_age_min INT DEFAULT 12,
  target_age_max INT DEFAULT 45,
  target_gender TEXT DEFAULT 'semua' CHECK (target_gender IN ('semua', 'pria', 'wanita')),
  target_segments TEXT[],
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  districts TEXT[] NOT NULL,
  specific_locations TEXT,
  known_competitors TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_inputs_select" ON business_inputs FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_inputs_insert" ON business_inputs FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_inputs_update" ON business_inputs FOR UPDATE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_inputs_delete" ON business_inputs FOR DELETE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL CHECK (section IN (
    'executive_summary', 'demographic_analysis', 'psychographic_analysis',
    'location_mapping', 'competitor_analysis', 'product_gap',
    'action_plan', 'irresistible_offer', '_metadata',
    'location_reasoning', 'commute_flow', 'economic_v3_meta'
  )),
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_results_select" ON analysis_results FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_results_insert" ON analysis_results FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

CREATE TABLE IF NOT EXISTS strategic_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  district TEXT,
  score DECIMAL(3,1),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  strengths TEXT[],
  weaknesses TEXT[],
  innovations TEXT[],
  is_blind_spot BOOLEAN DEFAULT FALSE,
  blind_spot_reason TEXT,
  rank INT,
  score_breakdown JSONB DEFAULT NULL,
  location_criteria TEXT,
  parking_ease TEXT
);

ALTER TABLE strategic_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_locations_select" ON strategic_locations FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_locations_insert" ON strategic_locations FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_locations_update" ON strategic_locations FOR UPDATE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

CREATE TABLE IF NOT EXISTS economic_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  district TEXT NOT NULL,
  population_total BIGINT,
  village_count INT,
  urban_village_count INT,
  rural_village_count INT,
  location_type TEXT,
  city_expenditure_avg BIGINT,
  expenditure_level TEXT,
  estimated_district_income BIGINT,
  mobility_rate NUMERIC(4,3),
  capture_rate NUMERIC(4,3),
  estimated_daily_customers BIGINT,
  base_price BIGINT,
  income_multiplier NUMERIC(3,2),
  avg_transaction BIGINT,
  estimated_daily_revenue BIGINT,
  estimated_monthly_revenue BIGINT,
  recommended_price_min INT,
  recommended_price_max INT,
  pricing_strategy TEXT,
  estimated_margin_pct NUMERIC(4,2),
  estimated_monthly_cost BIGINT,
  estimated_monthly_profit BIGINT,
  initial_capital BIGINT,
  bep_days INT,
  omzet_konservatif NUMERIC DEFAULT 0,
  omzet_moderat NUMERIC DEFAULT 0,
  omzet_optimistis NUMERIC DEFAULT 0,
  omzet_topdown NUMERIC DEFAULT 0,
  omzet_bottomup NUMERIC DEFAULT 0,
  target_ratio NUMERIC DEFAULT 0,
  category_spending_ratio NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  competitor_quality_factor NUMERIC DEFAULT 1.0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE economic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_economic_select" ON economic_results FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_economic_insert" ON economic_results FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_economic_delete" ON economic_results FOR DELETE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

CREATE TABLE IF NOT EXISTS decision_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  district TEXT NOT NULL,
  population_score NUMERIC(4,2),
  traffic_score NUMERIC(4,2),
  income_score NUMERIC(4,2),
  competitor_gap_score NUMERIC(4,2),
  density_score NUMERIC(4,2),
  market_score NUMERIC(4,2),
  decision TEXT,
  decision_reason TEXT,
  tradeoff_label TEXT,
  tradeoff_detail TEXT,
  insight_strength TEXT,
  insight_weakness TEXT,
  insight_recommendation TEXT,
  insight_summary TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE decision_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_decision_select" ON decision_results FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_decision_insert" ON decision_results FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_decision_delete" ON decision_results FOR DELETE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

CREATE TABLE IF NOT EXISTS location_scores_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  location_label TEXT NOT NULL,
  district TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT DEFAULT 1000,
  score_competitor_density DECIMAL(3,2) DEFAULT 0,
  score_rating_gap DECIMAL(3,2) DEFAULT 0,
  score_traffic_level DECIMAL(3,2) DEFAULT 0,
  score_landmark_potential DECIMAL(3,2) DEFAULT 0,
  score_total DECIMAL(4,2) DEFAULT 0,
  raw_competitor_count INT DEFAULT 0,
  raw_competitor_names JSONB,
  raw_avg_competitor_rating DECIMAL(2,1),
  raw_landmark_count INT DEFAULT 0,
  raw_landmarks JSONB,
  raw_traffic_generators INT DEFAULT 0,
  raw_congestion_ratio DECIMAL(3,2),
  raw_avg_review_volume INT DEFAULT 0,
  product_type_searched TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  api_calls_used INT DEFAULT 0,
  api_cost_usd DECIMAL(6,4) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_location_cache_coords ON location_scores_cache (latitude, longitude, radius_meters);
CREATE INDEX IF NOT EXISTS idx_location_cache_expiry ON location_scores_cache (expires_at);

ALTER TABLE location_scores_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_location_cache_select" ON location_scores_cache FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_location_cache_insert" ON location_scores_cache FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);
CREATE POLICY "own_location_cache_delete" ON location_scores_cache FOR DELETE USING (
  project_id IN (SELECT id FROM projects WHERE user_id = app_current_user_id())
);

-- ============================================================
-- REFERENCE / PUBLIC DATA (read-only for the app, seeded from exports)
-- ============================================================
CREATE TABLE IF NOT EXISTS population_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT NOT NULL,
  village_code TEXT,
  status TEXT,
  male_population INTEGER DEFAULT 0,
  female_population INTEGER DEFAULT 0,
  total_population INTEGER DEFAULT 0,
  household_count INTEGER DEFAULT 0,
  density_per_km2 NUMERIC DEFAULT 0,
  data_date DATE,
  province_csv TEXT,
  city_csv TEXT,
  district_csv TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE population_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_population" ON population_data FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_population_province_city_district ON population_data(province, city, district);

CREATE TABLE IF NOT EXISTS bps_food_data (
  id BIGINT PRIMARY KEY,
  kabupaten_kota TEXT,
  kelompok TEXT,
  kelompok_label TEXT,
  sub_komoditas TEXT,
  is_total BOOLEAN DEFAULT false,
  metric_type TEXT,
  value_amount NUMERIC,
  year INT
);
ALTER TABLE bps_food_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_bps_food" ON bps_food_data FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_bps_food_kabkota ON bps_food_data(kabupaten_kota, kelompok);

CREATE TABLE IF NOT EXISTS bps_national_averages (
  id BIGINT PRIMARY KEY,
  kelompok TEXT,
  sub_komoditas TEXT,
  metric_type TEXT,
  avg_nasional NUMERIC,
  count_kab INT,
  year INT
);
ALTER TABLE bps_national_averages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_bps_national" ON bps_national_averages FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS engine_parameters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  param_key TEXT NOT NULL,
  param_value DECIMAL NOT NULL,
  param_min DECIMAL,
  param_max DECIMAL,
  description TEXT,
  data_source TEXT DEFAULT 'assumed',
  confidence TEXT DEFAULT 'assumed',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  UNIQUE(category, param_key)
);
ALTER TABLE engine_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_engine_params" ON engine_parameters FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS commodity_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_wilayah TEXT,
  provinsi TEXT,
  kabupaten_kota TEXT,
  kabupaten_kota_raw TEXT,
  komoditas TEXT,
  het NUMERIC,
  harga_terkini NUMERIC,
  harga_sebelumnya NUMERIC,
  perubahan_pct NUMERIC,
  tanggal_data DATE,
  tanggal_sebelumnya DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE commodity_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_commodity_prices" ON commodity_prices FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_commodity_prices_kabkota ON commodity_prices(kabupaten_kota, komoditas);

CREATE TABLE IF NOT EXISTS food_business_ideas (
  id BIGINT PRIMARY KEY,
  kelompok TEXT,
  sub_komoditas TEXT,
  business_ideas TEXT[],
  business_category TEXT,
  marketintel_category TEXT,
  icon TEXT,
  cross_commodity_deps TEXT[]
);
ALTER TABLE food_business_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_food_ideas" ON food_business_ideas FOR SELECT USING (true);

-- ============================================================
-- Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- APP ROLE — created LAST, granted ONLY on business tables.
-- CRITICAL: this must be a DIFFERENT role from the schema owner
-- (POSTGRES_USER / marketintel_admin, which runs this whole script) —
-- Postgres table owners bypass RLS by default, so if PostgREST or the API
-- connected as the owner, every RLS policy above would be silently ignored.
-- app_users / app_sessions are deliberately NOT granted here: PostgREST
-- (which only ever connects as marketintel_app) can never read or write
-- them, so password hashes and refresh tokens are unreachable via REST.
-- Only the API's separate admin connection (marketintel_admin) touches them.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marketintel_app') THEN
    CREATE ROLE marketintel_app LOGIN PASSWORD '__APP_DB_PASSWORD__';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO marketintel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  profiles, projects, business_inputs, analysis_results,
  strategic_locations, location_scores_cache,
  economic_results, decision_results,
  population_data, bps_food_data, bps_national_averages,
  engine_parameters, food_business_ideas, commodity_prices
TO marketintel_app;

-- ============================================================
-- RPC FUNCTIONS the frontend calls via supabase.rpc(...)
-- ============================================================

-- GCP demo build: credit/package gating is intentionally out of scope.
-- The frontend still calls this RPC and throws if it errors, so provide
-- a harmless no-op instead of enforcing/decrementing anything.
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INT)
RETURNS VOID AS $$
BEGIN
  -- no-op: credit enforcement is out of scope for this deployment
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INT) TO marketintel_app;

-- Used by the admin FoodIntel data page to build filter dropdowns.
-- col_name is restricted to a fixed allowlist since it's interpolated
-- into dynamic SQL (identifiers can't be bound as query parameters).
CREATE OR REPLACE FUNCTION bps_distinct_values(col_name TEXT)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  IF col_name NOT IN ('kabupaten_kota', 'kelompok', 'metric_type') THEN
    RAISE EXCEPTION 'Unsupported column: %', col_name;
  END IF;
  EXECUTE format('SELECT array_agg(DISTINCT %I ORDER BY %I) FROM bps_food_data WHERE %I IS NOT NULL', col_name, col_name, col_name)
    INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION bps_distinct_values(TEXT) TO marketintel_app;
