import { createClient } from '@/lib/supabase/server'
import { metaSocialAdapter } from '@/services/social/adapters/meta-adapter'
import { decryptCredential } from '@/services/social/crypto'
import type {
  PublishingDestinationPlatform,
  PublishingReadinessInfo,
  ConnectedDestinationSummary,
  DestinationPublishResult,
  PublishContentImmediatelyResult,
  OverallPublishStatus,
} from './types'

/**
 * Checks readiness of a content draft for immediate publishing.
 * Identifies connected destinations for the content's business and any blocking constraints.
 */
export async function getPublishingReadiness(
  contentId: string
): Promise<PublishingReadinessInfo | { error: string }> {
  try {
    const supabase = await createClient()

    // 1. Fetch authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Vous devez être connecté.' }
    }

    // 2. Fetch canonical content (enforcing RLS / business access)
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('id, business_id, status, topic, hook, body, cta')
      .eq('id', contentId)
      .single()

    if (contentError || !content) {
      return { error: 'Contenu introuvable ou accès non autorisé.' }
    }

    // 3. Fetch canonical variant and media
    const { data: variant } = await supabase
      .from('content_variants')
      .select('id, platform, format, caption, metadata')
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const { data: mediaRows } = await supabase
      .from('content_media')
      .select('media_asset_id')
      .eq('content_id', contentId)
      .limit(1)

    const primaryMediaId =
      variant?.metadata?.primary_media_id ||
      variant?.metadata?.media_id ||
      mediaRows?.[0]?.media_asset_id ||
      null

    let mediaUrl: string | null = null
    let hasMedia = false

    if (primaryMediaId) {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('id, storage_key')
        .eq('id', primaryMediaId)
        .maybeSingle()

      if (asset) {
        hasMedia = true
        if (asset.storage_key.startsWith('http://') || asset.storage_key.startsWith('https://')) {
          mediaUrl = asset.storage_key
        } else {
          const { data: signedData } = await supabase.storage
            .from('media_assets')
            .createSignedUrl(asset.storage_key, 3600)
          mediaUrl = signedData?.signedUrl || null
        }
      }
    }

    // 4. Query connected social accounts for the business
    const { data: socialAccounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('id, platform, account_name, account_type, status')
      .eq('business_id', content.business_id)
      .in('platform', ['INSTAGRAM', 'FACEBOOK'])
      .eq('status', 'CONNECTED')

    if (accountsError) {
      return { error: 'Erreur lors de la récupération des comptes sociaux.' }
    }

    const availableDestinations: ConnectedDestinationSummary[] = (socialAccounts || []).map((acc) => ({
      platform: acc.platform as PublishingDestinationPlatform,
      socialAccountId: acc.id,
      accountName: acc.account_name || acc.platform,
      accountType: acc.account_type,
      isConnected: acc.status === 'CONNECTED',
    }))

    const blockingIssues: string[] = []
    const workingTitle = content.topic || 'Publication'
    const caption = variant?.caption || content.body || content.hook || ''

    if (!caption.trim() && !hasMedia) {
      blockingIssues.push('La publication doit contenir un texte ou un visuel.')
    }

    return {
      canPublish: blockingIssues.length === 0 && availableDestinations.length > 0,
      contentId: content.id,
      workingTitle,
      caption,
      hasMedia,
      mediaAssetId: primaryMediaId,
      mediaUrl,
      availableDestinations,
      blockingIssues,
    }
  } catch (err) {
    console.error('Exception in getPublishingReadiness:', err)
    return { error: 'Erreur inattendue lors de la vérification.' }
  }
}

/**
 * Executes immediate real publishing to chosen platforms (Instagram / Facebook).
 * Strictly server-side token decryption & Meta API calls.
 * Ensures isolation, anti-double submission protection, and complete trace in publish_jobs.
 */
