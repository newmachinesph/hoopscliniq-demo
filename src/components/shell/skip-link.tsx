/** First focusable element on every frame: jumps keyboard users past the navigation to `#main`. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-2 left-2 z-[100] -translate-y-16 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
    >
      Skip to content
    </a>
  )
}
