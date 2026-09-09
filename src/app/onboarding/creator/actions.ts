'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { saveCreatorProfile, parseListInput } from '@/services/creator'

export async function submitCreatorAction(formData: FormData) {
  const weeklyMinutesRaw = formData.get('weeklyMinutes') as string
  const cameraComfortRaw = formData.get('cameraComfort') as string
  const voiceoverComfortRaw = formData.get('voiceoverComfort') as string
  const writingComfortRaw = formData.get('writingComfort') as string
  const photoComfortRaw = formData.get('photoComfort') as string
  const videoComfortRaw = formData.get('videoComfort') as string
  const socialSkillLevel = formData.get('socialSkillLevel') as string
  const maxEffortLevelRaw = formData.get('maxEffortLevel') as string

  const preferredFormatsRaw = formData.getAll('preferredFormats') as string[]
  const avoidedFormatsRaw = formData.getAll('avoidedFormats') as string[]
  const barriersRaw = formData.getAll('barriers') as string[]
  const strengthsRaw = formData.getAll('strengths') as string[]

  const weeklyMinutes = weeklyMinutesRaw ? parseInt(weeklyMinutesRaw, 10) : null
  const cameraComfort = cameraComfortRaw ? parseInt(cameraComfortRaw, 10) : null
  const voiceoverComfort = voiceoverComfortRaw ? parseInt(voiceoverComfortRaw, 10) : null
  const writingComfort = writingComfortRaw ? parseInt(writingComfortRaw, 10) : null
  const photoComfort = photoComfortRaw ? parseInt(photoComfortRaw, 10) : null
  const videoComfort = videoComfortRaw ? parseInt(videoComfortRaw, 10) : null
  const maxEffortLevel = maxEffortLevelRaw ? parseInt(maxEffortLevelRaw, 10) : null

  const preferredFormats = parseListInput(preferredFormatsRaw)
  const avoidedFormats = parseListInput(avoidedFormatsRaw)
  const barriers = parseListInput(barriersRaw)
  const strengths = parseListInput(strengthsRaw)

  const { data, error } = await saveCreatorProfile({
    weeklyMinutes,
    cameraComfort,
    voiceoverComfort,
    writingComfort,
    photoComfort,
    videoComfort,
    socialSkillLevel: socialSkillLevel?.trim() || null,
    preferredFormats,
    avoidedFormats,
    barriers,
    strengths,
    maxEffortLevel,
  })

  if (error || !data) {
    return { error: error || 'Impossible d\'enregistrer le profil créateur pour le moment.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}
