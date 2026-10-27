# Data layer

This is the seam a backend replaces. Today these modules re-export `src/mocks`; later they fetch.

Only `src/data` and `src/mocks` may import from `@/mocks` (enforced by Biome). Everything else imports `@/data/*`.
Domain types live in `types.ts`. Modules stay synchronous for now.
