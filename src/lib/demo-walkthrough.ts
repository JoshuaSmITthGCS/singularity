import type { Language } from "@/types/database"

// Fixed, pre-vetted snippets for the public /try-it walkthrough. These are
// the ONLY inputs POST /api/demo/publish will ever accept — never arbitrary
// pasted code. Anyone can trigger a real Claude translation + Docker
// verification run against these, so the set stays small and known-safe
// (fast to verify, no external dependencies, nothing that could be abused
// as a compute sink).
export type DemoSnippet = {
  id: string
  title: string
  short_description: string
  summary: string
  source_language: Language
  complexity: "low" | "medium" | "high"
  source_code: string
  test_code: string
}

export const DEMO_SNIPPETS: DemoSnippet[] = [
  {
    id: "cooldown-ledger",
    title: "Cooldown Ledger",
    short_description: "Tracks per-action cooldowns using deterministic timestamps.",
    summary:
      "A small cooldown ledger for gameplay abilities. Starts a timer for a named action, reports whether it's ready, and computes remaining time — no engine dependencies, easy to verify in any target language.",
    source_language: "typescript",
    complexity: "low",
    source_code: `export function createCooldownLedger() {
  const timers = new Map<string, number>()
  return {
    start(name: string, now: number, duration: number) {
      timers.set(name, now + duration)
    },
    ready(name: string, now: number) {
      return !timers.has(name) || now >= (timers.get(name) as number)
    },
    remaining(name: string, now: number) {
      return Math.max(0, (timers.get(name) ?? now) - now)
    },
  }
}
`,
    test_code: `import { describe, expect, it } from 'vitest'
import { createCooldownLedger } from './solution'

describe('createCooldownLedger', () => {
  it('tracks readiness', () => {
    const ledger = createCooldownLedger()
    ledger.start('dash', 100, 30)
    expect(ledger.ready('dash', 120)).toBe(false)
    expect(ledger.ready('dash', 130)).toBe(true)
  })

  it('reports remaining time', () => {
    const ledger = createCooldownLedger()
    ledger.start('dash', 0, 50)
    expect(ledger.remaining('dash', 20)).toBe(30)
  })
})
`,
  },
  {
    id: "weighted-pick",
    title: "Weighted Loot Pick",
    short_description: "Deterministic weighted selection from a roll value.",
    summary:
      "A pure function that maps a 0-1 roll to a weighted outcome (common/rare/legendary) — the kind of small, self-contained utility that's easy to verify translates correctly across languages.",
    source_language: "javascript",
    complexity: "low",
    source_code: `export function pickTier(roll) {
  if (roll < 0.6) return 'common'
  if (roll < 0.9) return 'rare'
  return 'legendary'
}
`,
    test_code: `import { describe, expect, it } from 'vitest'
import { pickTier } from './solution.js'

describe('pickTier', () => {
  it('picks by weight', () => {
    expect(pickTier(0.2)).toBe('common')
    expect(pickTier(0.7)).toBe('rare')
    expect(pickTier(0.95)).toBe('legendary')
  })

  it('handles boundary values', () => {
    expect(pickTier(0.6)).toBe('rare')
    expect(pickTier(0.9)).toBe('legendary')
  })
})
`,
  },
  {
    id: "grid-snap",
    title: "Grid Snap",
    short_description: "Snaps a world position to the nearest grid cell.",
    summary:
      "Rounds a position to the nearest multiple of a cell size, in both axes — the kind of small math utility every tile-based or snap-to-grid system leans on.",
    source_language: "typescript",
    complexity: "low",
    source_code: `export function snapToGrid(x: number, y: number, cellSize: number) {
  return {
    x: Math.round(x / cellSize) * cellSize,
    y: Math.round(y / cellSize) * cellSize,
  }
}
`,
    test_code: `import { describe, expect, it } from 'vitest'
import { snapToGrid } from './solution'

describe('snapToGrid', () => {
  it('snaps to the nearest cell', () => {
    expect(snapToGrid(12, 12, 10)).toEqual({ x: 10, y: 10 })
    expect(snapToGrid(16, 4, 10)).toEqual({ x: 20, y: 0 })
  })

  it('leaves an already-aligned position unchanged', () => {
    expect(snapToGrid(30, 40, 10)).toEqual({ x: 30, y: 40 })
  })
})
`,
  },
  {
    id: "health-regen",
    title: "Health Regeneration",
    short_description: "Clamps and regenerates health over elapsed time.",
    summary:
      "Applies a regeneration rate to a health value over a time delta, clamped to a max — a common building block for stamina, mana, and health-regen systems.",
    source_language: "javascript",
    complexity: "low",
    source_code: `export function regenerate(current, max, ratePerSecond, deltaSeconds) {
  const next = current + ratePerSecond * deltaSeconds
  return Math.min(max, Math.max(0, next))
}
`,
    test_code: `import { describe, expect, it } from 'vitest'
import { regenerate } from './solution.js'

describe('regenerate', () => {
  it('regenerates over time', () => {
    expect(regenerate(50, 100, 10, 2)).toBe(70)
  })

  it('clamps to the max', () => {
    expect(regenerate(95, 100, 10, 2)).toBe(100)
  })

  it('never goes below zero', () => {
    expect(regenerate(5, 100, -10, 2)).toBe(0)
  })
})
`,
  },
  {
    id: "damage-falloff",
    title: "Damage Falloff",
    short_description: "Scales damage down as distance from the source increases.",
    summary:
      "Linear damage falloff from a blast or hitscan source — full damage at the origin, zero at or beyond the max radius. A small, deterministic formula that's easy to verify translates correctly.",
    source_language: "typescript",
    complexity: "low",
    source_code: `export function damageAtDistance(baseDamage: number, distance: number, maxRadius: number) {
  if (distance >= maxRadius) return 0
  const falloff = 1 - distance / maxRadius
  return Math.round(baseDamage * falloff)
}
`,
    test_code: `import { describe, expect, it } from 'vitest'
import { damageAtDistance } from './solution'

describe('damageAtDistance', () => {
  it('deals full damage at the origin', () => {
    expect(damageAtDistance(100, 0, 10)).toBe(100)
  })

  it('deals zero damage beyond the radius', () => {
    expect(damageAtDistance(100, 10, 10)).toBe(0)
    expect(damageAtDistance(100, 20, 10)).toBe(0)
  })

  it('scales linearly in between', () => {
    expect(damageAtDistance(100, 5, 10)).toBe(50)
  })
})
`,
  },
]

export function findDemoSnippet(id: string): DemoSnippet | undefined {
  return DEMO_SNIPPETS.find((snippet) => snippet.id === id)
}

// Cooldown between demo publishes from the same IP — this is an unauthenticated,
// publicly-triggerable endpoint that costs a real Claude API call per target
// language plus real Docker compute, so it needs a floor even with a fixed
// snippet whitelist.
export const DEMO_PUBLISH_COOLDOWN_MINUTES = 10
