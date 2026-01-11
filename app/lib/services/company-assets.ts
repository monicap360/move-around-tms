import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type {
  CompanyAsset,
  CreateCompanyAssetInput,
  UpdateCompanyAssetInput,
} from "@/lib/types/company-assets";

/**
 * Server-side service for managing company assets
 */
export class CompanyAssetsService {
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
      },
    );
  }

  /**
   * Get all assets for the current user
   */
  static async getAssets(assetType?: "company_logo" | "ticket_template") {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from("company_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (assetType) {
      query = query.eq("asset_type", assetType);
    }

    return await query;
  }

  /**
   * Get a specific asset by ID
   */
  static async getAssetById(id: string) {
    const supabase = await this.getSupabaseClient();

    return await supabase
      .from("company_assets")
      .select("*")
      .eq("id", id)
      .single();
  }

  /**
   * Create a new company asset
   */
  static async createAsset(input: CreateCompanyAssetInput) {
    const supabase = await this.getSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    return await supabase
      .from("company_assets")
      .insert({
        ...input,
        user_id: user.id,
      })
      .select()
      .single();
  }

  /**
   * Update an existing asset
   */
  static async updateAsset(id: string, input: UpdateCompanyAssetInput) {
    const supabase = await this.getSupabaseClient();

    return await supabase
      .from("company_assets")
      .update(input)
      .eq("id", id)
      .select()
      .single();
  }

  /**
   * Delete an asset
   */
  static async deleteAsset(id: string) {
    const supabase = await this.getSupabaseClient();

    return await supabase.from("company_assets").delete().eq("id", id);
  }

  /**
   * Get assets by tags
   */
  static async getAssetsByTags(tags: string[]) {
    const supabase = await this.getSupabaseClient();

    return await supabase
      .from("company_assets")
      .select("*")
      .contains("tags", tags)
      .order("created_at", { ascending: false });
  }

  /**
   * Get the most recent company logo
   */
  static async getCurrentLogo() {
    const supabase = await this.getSupabaseClient();

    return await supabase
      .from("company_assets")
      .select("*")
      .eq("asset_type", "company_logo")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
  }
}
