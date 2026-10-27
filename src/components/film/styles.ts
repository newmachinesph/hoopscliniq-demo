// AI proposals are hatched as well as tagged (DIRECTION: not color alone). One pattern for panels, one for the dark player.
export const hatch =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--color-foreground)_38%,transparent)_0_1.5px,transparent_1.5px_6px)]"
export const hatchOnDark =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,white_55%,transparent)_0_1.5px,transparent_1.5px_6px)]"

/** Dark "broadcast" control: 44px on phone, 32px on desktop. */
export const playerButton =
  "grid size-11 shrink-0 place-items-center rounded-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
