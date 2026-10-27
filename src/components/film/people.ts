import { staffById } from "@/data/org"

/** How staff sign comments in the film room: "Coach Whitfield" for coaches, the full name for everyone else. */
export function staffLabel(id: string) {
  const s = staffById(id)
  if (!s) return { name: "Staff", initials: "?", hue: 0 }
  const coach = s.role === "head_coach" || s.role === "assistant_coach"
  return { name: coach ? `Coach ${s.name.split(" ").at(-1)}` : s.name, initials: s.initials, hue: s.avatarHue }
}
