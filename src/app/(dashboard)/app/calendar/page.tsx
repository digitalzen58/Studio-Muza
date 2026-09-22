import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { getBusinessMediaAssets } from '@/services/media'
import { type CalendarScheduledItem } from '@/components/calendar/calendar-agenda-view'
import { CalendarViewContainer } from '@/components/calendar/calendar-view-container'
import { getBusinessPublicationsHistory } from '@/services/publication-history/fetcher'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Resolve active workspace
  const { data: workspace } = await ensureInitialWorkspace()
  if (!workspace?.workspace_id) {
    redirect('/onboarding/business')
  }

  // 3. Resolve active business
  const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
  if (!business) {
    redirect('/onboarding/business')
  }

  // 4. Fetch business media assets to map cover thumbnail signed URLs
  const { mediaAssets } = await getBusinessMediaAssets(business.id)
  const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]))

  // 5. Query scheduled contents for this business (and historical demo if applicable)
  // RLS policy enforced: can_access_business(business_id)
  const { data: scheduledContents, error: fetchError } = await supabase
    .from('contents')
    .select(`
      id,
      business_id,
      content_type,
      topic,
      hook,
      status,
      scheduled_at,
      created_at,
      content_variants (
        id,
        platform,
        format,
        title,
        metadata
      )
    `)
    .eq('business_id', business.id)
    .eq('status', 'SCHEDULED')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })

  if (fetchError) {
    console.error('Error fetching calendar contents:', fetchError)
  }

  // 6. Map to CalendarScheduledItem view model
  const scheduledItems: CalendarScheduledItem[] = (scheduledContents || []).map((c) => {
    const variant = Array.isArray(c.content_variants) && c.content_variants.length > 0
      ? c.content_variants[0]
      : null

    const slides = Array.isArray(variant?.metadata?.slides)
      ? (variant.metadata.slides as Array<{ index: number; media_id?: string | null }>)
      : []

    // Try to find cover slide media or post primary media
    const primaryMediaId =
      (variant?.metadata as { primary_media_id?: string; media_id?: string } | null)?.primary_media_id ||
      (variant?.metadata as { primary_media_id?: string; media_id?: string } | null)?.media_id ||
      null
    const coverSlide = slides.find((s) => s.index === 1) || slides[0]
    const coverMediaId = coverSlide?.media_id || primaryMediaId
    const coverAsset = coverMediaId ? mediaMap.get(coverMediaId) : null

    return {
      id: c.id,
      contentId: c.id,
      title: c.topic || variant?.title || 'Contenu sans titre',
      hook: c.hook || null,
      platform: variant?.platform || 'Instagram',
      format: variant?.format === 'CAROUSEL' ? 'Carrousel' : 'Post',
      scheduledAt: c.scheduled_at!,
      status: c.status,
      coverMediaUrl: coverAsset?.url || null,
      coverMediaAlt: coverAsset?.alt || coverAsset?.original_filename || null,
    }
  })

  // 7. Fetch full publication history items (published, scheduled, failed)
  const { data: publicationItems } = await getBusinessPublicationsHistory(business.id)

  return (
    <CalendarViewContainer
      scheduledItems={scheduledItems}
      publicationItems={publicationItems || []}
      businessName={business.name}
    />
  )
}
