# Setup status — 2026-10-17

Implemented and validated locally:

- Next.js App Router, TypeScript, Tailwind, local shadcn-style UI component, pnpm lockfile.
- Finite lunar recurrence preview; leap-month and missing-day skipping.
- Todoist OAuth with encrypted HTTP-only session cookies, state validation, same-origin mutation checks, and no browser-visible secrets.
- Static task creation and unfinished task updates; known completed/deleted tasks skipped; pagination; stable retry request IDs; partial results returned on errors.
- Vitest and React Testing Library: 12 tests passed across 4 files.
- TypeScript and ESLint passed. Optimized production build passed.
- Local production HTTP check: homepage 200; OAuth missing configuration 503; task mutation without session 401; cross-origin mutation 403.

External setup remains blocked:

- No GitHub repository was created or pushed. Connected GitHub identity: robertwang1001. The connector lacks repository creation, and the local GitHub CLI is signed out.
- No Vercel project or deployment was created. Project reads work for the existing Hobby scope, but project creation still returns 403 for scope robertwangs-projects, with a message that the connection lacks authorization to that scope. The local Vercel CLI also has no usable authenticated session.
- No deployment URL or remote build status is available.
- Todoist OAuth credentials are not configured. Real OAuth and Todoist calls have not been tested; API behavior is covered with mocks.
- Desktop filesystem and VS Code are unavailable. Use README commands on your Mac.

Initial product limits:

- One locally saved event configuration, no cross-device sync or event collection.
- Missing leap months/day 30 are skipped; finite search through lunar year 2100.
- User reconnects when the access token expires; refresh-token rotation is not implemented.
- Browser storage and stable task markers aid tracking but cannot guarantee global exactly-once creation across browser data loss or concurrent tabs.
