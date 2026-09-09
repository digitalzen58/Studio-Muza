import { createClient } from '@/lib/supabase/server'
import { Json } from '@/types/database.types'
import { parseListInput } from '@/services/brand'

export { parseListInput }

export interface SavePrimaryAudienceInput {
  name: string
  description?: string
  needs?: string[]
  desires?: string[]
  problems?: string[]
  objections?: string[]
  motivations?: string[]
  questions?: string[]
  buyingTriggers?: string[]
  languagePatterns?: string[]
}

export interface AudienceResult {
  audience_id: string
  business_id: string
  created: boolean
}

export interface AudienceSummary {
  id: string
  business_id: string
  name: string
  description: string | null
  needs: string[]
  desires: string[]
  problems: string[]
  objections: string[]
  motivations: string[]
  questions: string[]
  buying_triggers: string[]
  language_patterns: string[]
  priority: number
  active: boolean
}

/**
 * Server-side service to save or update the primary Audience via RPC.
 */
export async function savePrimaryAudience(
  input: SavePrimaryAudienceInput
): Promise<{ data: AudienceResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('save_primary_audience', {
      p_name: input.name,
      p_description: input.description || null,
      p_needs: (input.needs || []) as Json,
      p_desires: (input.desires || []) as Json,
      p_problems: (input.problems || []) as Json,
      p_objections: (input.objections || []) as Json,
      p_motivations: (input.motivations || []) as Json,
      p_questions: (input.questions || []) as Json,
      p_buying_triggers: (input.buyingTriggers || []) as Json,
      p_language_patterns: (input.languagePatterns || []) as Json,
    })

    if (error) {
      console.error('Error executing save_primary_audience RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as AudienceResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue lors de l\'enregistrement de l\'audience'
    console.error('Unexpected error in savePrimaryAudience:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to fetch the primary active Audience for a given Business.
 */
export async function getPrimaryAudience(businessId: string): Promise<{
  audience: AudienceSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audiences')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching primary audience:', error.message)
      return { audience: null, error: error.message }
    }

    if (!data) {
      return { audience: null, error: null }
    }

    const audience: AudienceSummary = {
      id: data.id,
      business_id: data.business_id,
      name: data.name,
      description: data.description,
      needs: Array.isArray(data.needs) ? (data.needs as string[]) : [],
      desires: Array.isArray(data.desires) ? (data.desires as string[]) : [],
      problems: Array.isArray(data.problems) ? (data.problems as string[]) : [],
      objections: Array.isArray(data.objections) ? (data.objections as string[]) : [],
      motivations: Array.isArray(data.motivations) ? (data.motivations as string[]) : [],
      questions: Array.isArray(data.questions) ? (data.questions as string[]) : [],
      buying_triggers: Array.isArray(data.buying_triggers) ? (data.buying_triggers as string[]) : [],
      language_patterns: Array.isArray(data.language_patterns) ? (data.language_patterns as string[]) : [],
      priority: data.priority,
      active: data.active,
    }

    return { audience, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération de l\'audience'
    console.error('Unexpected error in getPrimaryAudience:', message)
    return { audience: null, error: message }
  }
}
