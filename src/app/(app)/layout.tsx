import { DemoBar } from "@/components/hackathon/demo-bar"
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts"
import { LazyOverlays } from "@/components/shell/lazy-overlays"
import { MobileTabs } from "@/components/shell/mobile-tabs"
import { ShellProvider } from "@/components/shell/shell-context"
import { Sidebar } from "@/components/shell/sidebar"
import { SkipLink } from "@/components/shell/skip-link"
import { Topbar } from "@/components/shell/topbar"

/** Staff app shell: sidebar (240px / 56px rail / phone drawer), top bar, inset content panel, ClinIQ panel. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <SkipLink />
      <div className="flex min-h-svh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
          <div className="flex min-h-0 flex-1 flex-col bg-background md:rounded-md md:border md:border-border md:bg-surface-1">
            <DemoBar className="md:rounded-t-md" />
            <Topbar />
            <main id="main" tabIndex={-1} className="flex-1 pb-20 outline-none md:pb-0">
              {children}
            </main>
          </div>
        </div>
      </div>
      <MobileTabs />
      <LazyOverlays />
      <KeyboardShortcuts />
    </ShellProvider>
  )
}
