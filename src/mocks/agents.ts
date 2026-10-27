import { org } from "./org"
import { creditBalance } from "./settings"

/** Same balance as the sidebar and billing (settings creditBalance). */
export const creditPool = {
  ...creditBalance(),
  resetsOn: org.credits.resetsOn,
}
