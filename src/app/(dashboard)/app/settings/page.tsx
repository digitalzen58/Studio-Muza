import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessContactInfo } from '@/services/business-contact'
import { getBusinessSocialAccounts } from '@/services/social/social-accounts'
import { SettingsView } from '@/components/settings/settings-view'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch User Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle()

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Entrepreneur'

  // 3. Resolve Active Workspace & Business
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect('/onboarding/business')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, industry, subindustry, city, region, country_code, website_url, booking_url')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!business) {
    redirect('/onboarding/business')
  }

  // 4. Fetch Contact info & Connected Social Accounts
  const [contactInfo, { accounts: socialAccounts }] = await Promise.all([
    getBusinessContactInfo(business.id),
    getBusinessSocialAccounts(business.id),
  ])

  return (
    <SettingsView
      user={{
        id: user.id,
        email: user.email || null,
        firstName: profile?.first_name || null,
        lastName: profile?.last_name || null,
        fullName,
      }}
      business={{
        id: business.id,
        name: business.name,
        industry: business.industry,
        subindustry: business.subindustry,
        city: business.city,
        region: business.region,
        countryCode: business.country_code,
        websiteUrl: business.website_url,
        phone: contactInfo.phone,
        bookingUrl: contactInfo.bookingUrl || business.booking_url,
      }}
      connectedAccounts={socialAccounts}
    />
  )
}
