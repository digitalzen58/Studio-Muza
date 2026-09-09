'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { savePrimaryAudience, parseListInput } from '@/services/audience'

export async function submitAudienceAction(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const needsRaw = formData.get('needs') as string
  const desiresRaw = formData.get('desires') as string
  const problemsRaw = formData.get('problems') as string
  const objectionsRaw = formData.get('objections') as string
  const motivationsRaw = formData.get('motivations') as string
  const questionsRaw = formData.get('questions') as string
  const buyingTriggersRaw = formData.get('buyingTriggers') as string
  const languagePatternsRaw = formData.get('languagePatterns') as string

  if (!name || !name.trim()) {
    return { error: 'Le nom de votre audience est obligatoire.' }
  }

  const needs = parseListInput(needsRaw)
  const desires = parseListInput(desiresRaw)
  const problems = parseListInput(problemsRaw)
  const objections = parseListInput(objectionsRaw)
  const motivations = parseListInput(motivationsRaw)
  const questions = parseListInput(questionsRaw)
  const buyingTriggers = parseListInput(buyingTriggersRaw)
  const languagePatterns = parseListInput(languagePatternsRaw)

  const { data, error } = await savePrimaryAudience({
    name: name.trim(),
    description: description?.trim(),
    needs,
    desires,
    problems,
    objections,
    motivations,
    questions,
    buyingTriggers,
    languagePatterns,
  })

  if (error || !data) {
    return { error: error || 'Impossible d\'enregistrer l\'audience pour le moment.' }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding/goals')
}
