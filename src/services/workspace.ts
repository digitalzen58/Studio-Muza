import { createClient } from '@/lib/supabase/server'

export interface InitialWorkspaceResult {
  workspace_id: string
  name: string
  slug: string
  created: boolean
}

/**
 * Server-side service to atomically ensure the current authenticated user has an active Workspace.
 * Calls the PostgreSQL RPC function public.ensure_initial_workspace().
 */
export async function ensureInitialWorkspace(): Promise<{
  data: InitialWorkspaceResult | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('ensure_initial_workspace')

    if (error) {
      console.error('Error executing ensure_initial_workspace RPC:', error.message)
      return { data: null, error: error.message }
    }

    return { data: data as unknown as InitialWorkspaceResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue lors de l\'initialisation du workspace'
    console.error('Unexpected error in ensureInitialWorkspace:', message)
    return { data: null, error: message }
  }
}
