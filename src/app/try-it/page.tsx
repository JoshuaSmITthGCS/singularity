import { TryItDemo } from "@/components/TryItDemo"

export default function TryItPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-medium uppercase text-muted-foreground">Live walkthrough</p>
        <h1 className="mt-1 text-3xl font-semibold">See the real pipeline run</h1>
        <p className="mt-2 text-muted-foreground">
          No signup required. Publish a sample snippet and watch Claude translate it across five
          languages, each verified in its own Docker sandbox — then see what a buyer actually
          receives after purchase.
        </p>
      </div>
      <TryItDemo />
    </main>
  )
}
