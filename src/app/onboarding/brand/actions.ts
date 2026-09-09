'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { saveBrandProfile, parseListInput } from '@/services/brand'

export async function submitBrandAction(formData: FormData) {
  const promise = formData.get('promise') as string
  const positioning = formData.get('positioning') as string
  const story = formData.get('story') as string
  const personalityRaw = formData.get('personality') as string
  const valuesRaw = formData.get('values') as string
  const toneDescription = formData.get('toneDescription') as string
  const preferredVocabularyRaw = formData.get('preferredVocabulary') as string
  const avoidedVocabularyRaw = formData.get('avoidedVocabulary') as string
  const signaturePhrasesRaw = formData.get('signaturePhrases') as string
  const communicationDoRaw = formData.get('communicationDo') as string
  const communicationDontRaw = formData.get('communicationDont') as string

  const personality = parseListInput(personalityRaw)
  const values = parseListInput(valuesRaw)
  const preferredVocabulary = parseListInput(preferredVocabularyRaw)
  const avoidedVocabulary = parseListInput(avoidedVocabularyRaw)
  const signaturePhrases = parseListInput(signaturePhrasesRaw)
  const communicationDo = parseListInput(communicationDoRaw)
  const communicationDont = parseListInput(communicationDontRaw)

  const tone = toneDescription && toneDescription.trim()
    ? { description: toneDescription.trim() }
    : {}

  const { data, error } = await saveBrandProfile({
    promise: promise?.trim(),
    positioning: positioning?.trim(),
    story: story?.trim(),
    personality,
    values,
    tone,
    preferredVocabulary,
    avoidedVocabulary,
    signaturePhrases,
    communicationDo,
    communicationDont,
  })

  if (error || !data) {
    return { error: error || 'Impossible d\'enregistrer le profil de marque pour le moment.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}
