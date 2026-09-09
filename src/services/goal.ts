import { createClient } from '@/lib/supabase/server'

export interface SavePrimaryGoalInput {
  type: string
  title: string
  description?: string
  metric?: string
  targetValue?: number
  priority?: number
  startsAt?: string
  endsAt?: string
}

export interface GoalResult {
  goal_id: string
  business_id: string
  created: boolean
}

export interface GoalSummary {
  id: string
  business_id: string
  offer_id: string | null
  type: string
  title: string
  description: string | null
  metric: string | null
  target_value: number | null
  priority: number
  starts_at: string | null
  ends_at: string | null
  status: string
}

/**
 * Server-side service to save or update the primary Goal via RPC.
 */
export async function savePrimaryGoal(
  input: SavePrimaryGoalInput
): Promise<{ data: GoalResult | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('save_primary_goal', {
      p_type: input.type,
      p_title: input.title,
      p_description: input.description || null,
      p_metric: input.metric || null,
      p_target_value: input.targetValue !== undefined ? input.targetValue : null,
      p_priority: input.priority !== undefined ? input.priority : 10,
      p_starts_at: input.startsAt || null,
      p_ends_at: input.endsAt || null,
    })

    if (error) {
      console.error('Error executing save_primary_goal RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as GoalResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue lors de l'enregistrement de l'objectif"
    console.error('Unexpected error in savePrimaryGoal:', message)
    return { data: null, error: message }
  }
}

/**
 * Server-side helper to fetch the primary active Goal for a given Business.
 */
export async function getPrimaryGoal(businessId: string): Promise<{
  goal: GoalSummary | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'ACTIVE')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching primary goal:', error.message)
      return { goal: null, error: error.message }
    }

    if (!data) {
      return { goal: null, error: null }
    }

    const goal: GoalSummary = {
      id: data.id,
      business_id: data.business_id,
      offer_id: data.offer_id,
      type: data.type,
      title: data.title,
      description: data.description,
      metric: data.metric,
      target_value: data.target_value,
      priority: data.priority,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      status: data.status,
    }

    return { goal, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la récupération de l'objectif"
    console.error('Unexpected error in getPrimaryGoal:', message)
    return { goal: null, error: message }
  }
}
