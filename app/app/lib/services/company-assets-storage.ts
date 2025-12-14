import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side service for managing company assets storage
 */
export class CompanyAssetsStorageService {
  private static async getSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  }

  /**
   * Upload a company logo
   */
  static async uploadLogo(file: File, filename?: string) {
    const supabase = await this.getSupabaseClient();
    
    // Generate unique filename if not provided
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFilename = filename || `logo_${timestamp}.${fileExtension}`;
    const filePath = `logos/${finalFilename}`;

    const { data, error } = await supabase.storage
      .from('company_assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting existing files
      });

    return { data, error, filePath: data?.path };
  }

  /**
   * Upload a ticket template
   */
  static async uploadTicketTemplate(file: File, filename?: string) {
    const supabase = await this.getSupabaseClient();
    
    // Generate unique filename if not provided
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFilename = filename || `template_${timestamp}.${fileExtension}`;
    const filePath = `templates/tickets/${finalFilename}`;

    const { data, error } = await supabase.storage
      .from('company_assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    return { data, error, filePath: data?.path };
  }

  /**
   * Get public URL for a file
   */
  static async getPublicUrl(filePath: string) {
    const supabase = await this.getSupabaseClient();
    
    const { data } = supabase.storage
      .from('company_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Get signed URL for private access (if needed)
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600) {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from('company_assets')
      .createSignedUrl(filePath, expiresIn);

    return { data, error };
  }

  /**
   * List files in a specific folder
   */
  static async listFiles(prefix: 'logos' | 'templates/tickets' = 'logos') {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from('company_assets')
      .list(prefix, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    return { data, error };
  }

  /**
   * Delete a file
   */
  static async deleteFile(filePath: string) {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from('company_assets')
      .remove([filePath]);

    return { data, error };
  }

  /**
   * Download a file
   */
  static async downloadFile(filePath: string) {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from('company_assets')
      .download(filePath);

    return { data, error };
  }

  /**
   * Get file metadata
   */
  static async getFileInfo(filePath: string) {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from('company_assets')
      .list('', {
        search: filePath.split('/').pop() // Get filename from path
      });

    return { data, error };
  }

  /**
   * Validate file type for uploads
   */
  static validateFileType(file: File, assetType: 'company_logo' | 'ticket_template'): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB max

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    // Define allowed MIME types
    const allowedTypes = {
      company_logo: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ],
      ticket_template: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json'
      ]
    };

    if (!allowedTypes[assetType].includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types for ${assetType}: ${allowedTypes[assetType].join(', ')}` 
      };
    }

    return { valid: true };
  }
}