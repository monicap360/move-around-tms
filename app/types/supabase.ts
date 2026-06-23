// Auto-generate this file with: npx supabase gen types typescript --project-id <your-project-id>
// This stub satisfies imports until the real types are generated.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: { [key: string]: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> } };
    Views: { [key: string]: { Row: Record<string, unknown> } };
    Functions: { [key: string]: unknown };
    Enums: { [key: string]: string };
  };
}
