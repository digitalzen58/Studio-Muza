import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessMediaAssets } from '@/services/media'
import { getBusinessContactInfo } from '@/services/business-contact'
import { getBusinessSocialAccounts } from '@/services/social/social-accounts'
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

  // 6. Fetch authenticated business media assets with signed URLs
  const { mediaAssets: fetchedAssets } = await getBusinessMediaAssets(content.business_id)
  let mediaAssets = [...fetchedAssets]

  // Collect all referenced media IDs from variant metadata, visual composition, and content_media
  const referencedMediaIds = new Set<string>()
  const rawMetadata = typeof variant?.metadata === 'object' && variant?.metadata !== null ? variant.metadata : {}
  const rawVisualComp = rawMetadata.visual_composition as { background?: { type?: string; mediaAssetId?: string } } | undefined

  if (rawVisualComp?.background?.type === 'IMAGE' && rawVisualComp.background.mediaAssetId) {
    referencedMediaIds.add(rawVisualComp.background.mediaAssetId)
  }
  if (rawMetadata.primary_media_id && typeof rawMetadata.primary_media_id === 'string') {
    referencedMediaIds.add(rawMetadata.primary_media_id)
  }
  if (rawMetadata.media_id && typeof rawMetadata.media_id === 'string') {
    referencedMediaIds.add(rawMetadata.media_id)
  }
  if (Array.isArray(rawMetadata.slides)) {
    for (const slide of rawMetadata.slides) {
      if (slide?.media_id && typeof slide.media_id === 'string') {
        referencedMediaIds.add(slide.media_id)
      }
    }
  }
  if (assignedMediaRows && assignedMediaRows.length > 0) {
    for (const row of assignedMediaRows) {
      if (row.media_asset_id) referencedMediaIds.add(row.media_asset_id)
    }
  }

  // Ensure any referenced media asset not in recent 50 is fetched and signed
  const loadedIds = new Set(mediaAssets.map((m) => m.id))
  const missingIds = Array.from(referencedMediaIds).filter((id) => !loadedIds.has(id))

  if (missingIds.length > 0) {
    const { data: missingRows } = await supabase
      .from('media_assets')
      .select(
        'id, storage_key, original_filename, mime_type, media_type, width, height, ai_description, orientation, source, creator_name, source_url, creator_url, attribution_required, attribution_text, license_label, external_asset_id'
      )
      .in('id', missingIds)
      .eq('business_id', content.business_id)

    if (missingRows && missingRows.length > 0) {
      const signedMissingAssets = await Promise.all(
        missingRows.map(async (item) => {
          let url = item.storage_key
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const { data: signedData } = await supabase.storage
              .from('media_assets')
              .createSignedUrl(item.storage_key, 3600)
            if (signedData?.signedUrl) {
              url = signedData.signedUrl
            }
          }
          return {
            id: item.id,
            url,
            mediaType: item.media_type,
            alt: item.ai_description || item.attribution_text || item.original_filename || 'Brand media asset',
            original_filename: item.original_filename,
            width: item.width,
            height: item.height,
            orientation: item.orientation,
            source: item.source,
            creator_name: item.creator_name,
            source_url: item.source_url,
            creator_url: item.creator_url,
            attribution_required: item.attribution_required,
            attribution_text: item.attribution_text,
            license_label: item.license_label,
            external_asset_id: item.external_asset_id,
          }
        })
      )
      mediaAssets = [...signedMissingAssets, ...mediaAssets]
    }
  }

  if (variant) {
    const primaryRow = assignedMediaRows?.find(
      (r) => r.usage_type === 'PRIMARY_IMAGE' || r.position === 0
    ) || assignedMediaRows?.[0]
    const resolvedPrimaryId =
      rawVisualComp?.background?.mediaAssetId ||
      rawMetadata.primary_media_id ||
      primaryRow?.media_asset_id ||
      null

    if (resolvedPrimaryId) {
      variant.metadata = {
        ...rawMetadata,
        primary_media_id: resolvedPrimaryId,
      }
    }
  }

  // 7. Fetch business details, contact info & connected social accounts
  const contactInfo = await getBusinessContactInfo(content.business_id)
  const { data: bizData } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', content.business_id)
    .maybeSingle()
  const socialAccountsRes = await getBusinessSocialAccounts(content.business_id)
  const socialAccounts = socialAccountsRes?.accounts || []

  return (
    <ContentStudio
      key={`${content.id}-${content.updated_at || ''}`}
      content={content}
      variant={variant}
      recommendation={recommendation}
      initialMediaAssets={mediaAssets}
      initialContactInfo={contactInfo}
      businessName={bizData?.name || 'Studio Mūza'}
      socialAccounts={socialAccounts}
    />
  )
}
