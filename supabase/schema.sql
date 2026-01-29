-- TMS Supabase schema (optioneel: run in Supabase SQL Editor)
-- Gebruik dit als je laadvloer- en route-planningen in Supabase wilt opslaan.

-- Laadvloer-plannen (visualisatie)
CREATE TABLE IF NOT EXISTS load_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Laadplan',
  trailer_type TEXT NOT NULL CHECK (trailer_type IN ('BACHE', 'FRIGO', 'STUKGOED')),
  trailer_length_mm INT NOT NULL,
  trailer_width_mm INT NOT NULL,
  trailer_height_mm INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Palletten op laadvloer
CREATE TABLE IF NOT EXISTS load_floor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES load_floor_plans(id) ON DELETE CASCADE,
  label TEXT,
  length_mm INT NOT NULL,
  width_mm INT NOT NULL,
  height_mm INT NOT NULL,
  position_x_mm INT NOT NULL DEFAULT 0,
  position_y_mm INT NOT NULL DEFAULT 0,
  rotation_deg INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Route-planningen (los-/laadlocaties + ETA)
CREATE TABLE IF NOT EXISTS route_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Route',
  start_at TIMESTAMPTZ NOT NULL,
  avg_speed_kmh INT NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stops per route
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  stop_type TEXT NOT NULL CHECK (stop_type IN ('PICKUP', 'DELIVERY')),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'NL',
  contact_name TEXT,
  contact_phone TEXT,
  eta TIMESTAMPTZ,
  drive_minutes_from_prev INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (optioneel: aanzetten als je Supabase Auth gebruikt)
-- ALTER TABLE load_floor_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE load_floor_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
