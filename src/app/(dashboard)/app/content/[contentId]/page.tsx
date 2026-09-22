import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessMediaAssets } from '@/services/media'
import { getBusinessContactInfo } from '@/services/business-contact'
import { ContentStudio } from '@/components/studio/content-studio'

interface ContentStudioPageProps {
  params: Promise<{
    contentId: string
  }>
}

export default async function ContentStudioPage({ params }: ContentStudioPageProps) {
  const { contentId } = await params

  if (!contentId) {
    notFound()
  }

  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Fetch canonical content (scoped strictly by RLS: can_access_business)
  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (contentError || !content) {
    notFound()
  }

  // 3. Fetch canonical content variant
  const { data: variant } = await supabase
    .from('content_variants')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // 4. Fetch originating recommendation if present
  let recommendation = null
  if (content.recommendation_id) {
    const { data: recData } = await supabase
      .from('recommendations')
      .select('id, title, concept, angle, cta, suggested_formats')
      .eq('id', content.recommendation_id)
      .maybeSingle()

    recommendation = recData
  }

  // 5. Fetch assigned media from content_media to guarantee primary media hydration
  const { data: assignedMediaRows } = await supabase
    .from('content_media')
    .select('media_asset_id, position, usage_type')
    .eq('content_id', contentId)

  if (variant && (!variant.metadata?.primary_media_id) && assignedMediaRows && assignedMediaRows.length > 0) {
    const primaryRow = assignedMediaRows.find(
      (r) => r.usage_type === 'PRIMARY_IMAGE' || r.position === 0
    ) || assignedMediaRows[0]
    if (primaryRow) {
      variant.metadata = {
        ...(typeof variant.metadata === 'object' && variant.metadata !== null ? variant.metadata : {}),
        primary_media_id: primaryRow.media_asset_id,
      }
    }
  }

  // 6. Fetch authenticated business media assets with signed URLs
  const { mediaAssets } = await getBusinessMediaAssets(content.business_id)

  // 7. Fetch business contact & conversion details
  const contactInfo = await getBusinessContactInfo(content.business_id)

  return (
    <ContentStudio
      key={`${content.id}-${content.updated_at || ''}`}
      content={content}
      variant={variant}
      recommendation={recommendation}
      initialMediaAssets={mediaAssets}
      initialContactInfo={contactInfo}
    />
  )
}
