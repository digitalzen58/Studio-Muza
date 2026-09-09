import { createClient } from '@/lib/supabase/server'
import { Json } from '@/types/database.types'
import { parseListInput } from '@/services/brand'

export { parseListInput }

export interface SaveCreatorProfileInput {
  weeklyMinutes?: number | null
  cameraComfort?: number | null
  voiceoverComfort?: number | null
  writingComfort?: number | null
  photoComfort?: number | null
  videoComfort?: number | null
  socialSkillLevel?: string | null
  preferredFormats?: string[]
  avoidedFormats?: string[]
  barriers?: string[]
  strengths?: string[]
  maxEffortLevel?: number | null
}

export interface CreatorProfileResult {
  creator_profile_id: string
  business_id: string
  user_id: string
  created: boolean
}

export interface CreatorProfileSummary {
  id: string
  business_id: string
  user_id: string
  weekly_minutes: number | null
  camera_comfort: number | null
  voiceover_comfort: number | null
  writing_comfort: number | null
  photo_comfort: number | null
  video_comfort: number | null
  social_skill_level: string | null
  preferred_formats: string[]
  avoided_formats: string[]
  barriers: string[]
  strengths: string[]
  max_effort_level: number | null
}

/**
 * Server-side service to save or update the Creator Profile via RPC.
 */
export async function saveCreatorProfile(
  input: SaveCreatorProfileInput
): Promise<{ data: CreatorProfileResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('save_creator_profile', {
      p_weekly_minutes: input.weeklyMinutes ?? null,
      p_camera_comfort: input.cameraComfort ?? null,
      p_voiceover_comfort: input.voiceoverComfort ?? null,
      p_writing_comfort: input.writingComfort ?? null,
      p_photo_comfort: input.photoComfort ?? null,
      p_video_comfort: input.videoComfort ?? null,
      p_social_skill_level: input.socialSkillLevel || null,
      p_preferred_formats: (input.preferredFormats || []) as Json,
      p_avoided_formats: (input.avoidedFormats || []) as Json,
      p_barriers: (input.barriers || []) as Json,
      p_strengths: (input.strengths || []) as Json,
      p_max_effort_level: input.maxEffortLevel ?? null,
    })

    if (error) {
      console.error('Error executing save_creator_profile RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as CreatorProfileResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue lors de l\'enregistrement du profil créateur'
    console.error('Unexpected error in saveCreatorProfile:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to fetch the Creator Profile of a given Business.
 */
export async function getCreatorProfile(businessId: string): Promise<{
  creatorProfile: CreatorProfileSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching creator profile:', error.message)
      return { creatorProfile: null, error: error.message }
    }

    if (!data) {
      return { creatorProfile: null, error: null }
    }

    const creatorProfile: CreatorProfileSummary = {
      id: data.id,
      business_id: data.business_id,
      user_id: data.user_id,
      weekly_minutes: data.weekly_minutes,
      camera_comfort: data.camera_comfort,
      voiceover_comfort: data.voiceover_comfort,
      writing_comfort: data.writing_comfort,
      photo_comfort: data.photo_comfort,
      video_comfort: data.video_comfort,
      social_skill_level: data.social_skill_level,
      preferred_formats: Array.isArray(data.preferred_formats) ? (data.preferred_formats as string[]) : [],
      avoided_formats: Array.isArray(data.avoided_formats) ? (data.avoided_formats as string[]) : [],
      barriers: Array.isArray(data.barriers) ? (data.barriers as string[]) : [],
      strengths: Array.isArray(data.strengths) ? (data.strengths as string[]) : [],
      max_effort_level: data.max_effort_level,
    }

    return { creatorProfile, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération du profil créateur'
    console.error('Unexpected error in getCreatorProfile:', message)
    return { creatorProfile: null, error: message }
  }
}
