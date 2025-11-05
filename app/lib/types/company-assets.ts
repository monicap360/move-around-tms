// Types for company_assets table
export interface CompanyAsset {
  id: string;
  user_id: string | null;
  asset_type: 'company_logo' | 'ticket_template';
  file_path: string;
  original_filename: string;
  description?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface CreateCompanyAssetInput {
  asset_type: 'company_logo' | 'ticket_template';
  file_path: string;
  original_filename: string;
  description?: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCompanyAssetInput {
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// API response types
export interface CompanyAssetsResponse {
  data: CompanyAsset[] | null;
  error: Error | null;
}

export interface CompanyAssetResponse {
  data: CompanyAsset | null;
  error: Error | null;
}