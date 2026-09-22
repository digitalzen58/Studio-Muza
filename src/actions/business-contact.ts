'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getBusinessContactInfo,
  saveBusinessContactInfo,
  type BusinessContactInfo,
  type BusinessContactInfoInput,
} from '@/services/business-contact'

export interface SaveBusinessContactActionResult {
  success: boolean
  data?: BusinessContactInfo
  message?: string
}

/**
 * Server action to save or update business contact information.
 * Strictly verifies tenant access and enforces RLS.
 */
export async function saveBusinessContactAction(
  businessId: string,
  input: BusinessContactInfoInput
): Promise<SaveBusinessContactActionResult> {
  try {
    if (!businessId) {
      return { success: false, message: 'Identifiant d’entreprise manquant.' }
    }

    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Vous devez être connecté pour modifier ces informations.' }
    }

    // 2. Verify user has access to this business
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, workspace_id')
      .eq('id', businessId)
      .maybeSingle()

    if (bizError || !business) {
      return { success: false, message: 'Entreprise introuvable ou accès non autorisé.' }
    }

    // Verify workspace membership
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', business.workspace_id)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (memberError || !member) {
      return { success: false, message: 'Accès non autorisé à cette entreprise.' }
    }

    // 3. Save contact info safely
    const result = await saveBusinessContactInfo(businessId, input)
    if (!result.success) {
      return { success: false, message: result.error || 'Erreur lors de l’enregistrement.' }
    }

    revalidatePath('/app', 'layout')
    return { success: true, data: result.data }
  } catch (err) {
    console.error('Unexpected error in saveBusinessContactAction:', err)
    return { success: false, message: 'Une erreur imprévue est survenue.' }
  }
}

/**
 * Server action to get business contact info for current user.
 */
export async function getBusinessContactAction(
  businessId: string
): Promise<{ success: boolean; data?: BusinessContactInfo; message?: string }> {
  try {
    if (!businessId) {
      return { success: false, message: 'Identifiant d’entreprise manquant.' }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Non authentifié.' }
    }

    const data = await getBusinessContactInfo(businessId)
    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error in getBusinessContactAction:', err)
    return { success: false, message: 'Une erreur imprévue est survenue.' }
  }
}
