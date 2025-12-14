-- Add organization_code to organizations table
ALTER TABLE organizations
ADD COLUMN organization_code TEXT NOT NULL UNIQUE;

-- Backfill for existing organizations (example: lowercased, hyphenated names)
UPDATE organizations
SET organization_code = LOWER(REPLACE(name, ' ', '-'))
WHERE organization_code IS NULL;

-- Create index for fast lookup
CREATE INDEX organizations_organization_code_idx ON organizations(organization_code);