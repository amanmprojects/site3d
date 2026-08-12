'use client'

import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'

const Experience = dynamic(
  () => import('@/components/Experience').then((m) => m.Experience),
  { ssr: false },
)

export default function Page() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Experience />
      <HUD />
    </main>
  )
}
