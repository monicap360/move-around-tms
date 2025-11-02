-- Company Assets Management Schema
-- Store metadata for company logos, templates, and other assets

-- Company Assets table for storing metadata about uploaded files
CREATE TABLE IF NOT EXISTS company_assets (
    id BIGSERIAL PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('company_logo', 'ticket_template', 'form_template', 'document_template')),
    file_path TEXT NOT NULL, -- Storage path in Supabase
    original_filename VARCHAR(255) NOT NULL,
    description TEXT,
    file_size INTEGER, -- File size in bytes
    mime_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true, -- Whether this asset is currently in use
    version INTEGER DEFAULT 1, -- Version number for asset updates
    tags TEXT[], -- Array of tags for categorization
    uploaded_by UUID REFERENCES auth.users(id), -- Who uploaded the asset
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Additional metadata (dimensions, colors, etc.)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_assets_type ON company_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_company_assets_active ON company_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_company_assets_uploaded_at ON company_assets(uploaded_at);

-- Row Level Security
ALTER TABLE company_assets ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read active assets
CREATE POLICY "company_assets_read_policy" ON company_assets
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Policy: Only admins can insert/update/delete assets  
CREATE POLICY "company_assets_admin_policy" ON company_assets
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        (
            auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin' OR
            auth.jwt() ->> 'user_metadata' ->> 'role' = 'super_admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_company_assets_updated_at
    BEFORE UPDATE ON company_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_company_assets_updated_at();

-- Sample data for Ronyx Logistics
INSERT INTO company_assets (asset_type, file_path, original_filename, description, is_active, tags) VALUES
('company_logo', 'logos/sample-ronyx-logo.png', 'ronyx-logistics-logo.png', 'Official Ronyx Logistics LLC company logo', true, ARRAY['branding', 'official', 'logo']),
('ticket_template', 'templates/tickets/sample-ticket-template.pdf', 'blank-ticket-template.pdf', 'Standard ticket template for material hauling', true, ARRAY['template', 'ticket', 'billing']),
('form_template', 'templates/forms/driver-application.pdf', 'driver-application-form.pdf', 'Driver employment application form', true, ARRAY['hr', 'application', 'driver']);

-- View for active assets with additional metadata
CREATE OR REPLACE VIEW active_company_assets AS
SELECT 
    id,
    asset_type,
    file_path,
    original_filename,
    description,
    version,
    tags,
    uploaded_at,
    updated_at,
    metadata
FROM company_assets 
WHERE is_active = true
ORDER BY asset_type, version DESC, uploaded_at DESC;

-- Function to get the latest version of an asset type
CREATE OR REPLACE FUNCTION get_latest_asset(p_asset_type VARCHAR)
RETURNS TABLE (
    id BIGINT,
    file_path TEXT,
    original_filename VARCHAR,
    description TEXT,
    version INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.file_path,
        a.original_filename,
        a.description,
        a.version,
        a.uploaded_at
    FROM company_assets a
    WHERE a.asset_type = p_asset_type 
    AND a.is_active = true
    ORDER BY a.version DESC, a.uploaded_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old versions when uploading new ones
CREATE OR REPLACE FUNCTION archive_old_asset_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new version of an existing asset type, archive the old ones
    IF NEW.asset_type IS NOT NULL THEN
        UPDATE company_assets 
        SET is_active = false 
        WHERE asset_type = NEW.asset_type 
        AND id != NEW.id 
        AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically archive old versions
CREATE TRIGGER trigger_archive_old_asset_versions
    AFTER INSERT ON company_assets
    FOR EACH ROW
    EXECUTE FUNCTION archive_old_asset_versions();

-- Grant permissions
GRANT ALL ON company_assets TO authenticated;
GRANT ALL ON SEQUENCE company_assets_id_seq TO authenticated;
GRANT SELECT ON active_company_assets TO authenticated;