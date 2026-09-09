import { createClient } from '@/lib/supabase/server'
import { Json } from '@/types/database.types'

export interface SaveBrandProfileInput {
  positioning?: string
  promise?: string
  story?: string
  personality?: string[]
  values?: string[]
  tone?: { description?: string; [key: string]: unknown }
  preferredVocabulary?: string[]
  avoidedVocabulary?: string[]
  signaturePhrases?: string[]
  communicationDo?: string[]
  communicationDont?: string[]
}

export interface BrandProfileResult {
  brand_profile_id: string
  business_id: string
  created: boolean
}

export interface BrandProfileSummary {
  id: string
  business_id: string
  positioning: string | null
  promise: string | null
  story: string | null
  personality: string[]
  values: string[]
  tone: { description?: string; [key: string]: unknown }
  preferred_vocabulary: string[]
  avoided_vocabulary: string[]
  signature_phrases: string[]
  communication_do: string[]
  communication_dont: string[]
}

/**
 * Utility helper to convert comma/newline-separated strings or arrays
 * into clean, trimmed, non-empty, deduplicated string arrays.
 */
export function parseListInput(input?: string | string[] | null): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map((item) => item.trim()).filter(Boolean)))
  }
  return Array.from(
    new Set(
      input
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

/**
 * Server-side service to atomically save or update the Brand Profile via RPC.
 */
export async function saveBrandProfile(
  input: SaveBrandProfileInput
): Promise<{ data: BrandProfileResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('save_brand_profile', {
      p_positioning: input.positioning || null,
      p_promise: input.promise || null,
      p_story: input.story || null,
      p_personality: (input.personality || []) as Json,
      p_values: (input.values || []) as Json,
      p_tone: (input.tone || {}) as Json,
      p_preferred_vocabulary: (input.preferredVocabulary || []) as Json,
      p_avoided_vocabulary: (input.avoidedVocabulary || []) as Json,
      p_signature_phrases: (input.signaturePhrases || []) as Json,
      p_communication_do: (input.communicationDo || []) as Json,
      p_communication_dont: (input.communicationDont || []) as Json,
    })

    if (error) {
      console.error('Error executing save_brand_profile RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as BrandProfileResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue lors de l\'enregistrement du profil de marque'
    console.error('Unexpected error in saveBrandProfile:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to fetch the Brand Profile of a given Business.
 */
export async function getBrandProfile(businessId: string): Promise<{
  brandProfile: BrandProfileSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching brand profile:', error.message)
      return { brandProfile: null, error: error.message }
    }

    if (!data) {
      return { brandProfile: null, error: null }
    }

    const brandProfile: BrandProfileSummary = {
      id: data.id,
      business_id: data.business_id,
      positioning: data.positioning,
      promise: data.promise,
      story: data.story,
      personality: Array.isArray(data.personality) ? (data.personality as string[]) : [],
      values: Array.isArray(data.values) ? (data.values as string[]) : [],
      tone: (typeof data.tone === 'object' && data.tone !== null ? data.tone : {}) as { description?: string },
      preferred_vocabulary: Array.isArray(data.preferred_vocabulary) ? (data.preferred_vocabulary as string[]) : [],
      avoided_vocabulary: Array.isArray(data.avoided_vocabulary) ? (data.avoided_vocabulary as string[]) : [],
      signature_phrases: Array.isArray(data.signature_phrases) ? (data.signature_phrases as string[]) : [],
      communication_do: Array.isArray(data.communication_do) ? (data.communication_do as string[]) : [],
      communication_dont: Array.isArray(data.communication_dont) ? (data.communication_dont as string[]) : [],
    }

    return { brandProfile, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération du profil de marque'
    console.error('Unexpected error in getBrandProfile:', message)
    return { brandProfile: null, error: message }
  }
}
