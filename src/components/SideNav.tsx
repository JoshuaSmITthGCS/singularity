"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutGrid,
  Menu,
  Package,
  Play,
  Power,
  Search,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AuthButton } from "@/components/AuthButton"

type NavItem = { href: string; label: string; icon: LucideIcon; hint: string }

// Grouped the way the two audiences actually split: people buying code, and
// people shipping it.
const SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Procure",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Search, hint: "Browse verified assets" },
      { href: "/try-it", label: "Try it live", icon: Play, hint: "Watch the pipeline run" },
      { href: "/procurements", label: "Deliveries", icon: Package, hint: "Your purchases" },
    ],
  },
  {
    label: "Publish",
    items: [
      { href: "/publish", label: "New asset", icon: Upload, hint: "Submit for verification" },
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, hint: "Assets and earnings" },
    ],
  },
]

export function SideNav({
  signedIn,
  demoMode,
  isAdmin,
}: {
  signedIn: boolean
  demoMode: boolean
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const sections = isAdmin
    ? [
        ...SECTIONS,
        {
          label: "Admin",
          items: [
            { href: "/admin", label: "All assets", icon: ShieldAlert, hint: "Every upload, full source" },
            { href: "/wol", label: "Wake PC", icon: Power, hint: "Wake-on-LAN for demos" },
          ],
        },
      ]
    : SECTIONS

  // A route change means the mobile drawer has done its job.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile bar. The rail is too tall to keep on screen at this width. */}
      <header className="surface-dark sticky top-0 z-40 flex h-14 items-center justify-between border-b border-shell-rule bg-shell px-3 lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="side-nav"
          className="flex h-9 w-9 items-center justify-center rounded text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink"
        >
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          <span className="sr-only">{open ? "Close navigation" : "Open navigation"}</span>
        </button>
      </header>

      <nav
        id="side-nav"
        aria-label="Primary"
        className={`surface-dark z-30 flex-col border-r border-shell-rule bg-shell lg:sticky lg:top-0 lg:flex lg:h-dvh ${
          open ? "flex" : "hidden"
        }`}
      >
        <div className="hidden h-14 items-center border-b border-shell-rule px-4 lg:flex">
          <Wordmark />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="tag px-2 pb-1.5 text-shell-ink-2">{section.label}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-shell-2 font-medium text-shell-ink"
                            : "text-shell-ink-2 hover:bg-shell-2/60 hover:text-shell-ink"
                        }`}
                      >
                        <Icon size={15} aria-hidden className={active ? "" : "opacity-70"} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-shell-rule p-3">
          {demoMode ? (
            <p className="mb-3 flex items-start gap-2 rounded border border-shell-rule bg-shell-2 px-2.5 py-2 text-xs leading-5 text-shell-ink-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--run)]" aria-hidden />
              <span>
                <span className="font-medium text-shell-ink">Demo data.</span> No backend is
                connected.
              </span>
            </p>
          ) : null}
          <AuthButton signedIn={signedIn} demoMode={demoMode} />
        </div>
      </nav>
    </>
  )
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-1.5">
      <span className="display text-lg font-medium text-shell-ink">Singularity</span>
      <span className="tag text-[0.5625rem] text-shell-ink-2">v1</span>
    </Link>
  )
}
