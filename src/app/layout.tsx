import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

// Outfit for the whole app (DIRECTION.md). Numbers use `tabular-nums`.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: { default: "Hoops ClinIQ", template: "%s · Hoops ClinIQ" },
  description: "Your playbook, player study and cited answers, on film you record. For basketball coaches.",
  applicationName: "Hoops ClinIQ",
  // Open hackathon demo: anyone with the link can view it, but no page is indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, nocache: true },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1626" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} antialiased`}>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            {children}
            {/* Phone: clear the 56px bottom tab bar so toasts (and their Undo) never sit under it. */}
            <Toaster
              position="bottom-right"
              mobileOffset={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))", left: 16, right: 16 }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
