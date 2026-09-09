/**
 * Studio Mūza Database Types
 * 
 * Note: These type definitions will be automatically generated from your live Supabase
 * schema using the Supabase CLI in a subsequent step:
 * 
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
 * 
 * The architecture is prepared below.
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
      brand_profiles: {
        Row: {
          id: string;
          business_id: string;
          positioning: string | null;
          promise: string | null;
          story: string | null;
          personality: Json;
          values: Json;
          tone: Json;
          humor_level: number | null;
          commercial_intensity: number | null;
          formality_level: number | null;
          preferred_vocabulary: Json;
          avoided_vocabulary: Json;
          signature_phrases: Json;
          communication_do: Json;
          communication_dont: Json;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          positioning?: string | null;
          promise?: string | null;
          story?: string | null;
          personality?: Json;
          values?: Json;
          tone?: Json;
          humor_level?: number | null;
          commercial_intensity?: number | null;
          formality_level?: number | null;
          preferred_vocabulary?: Json;
          avoided_vocabulary?: Json;
          signature_phrases?: Json;
          communication_do?: Json;
          communication_dont?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          positioning?: string | null;
          promise?: string | null;
          story?: string | null;
          personality?: Json;
          values?: Json;
          tone?: Json;
          humor_level?: number | null;
          commercial_intensity?: number | null;
          formality_level?: number | null;
          preferred_vocabulary?: Json;
          avoided_vocabulary?: Json;
          signature_phrases?: Json;
          communication_do?: Json;
          communication_dont?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      creator_profiles: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          weekly_minutes: number | null;
          camera_comfort: number | null;
          voiceover_comfort: number | null;
          writing_comfort: number | null;
          photo_comfort: number | null;
          video_comfort: number | null;
          social_skill_level: string | null;
          preferred_formats: Json;
          avoided_formats: Json;
          barriers: Json;
          strengths: Json;
          max_effort_level: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          weekly_minutes?: number | null;
          camera_comfort?: number | null;
          voiceover_comfort?: number | null;
          writing_comfort?: number | null;
          photo_comfort?: number | null;
          video_comfort?: number | null;
          social_skill_level?: string | null;
          preferred_formats?: Json;
          avoided_formats?: Json;
          barriers?: Json;
          strengths?: Json;
          max_effort_level?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          weekly_minutes?: number | null;
          camera_comfort?: number | null;
          voiceover_comfort?: number | null;
          writing_comfort?: number | null;
          photo_comfort?: number | null;
          video_comfort?: number | null;
          social_skill_level?: string | null;
          preferred_formats?: Json;
          avoided_formats?: Json;
          barriers?: Json;
          strengths?: Json;
          max_effort_level?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
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
      save_brand_profile: {
        Args: {
          p_positioning?: string | null;
          p_promise?: string | null;
          p_story?: string | null;
          p_personality?: Json;
          p_values?: Json;
          p_tone?: Json;
          p_preferred_vocabulary?: Json;
          p_avoided_vocabulary?: Json;
          p_signature_phrases?: Json;
          p_communication_do?: Json;
          p_communication_dont?: Json;
        };
        Returns: Json;
      };
      save_creator_profile: {
        Args: {
          p_weekly_minutes?: number | null;
          p_camera_comfort?: number | null;
          p_voiceover_comfort?: number | null;
          p_writing_comfort?: number | null;
          p_photo_comfort?: number | null;
          p_video_comfort?: number | null;
          p_social_skill_level?: string | null;
          p_preferred_formats?: Json;
          p_avoided_formats?: Json;
          p_barriers?: Json;
          p_strengths?: Json;
          p_max_effort_level?: number | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}