export async function publishContentImmediately(params: {
  contentId: string
  targetPlatforms: PublishingDestinationPlatform[]
}): Promise<PublishContentImmediatelyResult> {
  const { contentId, targetPlatforms } = params

  if (!contentId || !targetPlatforms || targetPlatforms.length === 0) {
    return {
      success: false,
      overallStatus: 'ALL_FAILED',
      contentId,
      destinations: [],
      message: 'Veuillez sélectionner au moins un réseau social pour publier.',
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
      overallStatus: 'ALL_FAILED',
      contentId,
      destinations: [],
      message: 'Vous devez être connecté pour publier ce contenu.',
    }
  }

  // 2. Fetch canonical content and verify RLS business access
  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select('id, business_id, status, topic, hook, body, cta')
    .eq('id', contentId)
    .single()

  if (contentError || !content) {
    return {
      success: false,
      overallStatus: 'ALL_FAILED',
      contentId,
      destinations: [],
      message: 'Contenu introuvable ou accès non autorisé.',
    }
  }

  // 3. Fetch connected social accounts for the business
  const { data: socialAccounts, error: accountsError } = await supabase
    .from('social_accounts')
    .select('id, business_id, platform, external_account_id, account_name, account_type, access_token_encrypted, status')
    .eq('business_id', content.business_id)
    .in('platform', targetPlatforms)
    .order('updated_at', { ascending: false })

  if (accountsError || !socialAccounts || socialAccounts.length === 0) {
    return {
      success: false,
      overallStatus: 'ALL_FAILED',
      contentId,
      destinations: [],
      message: 'Aucun compte social connecté disponible pour les réseaux sélectionnés.',
    }
  }

  // 4. Resolve primary media asset & generate temporary signed URL for Meta ingestion
  const { data: existingVariants } = await supabase
    .from('content_variants')
    .select('id, platform, format, caption, hashtags, metadata')
    .eq('content_id', contentId)

  const primaryVariant = existingVariants?.[0] || null

  const { data: mediaRows } = await supabase
    .from('content_media')
    .select('media_asset_id')
    .eq('content_id', contentId)
    .limit(1)

  const primaryMediaId =
    primaryVariant?.metadata?.primary_media_id ||
    primaryVariant?.metadata?.media_id ||
    mediaRows?.[0]?.media_asset_id ||
    null

  let metaImageUrl: string | null = null
  if (primaryMediaId) {
    const { data: asset } = await supabase
      .from('media_assets')
      .select('id, storage_key')
      .eq('id', primaryMediaId)
      .eq('business_id', content.business_id)
      .maybeSingle()

    if (asset?.storage_key) {
      if (asset.storage_key.startsWith('http://') || asset.storage_key.startsWith('https://')) {
        metaImageUrl = asset.storage_key
      } else {
        // Generate temporary signed URL with 3600s validity specifically for Meta ingestion
        const { data: signedData, error: signedErr } = await supabase.storage
          .from('media_assets')
          .createSignedUrl(asset.storage_key, 3600)

        if (signedData?.signedUrl) {
          metaImageUrl = signedData.signedUrl
        } else if (signedErr) {
          console.error('Error generating temporary signed URL for Meta:', signedErr.message)
        }
      }
    }
  }

  const destinationResults: DestinationPublishResult[] = []

  // 5. Execute publishing per requested platform
  for (const platform of targetPlatforms) {
    // Prefer CONNECTED account if multiple account records exist for this platform
    const account =
      socialAccounts.find((a) => a.platform === platform && a.status === 'CONNECTED') ||
      socialAccounts.find((a) => a.platform === platform)
    const accountName = account?.account_name || platform

    // Verify account status
    if (!account || account.status !== 'CONNECTED' || !account.access_token_encrypted) {
      const reason =
        account?.status === 'REAUTH_REQUIRED'
          ? 'Autorisation expirée. Veuillez reconnecter ce compte.'
          : account?.status === 'DISCONNECTED'
          ? 'Ce compte est déconnecté.'
          : 'Compte social non configuré ou non connecté.'

      destinationResults.push({
        platform,
        socialAccountId: account?.id || '',
        accountName,
        status: 'FAILED',
        publishJobId: '',
        errorMessage: reason,
      })
      continue
    }

    // Decrypt credentials strictly on server
    const decryptedToken = decryptCredential(account.access_token_encrypted)
    if (!decryptedToken) {
      destinationResults.push({
        platform,
        socialAccountId: account.id,
        accountName,
        status: 'FAILED',
        publishJobId: '',
        errorMessage: 'Impossible de déchiffrer les identifiants. Veuillez reconnecter votre compte.',
      })
      continue
    }

    // Find or create content_variant for this specific platform
    let variant = existingVariants?.find((v) => v.platform === platform)
    const canonicalText = (content.body || content.hook || '').trim()

    if (!variant) {
      const { data: newVariant, error: variantInsertError } = await supabase
        .from('content_variants')
        .insert({
          content_id: contentId,
          social_account_id: account.id,
          platform,
          format: primaryVariant?.format || 'POST',
          title: content.topic || 'Publication',
          caption: canonicalText,
          metadata: primaryVariant?.metadata || {},
          status: 'DRAFT',
        })
        .select('id, platform, format, caption, hashtags, metadata')
        .single()

      if (variantInsertError || !newVariant) {
        destinationResults.push({
          platform,
          socialAccountId: account.id,
          accountName,
          status: 'FAILED',
          publishJobId: '',
          errorMessage: 'Erreur lors de la préparation de la variante du contenu.',
        })
        continue
      }
      variant = newVariant
    }

    // Resolve final platform caption following Source of Truth rule
    const isExplicitEmpty = Boolean(
      variant?.metadata && (variant.metadata as Record<string, unknown>).is_explicit_empty_caption === true
    )
    const hasExplicitVariantCaption = Boolean(
      variant?.caption !== undefined && variant?.caption !== null && variant.caption.trim().length > 0
    )

    let baseCaption = ''
    if (hasExplicitVariantCaption) {
      baseCaption = variant!.caption!.trim()
    } else if (isExplicitEmpty) {
      baseCaption = ''
    } else {
      baseCaption = canonicalText
    }

    // Resolve hashtags (from variant.hashtags or variant.metadata.hashtags)
    const rawHashtags =
      (Array.isArray(variant?.hashtags) ? (variant?.hashtags as string[]) : null) ||
      (Array.isArray((variant?.metadata as Record<string, unknown>)?.hashtags)
        ? ((variant?.metadata as Record<string, unknown>).hashtags as string[])
        : null) ||
      []

    const formattedHashtags = rawHashtags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .join(' ')

    let finalPublishCaption = baseCaption
    if (formattedHashtags.length > 0) {
      if (baseCaption.length > 0) {
        finalPublishCaption = `${baseCaption}\n\n${formattedHashtags}`
      } else {
        finalPublishCaption = formattedHashtags
      }
    }

    // 6. Anti-double submission guard (Server-side)
    // Check if an active publish_job was created in the last 45 seconds for this variant/account
    const recentThreshold = new Date(Date.now() - 45 * 1000).toISOString()
    const { data: existingActiveJobs } = await supabase
      .from('publish_jobs')
      .select('id, status, created_at')
      .eq('content_variant_id', variant.id)
      .eq('social_account_id', account.id)
      .in('status', ['PENDING', 'PREPARING', 'UPLOADING', 'PROCESSING', 'PUBLISHED'])
      .gt('created_at', recentThreshold)
      .limit(1)

    if (existingActiveJobs && existingActiveJobs.length > 0) {
      const existingJob = existingActiveJobs[0]
      if (existingJob.status === 'PUBLISHED') {
        destinationResults.push({
          platform,
          socialAccountId: account.id,
          accountName,
          status: 'PUBLISHED',
          publishJobId: existingJob.id,
          errorMessage: 'Cette publication a déjà été envoyée avec succès.',
        })
        continue
      } else {
        destinationResults.push({
          platform,
          socialAccountId: account.id,
          accountName,
          status: 'FAILED',
          publishJobId: existingJob.id,
          errorMessage: 'Une publication est déjà en cours de traitement pour ce réseau.',
        })
        continue
      }
    }

    // 7. Create publish_job in PREPARING status
    const nowIso = new Date().toISOString()
    const { data: job, error: jobError } = await supabase
      .from('publish_jobs')
      .insert({
        content_variant_id: variant.id,
        social_account_id: account.id,
        scheduled_at: nowIso,
        status: 'PREPARING',
        attempt_count: 1,
        started_at: nowIso,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      destinationResults.push({
        platform,
        socialAccountId: account.id,
        accountName,
        status: 'FAILED',
        publishJobId: '',
        errorMessage: 'Impossible d’initialiser la tâche de publication.',
      })
      continue
    }

    const publishJobId = job.id

    // 8. Call Platform Adapters
    try {
      if (platform === 'FACEBOOK') {
        const fbResult = await metaSocialAdapter.publishFacebookPost({
          accessToken: decryptedToken,
          pageId: account.external_account_id,
          message: finalPublishCaption,
          imageUrl: metaImageUrl,
        })

        if (fbResult.success) {
          const publishedAt = new Date().toISOString()
          await supabase
            .from('publish_jobs')
            .update({
              status: 'PUBLISHED',
              platform_post_id: fbResult.platformPostId || null,
              platform_post_url: fbResult.platformPostUrl || null,
              published_at: publishedAt,
              updated_at: publishedAt,
            })
            .eq('id', publishJobId)

          await supabase
            .from('content_variants')
            .update({
              status: 'PUBLISHED',
              updated_at: publishedAt,
            })
            .eq('id', variant.id)

          destinationResults.push({
            platform: 'FACEBOOK',
            socialAccountId: account.id,
            accountName,
            status: 'PUBLISHED',
            publishJobId,
            platformPostId: fbResult.platformPostId,
            platformPostUrl: fbResult.platformPostUrl,
          })
        } else {
          const failedAt = new Date().toISOString()
          const cleanError = fbResult.errorMessage || 'La publication Facebook n’a pas abouti.'
          await supabase
            .from('publish_jobs')
            .update({
              status: 'FAILED',
              last_error_code: fbResult.errorCode || 'META_API_ERROR',
              last_error_message: cleanError,
              updated_at: failedAt,
            })
            .eq('id', publishJobId)

          await supabase
            .from('content_variants')
            .update({
              status: 'FAILED',
              updated_at: failedAt,
            })
            .eq('id', variant.id)

          destinationResults.push({
            platform: 'FACEBOOK',
            socialAccountId: account.id,
            accountName,
            status: 'FAILED',
            publishJobId,
            errorMessage: cleanError,
          })
        }
      } else if (platform === 'INSTAGRAM') {
        // Instagram requires an image
        if (!metaImageUrl) {
          const failedAt = new Date().toISOString()
          const noImgError = 'Un visuel est obligatoire pour publier sur Instagram.'
          await supabase
            .from('publish_jobs')
            .update({
              status: 'FAILED',
              last_error_code: 'MISSING_IMAGE',
              last_error_message: noImgError,
              updated_at: failedAt,
            })
            .eq('id', publishJobId)

          await supabase
            .from('content_variants')
            .update({
              status: 'FAILED',
              updated_at: failedAt,
            })
            .eq('id', variant.id)

          destinationResults.push({
            platform: 'INSTAGRAM',
            socialAccountId: account.id,
            accountName,
            status: 'FAILED',
            publishJobId,
            errorMessage: noImgError,
          })
        } else {
          const igResult = await metaSocialAdapter.publishInstagramPhotoPost({
            accessToken: decryptedToken,
            instagramAccountId: account.external_account_id,
            imageUrl: metaImageUrl,
            caption: finalPublishCaption,
          })

          if (igResult.success) {
            const publishedAt = new Date().toISOString()
            await supabase
              .from('publish_jobs')
              .update({
                status: 'PUBLISHED',
                platform_post_id: igResult.platformPostId || null,
                platform_post_url: igResult.platformPostUrl || null,
                published_at: publishedAt,
                updated_at: publishedAt,
              })
              .eq('id', publishJobId)

            await supabase
              .from('content_variants')
              .update({
                status: 'PUBLISHED',
                updated_at: publishedAt,
              })
              .eq('id', variant.id)

            destinationResults.push({
              platform: 'INSTAGRAM',
              socialAccountId: account.id,
              accountName,
              status: 'PUBLISHED',
              publishJobId,
              platformPostId: igResult.platformPostId,
              platformPostUrl: igResult.platformPostUrl,
            })
          } else {
            const failedAt = new Date().toISOString()
            const cleanError = igResult.errorMessage || 'La publication Instagram n’a pas abouti.'
            await supabase
              .from('publish_jobs')
              .update({
                status: 'FAILED',
                last_error_code: igResult.errorCode || 'META_API_ERROR',
                last_error_message: cleanError,
                updated_at: failedAt,
              })
              .eq('id', publishJobId)

            await supabase
              .from('content_variants')
              .update({
                status: 'FAILED',
                updated_at: failedAt,
              })
              .eq('id', variant.id)

            destinationResults.push({
              platform: 'INSTAGRAM',
              socialAccountId: account.id,
              accountName,
              status: 'FAILED',
              publishJobId,
              errorMessage: cleanError,
            })
          }
        }
      }
    } catch (publishErr) {
      const failedAt = new Date().toISOString()
      const unexpectedMsg = publishErr instanceof Error ? publishErr.message : 'Erreur inattendue'
      await supabase
        .from('publish_jobs')
        .update({
          status: 'FAILED',
          last_error_code: 'UNEXPECTED_ERROR',
          last_error_message: unexpectedMsg,
          updated_at: failedAt,
        })
        .eq('id', publishJobId)

      destinationResults.push({
        platform,
        socialAccountId: account.id,
        accountName,
        status: 'FAILED',
        publishJobId,
        errorMessage: 'Une erreur est survenue lors de l’envoi.',
      })
    }
  }

  // 9. Compute Overall Status & Resolve Canonical Content Status
  const successfulCount = destinationResults.filter((r) => r.status === 'PUBLISHED').length
  const failedCount = destinationResults.filter((r) => r.status === 'FAILED').length
  const totalCount = destinationResults.length

  let overallStatus: OverallPublishStatus = 'ALL_FAILED'
  let userMessage = 'Impossible de publier pour le moment. Votre contenu est conservé dans Mūza.'

  if (successfulCount === totalCount && totalCount > 0) {
    overallStatus = 'ALL_SUCCESS'
    const platformNames = destinationResults.map((r) => r.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook').join(' et ')
    userMessage = `Votre contenu a été publié avec succès sur ${platformNames}.`

    // Update canonical content to PUBLISHED
    const nowIso = new Date().toISOString()
    await supabase
      .from('contents')
      .update({
        status: 'PUBLISHED',
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', contentId)
  } else if (successfulCount > 0 && failedCount > 0) {
    overallStatus = 'PARTIAL_SUCCESS'
    userMessage = 'Publication partiellement réussie.'
    // Content is NOT marked published so user can retry the failed platform
  } else {
    overallStatus = 'ALL_FAILED'
    // Content preserved in draft/ready status
  }

  return {
    success: successfulCount > 0,
    overallStatus,
    contentId,
    destinations: destinationResults,
    message: userMessage,
  }
}
