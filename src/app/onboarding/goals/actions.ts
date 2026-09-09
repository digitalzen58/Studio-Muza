'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { savePrimaryGoal } from '@/services/goal'

export async function submitGoalAction(formData: FormData) {
  const type = formData.get('type') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const startsAt = formData.get('startsAt') as string
  const endsAt = formData.get('endsAt') as string
  const priorityRaw = formData.get('priority') as string

  if (!type || !type.trim()) {
    return { error: 'Veuillez sélectionner un objectif principal.' }
  }

  if (!title || !title.trim()) {
    return { error: 'Veuillez donner un nom à votre objectif.' }
  }

  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 10
  if (isNaN(priority) || priority < 0 || priority > 10) {
    return { error: 'La priorité doit être une valeur valide.' }
  }

  const startDate = startsAt?.trim() || undefined
  const endDate = endsAt?.trim() || undefined

  if (startDate && endDate && endDate < startDate) {
    return { error: 'La date de fin ne peut pas être antérieure à la date de début.' }
  }

  const { data, error } = await savePrimaryGoal({
    type: type.trim(),
    title: title.trim(),
    description: description?.trim(),
    priority,
    startsAt: startDate,
    endsAt: endDate,
    metric: undefined,
    targetValue: undefined,
  })

  if (error || !data) {
    return { error: error || "Impossible d'enregistrer l'objectif pour le moment." }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding/offers')
}
