import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aman Mehtar — Orbital Portfolio',
  description:
    'Fly through a solar system of projects. Each planet is a thing Aman has built.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
