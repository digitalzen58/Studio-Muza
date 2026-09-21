'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  RECOVERY_COOKIE_NAME,
  verifyRecoveryToken,
  consumeRecoveryToken,
} from '@/lib/auth/recovery-state'

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

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Veuillez saisir une adresse e-mail valide.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback?next=/reset-password`

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
  } catch {
    // Neutralized error handling to prevent account enumeration
  }

  return {
    success: true,
    message:
      'Si un compte existe pour cette adresse, vous recevrez un e-mail dans quelques instants.',
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Veuillez renseigner tous les champs.' }
  }

  if (password.length < 8) {
    return { error: 'Le mot de passe doit comporter au moins 8 caractères.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error:
        'Session de récupération invalide ou expirée. Veuillez demander un nouveau lien.',
    }
  }

  // SECURITY INVARIANT: Verify recovery-specific state bound to this user
  const cookieStore = await cookies()
  const recoveryToken = cookieStore.get(RECOVERY_COOKIE_NAME)?.value
  const recoveryVerification = verifyRecoveryToken(recoveryToken, user.id)

  if (!recoveryVerification.valid) {
    cookieStore.delete(RECOVERY_COOKIE_NAME)
    return {
      error:
        'Session de récupération invalide ou expirée. Veuillez demander un nouveau lien.',
    }
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return {
      error: error.message || 'Impossible de mettre à jour le mot de passe.',
    }
  }

  // Invalidate and consume the recovery-specific state immediately upon success
  consumeRecoveryToken(recoveryToken)
  cookieStore.delete(RECOVERY_COOKIE_NAME)

  return {
    success: true,
    message: 'Votre mot de passe a bien été modifié.',
  }
}
