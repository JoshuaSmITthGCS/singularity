import { Page, PageHeader } from "@/components/PageHeader"
import { PilotDemo } from "@/components/PilotDemo"
import {
  COMPONENT_SOURCES,
  CONTRIBUTOR_SHARE_PCT,
  SCENARIOS,
  buildManifest,
} from "@/lib/pilot-demo-fixtures"

export default function PilotDemoPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Enterprise pilot walkthrough"
        title="From component to expert decision"
        description="One reusable component, one small workstation-layout simulation, one captured expert decision, with attribution. Each step is labelled live or planned."
      />
      <Page>
        <PilotDemo
          scenarios={SCENARIOS}
          manifest={buildManifest()}
          contributorSharePct={CONTRIBUTOR_SHARE_PCT}
          flowCostSource={COMPONENT_SOURCES.flowCost}
          flowCostAdaptedSource={COMPONENT_SOURCES.flowCostAdapted}
        />
      </Page>
    </main>
  )
}
