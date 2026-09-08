import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const formattedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
      return NextResponse.redirect(`${formattedBaseUrl.replace(/\/$/, '')}${next}`)
    }
  }

  const formattedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  return NextResponse.redirect(`${formattedBaseUrl.replace(/\/$/, '')}/login?error=auth-callback-failed`)
}
