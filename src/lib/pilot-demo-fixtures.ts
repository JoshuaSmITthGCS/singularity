// Server-side fixtures for /pilot-demo. Hashing uses node:crypto, so this file
// must not be imported by a client component — the page builds the manifest
// and hands it down as props.
import { createHash } from "node:crypto"
import { DEVELOPER_SHARE_RATE } from "@/lib/constants"
import { computeAssetPriceCents, computeRevenueSplitCents } from "@/lib/pricing"
import type { ComponentProvenance, Layout, Scenario, TranslationTarget } from "@/lib/pilot-demo"

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex")

const STATIONS = [
  { id: "recv", label: "Receiving" },
  { id: "cut", label: "Cutting" },
  { id: "weld", label: "Welding" },
  { id: "asm", label: "Assembly" },
  { id: "insp", label: "Inspection" },
  { id: "ship", label: "Shipping" },
]

function layout(id: string, label: string, coords: Array<[number, number]>): Layout {
  return {
    id,
    label,
    stations: STATIONS.map((s, i) => ({ ...s, x: coords[i][0], y: coords[i][1] })),
  }
}

// Metres on the shop floor. "Current" is a long straight line; the others
// are candidates an expert might propose.
const CURRENT = layout("current", "Current: straight line", [[0, 0], [12, 0], [24, 0], [36, 0], [48, 0], [60, 0]])
const U_CELL = layout("u-cell", "U-cell", [[0, 0], [10, 0], [20, 0], [20, 10], [10, 10], [0, 10]])
const HUB = layout("hub", "Central hub", [[0, 0], [10, 6], [20, 6], [10, 12], [20, 12], [30, 6]])

const BASE_FLOWS = [
  { from: "recv", to: "cut", tripsPerShift: 120 },
  { from: "cut", to: "weld", tripsPerShift: 120 },
  { from: "weld", to: "asm", tripsPerShift: 90 },
  { from: "asm", to: "insp", tripsPerShift: 90 },
  { from: "insp", to: "ship", tripsPerShift: 80 },
  { from: "cut", to: "asm", tripsPerShift: 30 },
]

export const SCENARIOS: Scenario[] = [
  {
    id: "steady-state",
    title: "Steady-state shift",
    brief:
      "Normal volume. Material moves forward through six stations, with a small cutting-to-assembly sub-part flow. Which layout should the line use?",
    flows: BASE_FLOWS,
    layouts: [CURRENT, U_CELL, HUB],
    baselineLayoutId: "current",
  },
  {
    id: "rework-surge",
    title: "Weld rework surge",
    brief:
      "A weld defect sends 60 parts per shift back to cutting, and inspection feeds rework to welding. Does the layout you picked still hold up?",
    flows: [
      ...BASE_FLOWS,
      { from: "weld", to: "cut", tripsPerShift: 60 },
      { from: "insp", to: "weld", tripsPerShift: 40 },
    ],
    layouts: [CURRENT, U_CELL, HUB],
    baselineLayoutId: "current",
  },
]

// Source text shown in the walkthrough and hashed for provenance. These mirror
// the functions in pilot-demo.ts; the hash is of this text, not of the bundle.
const MANHATTAN_SRC = `export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
`
const FLOW_COST_SRC = `export function travelDistance(layout, flows) {
  const byId = new Map(layout.stations.map((s) => [s.id, s]))
  let total = 0
  for (const f of flows) {
    total += f.tripsPerShift * manhattan(byId.get(f.from), byId.get(f.to))
  }
  return total
}
`
export const COMPONENT_SOURCES = {
  manhattan: MANHATTAN_SRC,
  flowCost: FLOW_COST_SRC,
}

function component(
  id: string,
  name: string,
  version: string,
  source: string,
  adapted: { source: string; note: string } | null
): ComponentProvenance {
  // Marketplace formula at low complexity, quality unscored. Illustrates the
  // contributor-share arithmetic only; it is not pilot pricing.
  const priceCents = computeAssetPriceCents({ complexity: "low", qualityScore: 0 })
  return {
    id,
    name,
    // Fixtures authored for this demo. No real contributor or repository.
    origin: "demo fixture (illustrative; no real contributor)",
    version,
    content_hash: sha256(source),
    adapted_hash: adapted ? sha256(adapted.source) : null,
    adaptation_note: adapted?.note ?? null,
    price_cents: priceCents,
    contributor_share_cents: computeRevenueSplitCents(priceCents).developerShareCents,
  }
}

export function buildManifest(): ComponentProvenance[] {
  return [
    component("manhattan-distance", "manhattan-distance", "1.0.0", MANHATTAN_SRC, null),
    component("flow-cost", "flow-cost", "1.0.0", FLOW_COST_SRC, {
      source: FLOW_COST_TS,
      note: "Customer adaptation: throw on a flow that names a missing station instead of returning NaN.",
    }),
  ]
}

