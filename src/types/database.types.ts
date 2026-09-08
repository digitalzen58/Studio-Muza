/**
 * Studio Mūza Database Types
 * 
 * Note: These type definitions will be automatically generated from your live Supabase
 * schema using the Supabase CLI in a subsequent step:
 * 
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
 * 
 * The initial architecture is prepared below.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      workspace_members: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      businesses: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      subscriptions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_initial_workspace: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_initial_business: {
        Args: {
          p_name: string;
          p_industry: string;
          p_subindustry?: string | null;
          p_description?: string | null;
          p_website_url?: string | null;
          p_country_code?: string | null;
          p_region?: string | null;
          p_city?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}
