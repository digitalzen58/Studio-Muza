import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'

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
    <div className="min-h-screen bg-ivory text-ink flex flex-col md:flex-row">
      {/* 1. Desktop / Tablet Sidebar (Hidden on mobile < md) */}
      <DesktopSidebar userEmail={user?.email} userName={fullName} />

      {/* 2. Main Viewport Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header (Hidden on md+) */}
        <div className="md:hidden">
          <Header userEmail={user?.email} userName={fullName} />
        </div>

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 min-w-0">
          {children}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation (Hidden on md+) */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
