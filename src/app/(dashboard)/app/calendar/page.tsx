import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { getBusinessMediaAssets } from '@/services/media'
import { CalendarAgendaView, type CalendarScheduledItem } from '@/components/calendar/calendar-agenda-view'
import { Calendar } from 'lucide-react'

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
  const items: CalendarScheduledItem[] = (scheduledContents || []).map((c) => {
    const variant = Array.isArray(c.content_variants) && c.content_variants.length > 0
      ? c.content_variants[0]
      : null

    const slides = Array.isArray(variant?.metadata?.slides)
      ? (variant.metadata.slides as Array<{ index: number; media_id?: string | null }>)
      : []

    // Try to find cover slide media
    const coverSlide = slides.find((s) => s.index === 1) || slides[0]
    const coverAsset = coverSlide?.media_id ? mediaMap.get(coverSlide.media_id) : null

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

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-terracotta-light/60 flex items-center justify-center text-terracotta">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-serif font-bold text-ink">
              Calendrier éditorial
            </h1>
          </div>
          <p className="text-xs text-ink-muted">
            Visualisez et gérez vos publications planifiées pour {business.name}.
          </p>
        </div>

        {items.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ivory-card border border-ivory-border text-ink-muted">
            {items.length} planifié{items.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Agenda Timeline List */}
      <CalendarAgendaView items={items} />
    </div>
  )
}