export const CONTRIBUTOR_SHARE_PCT = Math.round(DEVELOPER_SHARE_RATE * 100)

// The flow-cost component as plain TypeScript, the "before" in the walkthrough.
export const FLOW_COST_TS = `type Station = { id: string; x: number; y: number }
type Flow = { from: string; to: string; tripsPerShift: number }

export function travelDistance(stations: Station[], flows: Flow[]): number {
  const byId = new Map(stations.map((s) => [s.id, s]))
  let total = 0
  for (const f of flows) {
    const from = byId.get(f.from)
    const to = byId.get(f.to)
    if (!from || !to) throw new Error("Flow names a station missing from the layout")
    total += f.tripsPerShift * (Math.abs(from.x - to.x) + Math.abs(from.y - to.y))
  }
  return total
}
`

const FLOW_COST_CSHARP = `using System;
using System.Collections.Generic;
using System.Linq;

public record Station(string Id, double X, double Y);
public record Flow(string From, string To, int TripsPerShift);

public static class Layout
{
    public static double TravelDistance(IReadOnlyList<Station> stations, IReadOnlyList<Flow> flows)
    {
        var byId = stations.ToDictionary(s => s.Id);
        double total = 0;
        foreach (var f in flows)
        {
            if (!byId.TryGetValue(f.From, out var src) || !byId.TryGetValue(f.To, out var dst))
                throw new ArgumentException("Flow names a station missing from the layout");
            total += f.TripsPerShift * (Math.Abs(src.X - dst.X) + Math.Abs(src.Y - dst.Y));
        }
        return total;
    }
}
`

// Compiled with g++ -std=c++17 -Wall -Wextra and run against both scenarios;
// results match the TypeScript model (see pilot-demo.test.ts).
const FLOW_COST_CPP = `#include <cmath>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

struct Station { std::string id; double xCm; double yCm; };
struct Flow { std::string from; std::string to; int tripsPerShift; };

// Positions are in centimetres (Unreal's unit); the answer comes back in metres.
double TravelDistanceMetres(const std::vector<Station>& stations,
                            const std::vector<Flow>& flows) {
  std::unordered_map<std::string, const Station*> byId;
  for (const auto& s : stations) byId[s.id] = &s;

  double totalCm = 0.0;
  for (const auto& f : flows) {
    auto a = byId.find(f.from);
    auto b = byId.find(f.to);
    if (a == byId.end() || b == byId.end())
      throw std::invalid_argument("Flow names a station missing from the layout");
    totalCm += f.tripsPerShift *
               (std::fabs(a->second->xCm - b->second->xCm) +
                std::fabs(a->second->yCm - b->second->yCm));
  }
  return totalCm / 100.0;
}
`

export const TRANSLATION_TARGETS: TranslationTarget[] = [
  {
    id: "csharp",
    label: "C#",
    runsIn: "Unity, Godot, and .NET plant-floor software",
    code: FLOW_COST_CSHARP,
    changes: [
      { before: "Map<string, Station>", after: "Dictionary<string, Station>", why: "Same idea, a lookup table by station name, spelled the way C# spells it." },
      { before: "Math.abs(...)", after: "Math.Abs(...)", why: "Identical arithmetic. C# capitalises method names." },
      { before: "throw new Error(...)", after: "throw new ArgumentException(...)", why: "The safety check for a mistyped station name is kept, using C#'s standard error type." },
      { before: "from, to", after: "src, dst", why: "'from' is a reserved word in C#, so the translator renames it to avoid a build error." },
    ],
    evidence: "Not compiled in this build: the demo environment has no .NET toolchain. In the product, a C# variant is built and tested in a sandbox before it can be sold.",
    recordedResult: null,
  },
  {
    id: "cpp",
    label: "C++",
    runsIn: "Unreal Engine and native robotics software",
    code: FLOW_COST_CPP,
    changes: [
      { before: "positions in metres", after: "positions in centimetres", why: "Unreal measures in centimetres, so every coordinate is 100 times larger. This is the kind of unit slip that sends a robot to the wrong place." },
      { before: "return total", after: "return totalCm / 100.0", why: "The answer is converted back to metres, so both versions answer the same question the same way." },
      { before: "Map", after: "std::unordered_map of pointers", why: "C++ requires saying who owns the data, so the lookup holds references instead of copies." },
      { before: "throw new Error(...)", after: "throw std::invalid_argument(...)", why: "The bad-input safety check is kept." },
    ],
    evidence: "Compiled with g++ (-Wall -Wextra) and run on both scenarios when this demo was built. It returned the same distances as the TypeScript version, and rejected a bad station name the same way.",
    recordedResult: { steadyState: 6720, reworkSurge: 8400 },
  },
]
