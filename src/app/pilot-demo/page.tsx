import { Page, PageHeader } from "@/components/PageHeader"
import { PilotDemo } from "@/components/PilotDemo"
import {
  CONTRIBUTOR_SHARE_PCT,
  FLOW_COST_TS,
  SCENARIOS,
  TRANSLATION_TARGETS,
  buildManifest,
} from "@/lib/pilot-demo-fixtures"

export default function PilotDemoPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Enterprise pilot walkthrough"
        title="This code turns into this code"
        description="Follow one small factory tool from the developer who wrote it, to a rewrite in another language, to a simulation where an expert's decision is recorded and the developer is credited. Each step says what is live and what is an example."
      />
      <Page>
        <PilotDemo
          scenarios={SCENARIOS}
          manifest={buildManifest()}
          contributorSharePct={CONTRIBUTOR_SHARE_PCT}
          originalSource={FLOW_COST_TS}
          targets={TRANSLATION_TARGETS}
        />
      </Page>
    </main>
  )
}
