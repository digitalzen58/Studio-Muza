import { createClient } from '@/lib/supabase/server'

export interface CreateBusinessInput {
  name: string
  industry: string
  subindustry?: string
  description?: string
  websiteUrl?: string
  countryCode?: string
  region?: string
  city?: string
}

export interface BusinessResult {
  business_id: string
  workspace_id: string
  name: string
  slug: string
  created: boolean
}

export interface ActiveBusinessSummary {
  id: string
  workspace_id: string
  name: string
  slug: string
  industry: string
}

/**
 * Server-side service to create an initial Business in the user's active Workspace via RPC.
 */
export async function createInitialBusiness(
  input: CreateBusinessInput
): Promise<{ data: BusinessResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('create_initial_business', {
      p_name: input.name,
      p_industry: input.industry,
      p_subindustry: input.subindustry || null,
      p_description: input.description || null,
      p_website_url: input.websiteUrl || null,
      p_country_code: input.countryCode || 'FR',
      p_region: input.region || null,
      p_city: input.city || null,
    })

    if (error) {
      console.error('Error executing create_initial_business RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as BusinessResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue lors de la création du Business'
    console.error('Unexpected error in createInitialBusiness:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to check if a Business exists for the user's active Workspace.
 */
export async function getActiveWorkspaceBusiness(workspaceId: string): Promise<{
  business: ActiveBusinessSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, workspace_id, name, slug, industry')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching business for active workspace:', error.message)
      return { business: null, error: error.message }
    }

    return { business: business as ActiveBusinessSummary | null, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération du Business'
    console.error('Unexpected error in getActiveWorkspaceBusiness:', message)
    return { business: null, error: message }
  }
}
