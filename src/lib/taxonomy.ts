// TagSchema vocabulary (PRD/TRD §4.5 + §5.2.1).
// The structured filter categories map directly to these tag fields. Kept as a
// single source of truth so publish, search, and the LLM tagger agree.

export const GENRES = [
  "game",
  "simulation",
  "web",
  "data-pipeline",
  "systems",
  "graphics",
  "networking",
  "ai-ml",
  "tooling",
] as const

export const PURPOSES = [
  "authentication",
  "pathfinding",
  "image-processing",
  "physics",
  "collision-detection",
  "rendering",
  "serialization",
  "validation",
  "state-management",
  "math",
  "io",
] as const

export const ACTIONS = [
  "validate",
  "transform",
  "calculate",
  "render",
  "parse",
  "generate",
  "optimize",
  "simulate",
  "encode",
  "decode",
] as const

export const ENGINES = ["unity", "unreal", "godot", "generic", "react-native"] as const

export const COMPLEXITY_LEVELS = ["low", "medium", "high"] as const

export const TAG_SOURCES = ["llm_v1", "developer", "admin"] as const

export type Genre = (typeof GENRES)[number]
export type Purpose = (typeof PURPOSES)[number]
export type Action = (typeof ACTIONS)[number]
export type Engine = (typeof ENGINES)[number]
export type Complexity = (typeof COMPLEXITY_LEVELS)[number]
export type TagSource = (typeof TAG_SOURCES)[number]

// Grouped genres for the structured filter UI (§5.2.1 "Grouped" control).
export const GENRE_GROUPS: Record<string, Genre[]> = {
  Game: ["game", "simulation", "graphics"],
  Web: ["web", "networking"],
  Data: ["data-pipeline", "ai-ml"],
  Systems: ["systems", "tooling"],
}
