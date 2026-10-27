"use client"

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import * as React from "react"

import { Segmented } from "@/components/ui/segmented"

type ThemeValue = "light" | "dark" | "system"

/** Light / Dark / System picker. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return (
    <Segmented<ThemeValue>
      label="Appearance"
      iconOnly
      value={mounted ? (theme as ThemeValue) : undefined}
      onChange={setTheme}
      options={[
        { value: "light", label: "Light", icon: <SunIcon size={15} aria-hidden /> },
        { value: "dark", label: "Dark", icon: <MoonIcon size={15} aria-hidden /> },
        { value: "system", label: "System", icon: <DesktopIcon size={15} aria-hidden /> },
      ]}
    />
  )
}
