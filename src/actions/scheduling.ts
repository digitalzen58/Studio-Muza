'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateCarouselReadiness } from '@/services/content-readiness/carousel-readiness'
import { validatePostReadiness } from '@/services/content-readiness/post-readiness'
import { convertLocalWallClockToUTC } from '@/services/scheduling/timezone-utils'
import type { ReadinessIssue } from '@/services/content-readiness/types'
import type { CarouselSlideData } from './content'

export interface ScheduleContentPayload {
  contentId: string
  localDate: string // YYYY-MM-DD
  localTime: string // HH:mm
  timeZone: string // IANA timezone e.g. Europe/Paris
}

export type ScheduleContentResult =
  | {
      success: true
      scheduledAt: string
    }
  | {
      success: false
      message: string
      blockingIssues?: ReadinessIssue[]
    }

export type CancelScheduledContentResult =
  | {
      success: true
    }
  | {
      success: false
      message: string
    }

/**
 * Server Action to schedule a validated content draft in Studio Mūza.
 * - Authenticates caller & enforces business RLS ownership server-side.
 * - Runs deterministic editorial readiness check.
 * - Validates date/time/timezone and converts wall-clock to UTC instant.
 * - Rejects past scheduling.
 * - Updates contents and relevant variant status to 'SCHEDULED'.
 * - Creates 0 new publish_jobs (Step 154 editorial calendar model).
 * - Strictly 0 AI and 0 social API calls.
 */
export async function scheduleContentAction(
  payload: ScheduleContentPayload
): Promise<ScheduleContentResult> {
  try {
    const { contentId, localDate, localTime, timeZone } = payload

    if (!contentId || typeof contentId !== 'string') {
      return {
        success: false,
        message: 'Identifiant de contenu manquant.',
      }
    }

    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour planifier ce contenu.',
      }
    }

    // 2. Fetch canonical content (scoped strictly by RLS: can_access_business)
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('id, business_id, status, topic, hook, body, cta')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      return {
        success: false,
        message: 'Contenu introuvable ou accès non autorisé.',
      }
    }

    // 3. Fetch canonical variant to check slides and metadata
    const { data: variant, error: variantError } = await supabase
      .from('content_variants')
      .select('id, platform, format, caption, metadata')
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (variantError || !variant) {
      return {
        success: false,
        message: 'Variante de contenu introuvable.',
      }
    }

    // 4. Server-side deterministic readiness validation based on format
    let readiness
    if (variant.format === 'CAROUSEL') {
      const slides = (variant.metadata?.slides || []) as CarouselSlideData[]
      readiness = validateCarouselReadiness({
        workingTitle: content.topic,
        hook: content.hook,
        slides,
        caption: variant.caption || content.body,
        cta: content.cta,
      })
    } else {
      // POST format: check primary media in metadata or content_media
      const { data: mediaRows } = await supabase
        .from('content_media')
        .select('media_asset_id')
        .eq('content_id', contentId)
        .limit(1)

      const primaryMediaId =
        variant.metadata?.primary_media_id ||
        variant.metadata?.media_id ||
        mediaRows?.[0]?.media_asset_id ||
        null

      readiness = validatePostReadiness({
        workingTitle: content.topic,
        body: variant.caption || content.body,
        primaryMediaId,
        cta: content.cta,
      })
    }

    if (!readiness.ready) {
      return {
        success: false,
        message: 'Le contenu comporte des éléments incomplets et ne peut pas être planifié.',
        blockingIssues: readiness.blockingIssues,
      }
    }

    // 5. Timezone & local wall-clock conversion
    const conversion = convertLocalWallClockToUTC(localDate, localTime, timeZone)
    if (!conversion.success || !conversion.utcIsoString) {
      return {
        success: false,
        message: conversion.message || 'Date ou heure de planification invalide.',
      }
    }

    const scheduledAt = conversion.utcIsoString
    const now = new Date().toISOString()

    // 6. Update canonical contents table (RLS enforced)
    const { error: contentUpdateError } = await supabase
      .from('contents')
      .update({
        status: 'SCHEDULED',
        scheduled_at: scheduledAt,
        updated_at: now,
      })
      .eq('id', contentId)

    if (contentUpdateError) {
      console.error('Error updating content status to SCHEDULED:', contentUpdateError)
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du contenu.',
      }
    }

    // 7. Update relevant variant status to SCHEDULED
    const { error: variantUpdateError } = await supabase
      .from('content_variants')
      .update({
        status: 'SCHEDULED',
        updated_at: now,
      })
      .eq('id', variant.id)

    if (variantUpdateError) {
      console.error('Error updating variant status to SCHEDULED:', variantUpdateError)
      return {
        success: false,
        message: 'Erreur lors de la mise à jour de la variante.',
      }
    }

    // 8. Step 154 invariant: Exactly 0 new publish_jobs created.
    // Revalidate paths
    revalidatePath(`/app/content/${contentId}`)
    revalidatePath('/app')
    revalidatePath('/app/calendar')

    return {
      success: true,
      scheduledAt,
    }
  } catch (err) {
    console.error('Unexpected error in scheduleContentAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue lors de la planification.',
    }
  }
}

/**
 * Server Action to cancel scheduling for a content.
 * - Returns content and variant to 'READY' status.
 * - Clears scheduled_at to NULL.
 * - Preserves all user copy, slides, media, and recommendation relationships.
 * - Protects historical demo publish_job if present.
 */
export async function cancelScheduledContentAction(payload: {
  contentId: string
}): Promise<CancelScheduledContentResult> {
  try {
    const { contentId } = payload

    if (!contentId || typeof contentId !== 'string') {
      return {
        success: false,
        message: 'Identifiant de contenu manquant.',
      }
    }

    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour modifier cette programmation.',
      }
    }

    // 2. Fetch canonical content
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('id, business_id, status, scheduled_at')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      return {
        success: false,
        message: 'Contenu introuvable ou accès non autorisé.',
      }
    }

    // 3. Historical demo protection: if content has an existing publish_job, fail closed
    const { data: existingJobs } = await supabase
      .from('publish_jobs')
      .select('id')
      .in(
        'content_variant_id',
        (
          await supabase
            .from('content_variants')
            .select('id')
            .eq('content_id', contentId)
        ).data?.map((v) => v.id) || []
      )

    if (existingJobs && existingJobs.length > 0) {
      return {
        success: false,
        message: 'Ce contenu est associé à une exécution système et ne peut pas être déplanifié.',
      }
    }

    const now = new Date().toISOString()

    // 4. Update canonical contents table: status -> READY, scheduled_at -> NULL
    const { error: contentUpdateError } = await supabase
      .from('contents')
      .update({
        status: 'READY',
        scheduled_at: null,
        updated_at: now,
      })
      .eq('id', contentId)

    if (contentUpdateError) {
      console.error('Error cancelling content schedule:', contentUpdateError)
      return {
        success: false,
        message: 'Erreur lors de l’annulation de la programmation.',
      }
    }

    // 5. Update content_variants table: status -> READY
    await supabase
      .from('content_variants')
      .update({
        status: 'READY',
        updated_at: now,
      })
      .eq('content_id', contentId)

    revalidatePath(`/app/content/${contentId}`)
    revalidatePath('/app')
    revalidatePath('/app/calendar')

    return {
      success: true,
    }
  } catch (err) {
    console.error('Unexpected error in cancelScheduledContentAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue lors de l’annulation.',
    }
  }
}
