'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Veuillez renseigner votre email et votre mot de passe.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message || 'Erreur de connexion. Vérifiez vos identifiants.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!email || !password) {
    return { error: 'Veuillez renseigner un email et un mot de passe.' }
  }

  // Construct absolute callback URL for email confirmation & PKCE exchange
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const emailRedirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName || '',
      },
    },
  })

  if (error) {
    return { error: error.message || 'Impossible de créer le compte.' }
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
