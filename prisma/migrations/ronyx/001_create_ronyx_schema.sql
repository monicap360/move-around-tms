-- 1. Create Ronyx-specific schema
CREATE SCHEMA IF NOT EXISTS ronyx;

-- 2. Set search path for Ronyx connections
ALTER ROLE ronyx_user SET search_path TO ronyx, public;

-- 3. Create Ronyx-specific tables
CREATE TABLE IF NOT EXISTS ronyx.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL DEFAULT 'ronyx',
  material_code VARCHAR(50) NOT NULL,
  material_type VARCHAR(100) NOT NULL,
  description TEXT,
  supplier VARCHAR(200),
  stockpile_location VARCHAR(200),
  current_inventory DECIMAL(10,2),
  unit VARCHAR(20),
  base_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_ronyx_material UNIQUE (tenant_id, material_code)
);

-- 4. Create Ronyx row-level security policies
ALTER TABLE ronyx.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY ronyx_materials_policy ON ronyx.materials
  USING (tenant_id = current_setting('app.current_tenant')::VARCHAR);

-- 5. Create Ronyx-specific indexes
CREATE INDEX IF NOT EXISTS idx_ronyx_materials_tenant ON ronyx.materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ronyx_materials_code ON ronyx.materials(material_code);
