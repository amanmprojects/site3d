#!/usr/bin/env node
// Fetch live repo metadata (stars, language, last push, forks, open issues)
// for every project linked in lib/planets.ts from the GitHub REST API and
// write it to lib/repoData.json. The JSON is committed, and this script runs
// at the start of `npm run build` so deploys pick up fresh numbers.
//
// Never fails the build: if the network is down or the API rate-limits us,
// the existing lib/repoData.json is kept as-is and the script exits 0.
// Set GITHUB_TOKEN to raise the rate limit (60/hr unauthenticated -> 5000/hr).
//
// Usage: node scripts/fetch-github.mjs

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'lib', 'repoData.json')
const PLANETS = path.join(ROOT, 'lib', 'planets.ts')
const API = 'https://api.github.com/repos'

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'site3d-repo-sync',
}
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

async function repoSlugs() {
  const src = await readFile(PLANETS, 'utf8')
  const slugs = new Set()
  for (const m of src.matchAll(/link:\s*'https:\/\/github\.com\/([^']+)'/g)) {
    slugs.add(m[1].replace(/\/$/, ''))
  }
  return [...slugs]
}

async function fetchRepo(slug) {
  const res = await fetch(`${API}/${slug}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}`)
  const j = await res.json()
  return {
    stars: j.stargazers_count ?? 0,
    forks: j.forks_count ?? 0,
    issues: j.open_issues_count ?? 0,
    language: j.language ?? null,
    pushedAt: j.pushed_at ?? null,
    archived: !!j.archived,
    homepage: j.homepage || null,
    description: j.description ?? null,
  }
}

async function main() {
  let existing = { fetchedAt: null, repos: {} }
  try {
    existing = JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    // first run or unreadable snapshot -> start empty
  }

  const slugs = await repoSlugs()
  const repos = { ...existing.repos }
  let ok = 0
  let failed = 0

  await Promise.all(
    slugs.map(async (slug) => {
      try {
        repos[slug] = await fetchRepo(slug)
        ok++
      } catch (e) {
        failed++
        console.warn(`fetch-github: skipped ${slug} (${e.message})`)
      }
    }),
  )

  if (ok === 0) {
    console.warn(
      `fetch-github: no repos fetched (${failed} failed) — keeping the committed snapshot`,
    )
    return
  }

  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), repos }, null, 2) + '\n',
  )
  console.log(`fetch-github: updated ${ok}/${slugs.length} repos into lib/repoData.json`)
}

main().catch((e) => {
  console.warn(`fetch-github: ${e.message} — keeping the committed snapshot`)
})
