'use client'

import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PLANETS } from '@/lib/planets'

const Experience = dynamic(
  () => import('@/components/Experience').then((m) => m.Experience),
  { ssr: false },
)

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Aman Mehtar — Projects',
    itemListElement: PLANETS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: p.name,
        description: p.description,
        url: p.link,
        keywords: p.tags.join(', '),
      },
    })),
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <Experience />
      <LoadingScreen />
      <HUD />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only" aria-label="Projects">
        <h2>Projects</h2>
        <p>
          This site is a 3D solar system you fly through — every planet is one of
          Aman&apos;s projects. The full list, for search engines and screen
          readers:
        </p>
        <ul>
          {PLANETS.map((p) => (
            <li key={p.id}>
              <a href={p.link}>{p.name}</a> — {p.description}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
