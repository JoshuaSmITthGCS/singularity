// TagSchema controlled vocabulary (TRD §4.5). Mirrors src/lib/taxonomy.ts so
// the worker's LLM tagger and the app's search filters agree on the same
// enums — keep this in lockstep with the source of truth in src/lib.

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
