import { mulberry32 } from './noise'

export type PlanetType = 'rocky' | 'gas' | 'ice' | 'lava' | 'ocean' | 'tech'

export interface Palette {
  low: string
  mid: string
  high: string
  atmosphere: string
  emissive?: string
}

export interface PlanetDef {
  id: string
  name: string
  description: string
  link: string
  tags: string[]
  type: PlanetType
  palette: Palette
  rings?: { inner: string; outer: string }
  orbit: number
  radius: number
  speed: number
  phase: number
  inclination: [number, number]
  spin: number
  seed: number
}

interface Theme {
  id: string
  name: string
  description: string
  link: string
  tags: string[]
  type: PlanetType
  palette: Palette
  rings?: { inner: string; outer: string }
}

const THEMES: Theme[] = [
  {
    id: 'llm',
    name: 'llm · miniLLM',
    description:
      'A ~101M-param dense decoder-only transformer trained from scratch on FineWeb-Edu on a single RTX 4060 laptop GPU — plus chessLLM, the same architecture retrained on chess notation that learns an internal board representation.',
    link: 'https://github.com/amanmprojects/llm',
    tags: ['transformers', 'LLM training', 'PyTorch', 'GPU'],
    type: 'lava',
    palette: { low: '#2a0a08', mid: '#b8431a', high: '#ffd27a', atmosphere: '#ff8c3a', emissive: '#ff6a00' },
  },
  {
    id: 'chess-bot',
    name: 'chess-bot',
    description:
      'Policy + value transformer that learns chess from human games (AlphaZero-style representation, supervised learning) and plays vs Stockfish. Full pipeline: PGN → features → masks → training → self-play.',
    link: 'https://github.com/amanmprojects/chess-bot',
    tags: ['chess AI', 'policy/value net', 'self-play'],
    type: 'rocky',
    palette: { low: '#141414', mid: '#6e6e6e', high: '#f2f2f2', atmosphere: '#cfcfcf' },
    rings: { inner: '#3a3a3a', outer: '#f5f5f5' },
  },
  {
    id: 'disk-agent',
    name: 'disk-agent',
    description:
      'An OpenClaw/Hermes-style personal AI agent gateway on the Pi SDK — chat from Telegram or the CLI with persistent memory, cron/heartbeat automations, browser/web tools, and per-peer sessions.',
    link: 'https://github.com/amanmprojects/disk-agent',
    tags: ['agent gateway', 'Telegram', 'memory', 'automation'],
    type: 'ice',
    palette: { low: '#0b1e3a', mid: '#14506e', high: '#9fe8ff', atmosphere: '#38bdf8' },
    rings: { inner: '#2b6c8a', outer: '#bfeaff' },
  },
  {
    id: 'harness',
    name: 'harness',
    description:
      'An agentic coding harness wrapping the Pi coding agent in an Electron desktop app with SuperGrok/xAI models. T3 Code-inspired UI: project/thread sidebar, streaming chat, tool cards, composer.',
    link: 'https://github.com/amanmprojects/harness',
    tags: ['Electron', 'coding agent', 'xAI', 'TUI'],
    type: 'tech',
    palette: { low: '#050816', mid: '#16325c', high: '#7dd3fc', atmosphere: '#38bdf8', emissive: '#22d3ee' },
  },
  {
    id: 'agent',
    name: 'agent',
    description:
      'A desktop coding agent on the Pi SDK — sessions, chat with tool cards, an embedded browser webview, a real PTY terminal, file explorer, and Monaco editor.',
    link: 'https://github.com/amanmprojects/agent',
    tags: ['desktop', 'Pi SDK', 'Monaco', 'PTY'],
    type: 'tech',
    palette: { low: '#04201f', mid: '#0f6b64', high: '#7fe0d4', atmosphere: '#2dd4bf', emissive: '#2dd4bf' },
  },
  {
    id: 'purr',
    name: 'purr',
    description:
      'A whole dev machine in a browser tab — just-bash, TypeScript via bun.wasm, virtual git, CDN packages, Monaco editor, HTML preview, and the Pi coding agent with SuperGrok.',
    link: 'https://github.com/amanmprojects/purr',
    tags: ['browser dev env', 'WASM', 'bash', 'sandbox'],
    type: 'ocean',
    palette: { low: '#062e3a', mid: '#0e7a6b', high: '#7fe0b0', atmosphere: '#34d399' },
  },
  {
    id: 'lunaeye',
    name: 'lunaeye',
    description:
      'A Pi extension that gives the text-only deepseek-v4-flash model vision by using gpt-5.6-luna as its eye — both models running on the opencode-go provider.',
    link: 'https://github.com/amanmprojects/lunaeye',
    tags: ['vision', 'multimodal', 'extensions'],
    type: 'ice',
    palette: { low: '#150a2e', mid: '#4c2a85', high: '#c4b5fd', atmosphere: '#a78bfa', emissive: '#a78bfa' },
  },
  {
    id: 'neo-aman-code',
    name: 'neo-aman-code',
    description:
      'A terminal AI coding assistant with a rich TUI (OpenTUI + React + Vercel AI SDK) — tool-loop agent, multi-provider models, slash commands, and file operations.',
    link: 'https://github.com/amanmprojects/neo-aman-code',
    tags: ['TUI', 'OpenTUI', 'AI SDK', 'agents'],
    type: 'tech',
    palette: { low: '#04160a', mid: '#0d3d1f', high: '#86efac', atmosphere: '#4ade80', emissive: '#22c55e' },
  },
  {
    id: 'llm-endpoint-bench',
    name: 'llm-endpoint-bench',
    description:
      'A benchmarking tool for LLM inference endpoints — measure latency, throughput, and reliability across providers.',
    link: 'https://github.com/amanmprojects/llm-endpoint-bench',
    tags: ['benchmarking', 'inference', 'tooling'],
    type: 'rocky',
    palette: { low: '#20242a', mid: '#6b7280', high: '#d1d5db', atmosphere: '#9ca3af' },
  },
  {
    id: 'grok-token-tracker',
    name: 'grok-token-tracker',
    description:
      'A local tracker for Grok / Composer token usage from Grok Build and pi agent sessions — keep an eye on your burn rate.',
    link: 'https://github.com/amanmprojects/grok-token-tracker',
    tags: ['tokens', 'usage tracking', 'tooling'],
    type: 'lava',
    palette: { low: '#2a1205', mid: '#8a4a12', high: '#fbbf24', atmosphere: '#fbbf24', emissive: '#f59e0b' },
  },
  {
    id: 'chess',
    name: 'chess',
    description:
      'Chess engine work in JavaScript — paired with chess-bot-vercel and chess-bot, exploring search, evaluation, and representation in JS.',
    link: 'https://github.com/amanmprojects/chess',
    tags: ['chess engine', 'JavaScript', 'search'],
    type: 'gas',
    palette: { low: '#6b4a1a', mid: '#c9a34a', high: '#f5e6c4', atmosphere: '#e0b35a' },
  },
  {
    id: 'kairo',
    name: 'kairo',
    description:
      'The newest experiment (Aug 2026). A work in progress — mysterious, undocumented, and currently loading.',
    link: 'https://github.com/amanmprojects/kairo',
    tags: ['experiment', 'WIP', '???'],
    type: 'tech',
    palette: { low: '#0a0a12', mid: '#2a1a4a', high: '#e879f9', atmosphere: '#e879f9', emissive: '#d946ef' },
    rings: { inner: '#3a1a4a', outer: '#f0abfc' },
  },
]

export const PLANETS: PlanetDef[] = THEMES.map((t, i) => {
  const orbit = 1500 + i * 700
  const radius = 34 + (i % 4) * 14
  const speed = 2 / Math.sqrt(orbit)
  const rng = mulberry32(1000 + i * 37)
  const phase = rng() * Math.PI * 2
  const inclination: [number, number] = [
    (rng() - 0.5) * 0.35,
    (rng() - 0.5) * 0.35,
  ]
  const spin = (rng() * 0.3 + 0.06) * (rng() > 0.5 ? 1 : -1)
  const seed = Math.floor(rng() * 1e9)
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    link: t.link,
    tags: t.tags,
    type: t.type,
    palette: t.palette,
    rings: t.rings,
    orbit,
    radius,
    speed,
    phase,
    inclination,
    spin,
    seed,
  }
})

const byId = new Map(PLANETS.map((p) => [p.id, p]))
export function projectById(id: string) {
  return byId.get(id) ?? null
}
