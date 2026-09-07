import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  ),
  title: 'Aman Mehtar — Orbital Portfolio',
  description:
    'Fly through a solar system of projects. Each planet is a thing Aman has built.',
  openGraph: {
    type: 'website',
    siteName: 'Aman Mehtar — Orbital Portfolio',
    title: 'Aman Mehtar — Orbital Portfolio',
    description:
      'Pilot a spaceship through a solar system where every planet is a project. Fly close to scan it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aman Mehtar — Orbital Portfolio',
    description:
      'Pilot a spaceship through a solar system where every planet is a project.',
  },
}

export const viewport: Viewport = {
  themeColor: '#050a14',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
