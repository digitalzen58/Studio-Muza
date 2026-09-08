import Link from 'next/link'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Subtle decorative background blur */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-terracotta-light rounded-full blur-3xl opacity-60 pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between pt-4 z-10">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-ink">
            Studio Mūza
          </span>
          <MuzaSymbol size="md" />
        </div>
        <Badge variant="terracotta" showSymbol>
          Mobile-First
        </Badge>
      </header>

      {/* Hero Content */}
      <main className="my-auto py-12 flex flex-col gap-6 z-10">
        <div className="inline-flex items-center gap-2 text-terracotta text-sm font-medium">
          <span>Coach de visibilité & communication intelligent</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl leading-[1.15] text-ink font-normal">
          Mūza propose.{' '}
          <span className="italic text-terracotta">Vous choisissez.</span>{' '}
          Mūza s&apos;occupe du reste.
        </h1>

        <p className="text-ink-muted text-base leading-relaxed">
          Le compagnon de visibilité des entrepreneurs, indépendants et TPE. Moins de décisions, plus de clarté.
        </p>

        <Card className="flex flex-col gap-3 bg-ivory-card border-terracotta-border/40 mt-2">
          <div className="flex items-center gap-2 text-terracotta-dark font-medium text-sm">
            <MuzaSymbol size="sm" />
            <span>Recommandation du jour</span>
          </div>
          <p className="text-xs text-ink-muted italic">
            « Concentrez-vous sur vos objectifs métier. Votre Mūza Book s’adapte continuellement à vos priorités. »
          </p>
        </Card>

        {/* Call to Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/signup" className="w-full">
            <Button variant="primary" size="lg" fullWidth>
              Créer mon espace Studio Mūza
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="outline" size="lg" fullWidth>
              Se connecter
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-ink-light z-10">
        Studio Mūza ✦ Architecture SaaS Multi-tenant
      </footer>
    </div>
  )
}
