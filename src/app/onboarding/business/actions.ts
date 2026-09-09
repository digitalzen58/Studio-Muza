'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createInitialBusiness } from '@/services/business'

export async function submitBusinessAction(formData: FormData) {
  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const subindustry = formData.get('subindustry') as string
  const description = formData.get('description') as string
  const websiteUrl = formData.get('websiteUrl') as string
  const countryCode = (formData.get('countryCode') as string) || 'FR'
  const region = formData.get('region') as string
  const city = formData.get('city') as string

  if (!name || !name.trim()) {
    return { error: 'Le nom de votre entreprise ou marque est obligatoire.' }
  }

  if (!industry || !industry.trim()) {
    return { error: 'Le secteur d\'activité est obligatoire.' }
  }

  const { data, error } = await createInitialBusiness({
    name: name.trim(),
    industry: industry.trim(),
    subindustry: subindustry?.trim(),
    description: description?.trim(),
    websiteUrl: websiteUrl?.trim(),
    countryCode: countryCode.trim(),
    region: region?.trim(),
    city: city?.trim(),
  })

  if (error || !data) {
    return { error: error || 'Impossible de créer le Business pour le moment.' }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding/brand')
}
