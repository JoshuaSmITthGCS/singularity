import { Page, PageHeader } from "@/components/PageHeader"
import { TryItDemo } from "@/components/TryItDemo"

export default function TryItPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Live walkthrough"
        title="See the real pipeline run"
        description="No signup required. Publish a sample snippet and watch Claude translate it across five languages, each verified in its own Docker sandbox — then see what a buyer actually receives."
      />
      <Page>
        <TryItDemo />
      </Page>
    </main>
  )
}
