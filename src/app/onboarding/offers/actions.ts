'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { savePrimaryOffer, parseListInput } from '@/services/offer'

export async function submitOfferAction(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const priceFromRaw = formData.get('priceFrom') as string
  const priceToRaw = formData.get('priceTo') as string
  const currency = (formData.get('currency') as string) || 'EUR'
  const benefitsRaw = formData.get('benefits') as string
  const objectionsRaw = formData.get('objections') as string
  const cta = formData.get('cta') as string
  const url = formData.get('url') as string
  const availableFrom = formData.get('availableFrom') as string
  const availableUntil = formData.get('availableUntil') as string
  const seasonalityRaw = formData.get('seasonality') as string
  const priorityRaw = formData.get('priority') as string

  if (!name || !name.trim()) {
    return { error: 'Le nom de votre offre est obligatoire.' }
  }

  let priceFrom: number | undefined = undefined
  if (priceFromRaw && priceFromRaw.trim() !== '') {
    priceFrom = parseFloat(priceFromRaw.trim())
    if (isNaN(priceFrom) || priceFrom < 0) {
      return { error: 'Le prix de départ ("À partir de") doit être un nombre positif ou nul.' }
    }
  }

  let priceTo: number | undefined = undefined
  if (priceToRaw && priceToRaw.trim() !== '') {
    priceTo = parseFloat(priceToRaw.trim())
    if (isNaN(priceTo) || priceTo < 0) {
      return { error: 'Le prix maximal ("Jusqu’à") doit être un nombre positif ou nul.' }
    }
  }

  if (priceFrom !== undefined && priceTo !== undefined && priceTo < priceFrom) {
    return { error: 'Le prix maximal doit être supérieur ou égal au prix de départ.' }
  }

  const priority = priorityRaw ? parseInt(priorityRaw, 10) : 10
  if (isNaN(priority) || priority < 0 || priority > 10) {
    return { error: 'La priorité doit être une valeur valide entre 0 et 10.' }
  }

  const startDate = availableFrom?.trim() || undefined
  const endDate = availableUntil?.trim() || undefined

  if (startDate && endDate && endDate < startDate) {
    return { error: 'La date de fin de disponibilité ne peut pas être antérieure à la date de début.' }
  }

  const benefits = parseListInput(benefitsRaw)
  const objections = parseListInput(objectionsRaw)

  const seasonality: Record<string, unknown> = seasonalityRaw && seasonalityRaw.trim() !== ''
    ? { notes: seasonalityRaw.trim() }
    : {}

  const { data, error } = await savePrimaryOffer({
    name: name.trim(),
    description: description?.trim(),
    priceFrom,
    priceTo,
    currency: currency.trim() || 'EUR',
    benefits,
    objections,
    cta: cta?.trim(),
    url: url?.trim(),
    availableFrom: startDate,
    availableUntil: endDate,
    seasonality,
    priority,
  })

  if (error || !data) {
    return { error: error || "Impossible d'enregistrer l'offre pour le moment." }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}
