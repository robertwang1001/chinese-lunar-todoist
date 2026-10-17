# Setup status — 2026-10-17

Implemented and validated locally:

- Next.js App Router, TypeScript, Tailwind, local shadcn-style UI component, pnpm lockfile.
- Finite lunar recurrence preview; leap-month and missing-day skipping.
- Todoist OAuth with encrypted HTTP-only session cookies, state validation, same-origin mutation checks, and no browser-visible secrets.
- Static task creation and unfinished task updates; known completed/deleted tasks skipped; pagination; stable retry request IDs; partial results returned on errors.
- Vitest and React Testing Library: 12 tests passed across 4 files.
- TypeScript and ESLint passed. Optimized production build passed.
- Antfu ESLint, lint-staged, Conventional Commit validation, and simple-git-hooks are configured and verified.
- Public GitHub repository created at https://github.com/robertwang1001/chinese-lunar-todoist with the initial commit on `main`.
- Vercel project `chinese-lunar-todoist` created in the `robertwangs-projects` scope.
- Local production HTTP check: homepage 200; OAuth missing configuration 503; task mutation without session 401; cross-origin mutation 403.

External setup remains blocked:

- The local GitHub CLI token is invalid. The connected GitHub integration can see the repository with push permission, but the latest local tooling changes have not yet been pushed.
- Vercel project reads work, but deployment listing and deployment operations return 403 for scope `robertwangs-projects`. The local Vercel CLI also has no usable authenticated session.
- No deployment URL or remote build status is available.
- Todoist OAuth credentials are not configured. Real OAuth and Todoist calls have not been tested; API behavior is covered with mocks.

Initial product limits:

- One locally saved event configuration, no cross-device sync or event collection.
- Missing leap months/day 30 are skipped; finite search through lunar year 2100.
- User reconnects when the access token expires; refresh-token rotation is not implemented.
- Browser storage and stable task markers aid tracking but cannot guarantee global exactly-once creation across browser data loss or concurrent tabs.
