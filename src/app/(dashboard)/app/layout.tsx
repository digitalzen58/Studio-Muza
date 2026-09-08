import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let fullName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profile?.first_name || profile?.last_name) {
      fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    } else if (user.user_metadata?.full_name) {
      fullName = user.user_metadata.full_name
    }
  }

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col pb-20">
      <Header userEmail={user?.email} userName={fullName} />
      <main className="flex-1 max-w-md mx-auto w-full p-4 md:p-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
