import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRecoveryToken, RECOVERY_COOKIE_NAME } from '@/lib/auth/recovery-state'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  const formattedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      const redirectUrl = `${formattedBaseUrl.replace(/\/$/, '')}${next}`
      const response = NextResponse.redirect(redirectUrl)

      // If genuine recovery flow, establish recovery-specific state bound to user.id
      if (next.startsWith('/reset-password')) {
        const recoveryToken = createRecoveryToken(data.user.id)
        response.cookies.set(RECOVERY_COOKIE_NAME, recoveryToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60, // 15 minutes
        })
      }

      return response
    }
  }

  if (next.startsWith('/reset-password')) {
    const response = NextResponse.redirect(
      `${formattedBaseUrl.replace(/\/$/, '')}/reset-password?error=invalid-or-expired`
    )
    response.cookies.delete(RECOVERY_COOKIE_NAME)
    return response
  }
  return NextResponse.redirect(
    `${formattedBaseUrl.replace(/\/$/, '')}/login?error=auth-callback-failed`
  )
}
