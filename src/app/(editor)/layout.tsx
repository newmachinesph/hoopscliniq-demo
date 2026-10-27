import { DemoBar } from "@/components/hackathon/demo-bar"
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts"
import { LazyOverlays } from "@/components/shell/lazy-overlays"
import { ShellProvider } from "@/components/shell/shell-context"

/** Play designer frame: no sidebar or tab bar, but Ctrl/Cmd+K, "?" and the ClinIQ panel still work (DIRECTION "Editor"). */
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <DemoBar />
      {children}
      <LazyOverlays />
      <KeyboardShortcuts editor />
    </ShellProvider>
  )
}
