// GitHub-style page header: a quiet eyebrow, an editorial title, and actions
// pinned right. Every route uses it so the app has one masthead grammar.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  border = true,
}: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  border?: boolean
}) {
  return (
    <header className={border ? "border-b border-rule bg-surface" : ""}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="max-w-2xl">
          {eyebrow ? <p className="tag text-ink-4">{eyebrow}</p> : null}
          <h1 className="display mt-1.5 text-[1.75rem] leading-tight text-ink md:text-[2rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-[0.9375rem] leading-6 text-ink-2">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

// Standard content well. Keeps page gutters identical across routes.
export function Page({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`mx-auto max-w-6xl px-5 py-7 ${className}`}>{children}</div>
}

export function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`overflow-hidden rounded border border-rule bg-surface ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-rule bg-sunken px-3 py-2">
          <h2 className="tag text-ink-3">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-rule-strong bg-surface px-6 py-10 text-center">
      <p className="text-sm text-ink-3">{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
