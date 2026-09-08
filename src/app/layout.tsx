import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Studio Mūza ✦ Coach de visibilité intelligent',
  description: 'Mūza propose. Vous choisissez. Mūza s\'occupe du reste.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${instrumentSerif.variable} ${plusJakartaSans.variable}`}
    >
      <body className="bg-ivory text-ink font-sans antialiased min-h-screen selection:bg-terracotta-light selection:text-terracotta-dark">
        {children}
      </body>
    </html>
  )
}
