import { createClient } from '@/lib/supabase/server'
import { Json } from '@/types/database.types'
import { parseListInput } from '@/services/brand'

export { parseListInput }

export interface SavePrimaryOfferInput {
  name: string
  description?: string
  priceFrom?: number
  priceTo?: number
  currency?: string
  url?: string
  cta?: string
  benefits?: string[]
  objections?: string[]
  seasonality?: Record<string, unknown>
  availableFrom?: string
  availableUntil?: string
  priority?: number
}

export interface OfferResult {
  offer_id: string
  business_id: string
  created: boolean
}

export interface OfferSummary {
  id: string
  business_id: string
  name: string
  description: string | null
  price_from: number | null
  price_to: number | null
  currency: string | null
  url: string | null
  cta: string | null
  benefits: string[]
  objections: string[]
  seasonality: Record<string, unknown>
  available_from: string | null
  available_until: string | null
  priority: number
  active: boolean
}

/**
 * Server-side service to save or update the primary Offer via RPC.
 */
export async function savePrimaryOffer(
  input: SavePrimaryOfferInput
): Promise<{ data: OfferResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('save_primary_offer', {
      p_name: input.name,
      p_description: input.description || null,
      p_price_from: input.priceFrom !== undefined ? input.priceFrom : null,
      p_price_to: input.priceTo !== undefined ? input.priceTo : null,
      p_currency: input.currency || 'EUR',
      p_url: input.url || null,
      p_cta: input.cta || null,
      p_benefits: (input.benefits || []) as Json,
      p_objections: (input.objections || []) as Json,
      p_seasonality: (input.seasonality || {}) as Json,
      p_available_from: input.availableFrom || null,
      p_available_until: input.availableUntil || null,
      p_priority: input.priority !== undefined ? input.priority : 10,
    })

    if (error) {
      console.error('Error executing save_primary_offer RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as OfferResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue lors de l'enregistrement de l'offre"
    console.error('Unexpected error in savePrimaryOffer:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to fetch the primary active Offer for a given Business.
 */
export async function getPrimaryOffer(businessId: string): Promise<{
  offer: OfferSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching primary offer:', error.message)
      return { offer: null, error: error.message }
    }

    if (!data) {
      return { offer: null, error: null }
    }

    const offer: OfferSummary = {
      id: data.id,
      business_id: data.business_id,
      name: data.name,
      description: data.description,
      price_from: data.price_from,
      price_to: data.price_to,
      currency: data.currency,
      url: data.url,
      cta: data.cta,
      benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
      objections: Array.isArray(data.objections) ? (data.objections as string[]) : [],
      seasonality: typeof data.seasonality === 'object' && data.seasonality !== null ? (data.seasonality as Record<string, unknown>) : {},
      available_from: data.available_from,
      available_until: data.available_until,
      priority: data.priority,
      active: data.active,
    }

    return { offer, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la récupération de l'offre"
    console.error('Unexpected error in getPrimaryOffer:', message)
    return { offer: null, error: message }
  }
}
