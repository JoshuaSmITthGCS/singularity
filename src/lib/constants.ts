import type { Language } from "@/types/database"

export const LANGUAGES = ["typescript", "javascript", "java", "csharp", "cpp"] as const satisfies readonly Language[]

export const LANGUAGE_LABEL: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
}

export const LANGUAGE_EXTENSION: Record<Language, string> = {
  javascript: "js",
  typescript: "ts",
  java: "java",
  csharp: "cs",
  cpp: "cpp",
}

export const LANGUAGE_DESCRIPTION: Record<Language, string> = {
  javascript: "Node.js, web games (Phaser, PixiJS), server-side logic",
  typescript: "Type-safe web development, game tooling, Node.js backends",
  java: "libGDX, jMonkeyEngine, Minecraft mods, Android games",
  csharp: "Unity, Godot, MonoGame - most popular indie game engine language",
  cpp: "Unreal Engine, AAA game development, high-performance systems",
}

export const LANGUAGE_ENGINE_TAGS: Record<Language, string[]> = {
  javascript: ["Node.js", "Phaser", "PixiJS", "Web"],
  typescript: ["Node.js", "Phaser", "Babylon.js", "Three.js"],
  java: ["libGDX", "jMonkeyEngine", "Minecraft", "Android"],
  csharp: ["Unity", "Godot", "MonoGame", ".NET"],
  cpp: ["Unreal Engine", "Custom", "C++", "Native"],
}

// Translation mode governs when cross-language variants are produced.
// 'on_demand' (default): publish verifies only the source language — zero LLM
// spend — and target languages are translated when a buyer requests them.
// 'eager': publish queues all languages up front (the original MVP behavior).
// Server-only: reads a non-NEXT_PUBLIC env var, so client bundles always see
// the default.
export type TranslationMode = "on_demand" | "eager"

export function getTranslationMode(): TranslationMode {
  return process.env.SINGULARITY_TRANSLATION_MODE === "eager" ? "eager" : "on_demand"
}

// Price is computed from the unit-economics formula (see src/lib/pricing.ts),
// not set by developers, so there is no manual min/max range to enforce.
export const DEVELOPER_SHARE_RATE = 0.7
export const PLATFORM_FEE_RATE = 0.25
export const REFERRAL_RESERVE_RATE = 0.05
export const DEFAULT_WORKER_CLAIM_TIMEOUT_MINUTES = 10
export const DEFAULT_WORKER_POLL_INTERVAL_MS = 5000

export const SOURCE_CODE_MAX_LENGTH = 80_000
export const TEST_CODE_MAX_LENGTH = 80_000
export const SUMMARY_MAX_LENGTH = 600
export const SHORT_DESCRIPTION_MAX_LENGTH = 160
export const LONG_DESCRIPTION_MAX_LENGTH = 3000
