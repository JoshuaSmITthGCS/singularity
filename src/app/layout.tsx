import type { Metadata } from "next"
import { Archivo, JetBrains_Mono, Newsreader } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/AppShell"

// Archivo carries the dense UI, Newsreader the editorial voice, JetBrains Mono
// anything a machine measured — language names, test counts, hashes, prices.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
})

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Singularity — verified code, in your language",
    template: "%s · Singularity",
  },
  description:
    "A marketplace for game-development code assets. Every listing is translated across five languages and only ships targets whose tests actually passed.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${newsreader.variable} ${jetbrains.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
