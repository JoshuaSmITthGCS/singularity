import type { TranslationUsage } from "./types.js"

// Cents per million tokens, from the Anthropic price list (standard tier).
// Cache reads bill at ~0.1× the input rate; 5-minute-TTL cache writes at 1.25×.
// Unknown models fall back to the most expensive known rate so cost is never
// silently under-reported.
const MODEL_RATES_CENTS_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 300, output: 1500 },
  "claude-opus-4-8": { input: 500, output: 2500 },
  "claude-haiku-4-5": { input: 100, output: 500 },
}

const FALLBACK_RATE = { input: 500, output: 2500 }

export function estimateUsageCostCents(usage: TranslationUsage): number {
  const rate = MODEL_RATES_CENTS_PER_MTOK[usage.model] ?? FALLBACK_RATE
  const cents =
    (usage.input_tokens / 1_000_000) * rate.input +
    (usage.cache_read_input_tokens / 1_000_000) * rate.input * 0.1 +
    (usage.cache_creation_input_tokens / 1_000_000) * rate.input * 1.25 +
    (usage.output_tokens / 1_000_000) * rate.output

  return Math.ceil(cents)
}

export function sumUsage(entries: TranslationUsage[]): {
  model: string | null
  tokensInput: number
  tokensOutput: number
  costCents: number
} {
  if (entries.length === 0) {
    return { model: null, tokensInput: 0, tokensOutput: 0, costCents: 0 }
  }

  return {
    // Record the model that produced the persisted translation (last attempt).
    model: entries[entries.length - 1].model,
    tokensInput: entries.reduce(
      (total, entry) =>
        total + entry.input_tokens + entry.cache_read_input_tokens + entry.cache_creation_input_tokens,
      0
    ),
    tokensOutput: entries.reduce((total, entry) => total + entry.output_tokens, 0),
    costCents: entries.reduce((total, entry) => total + estimateUsageCostCents(entry), 0),
  }
}
