# Setup status — 2026-10-17

Implemented and validated locally:

- Next.js App Router, TypeScript, Tailwind, local shadcn-style UI component, pnpm lockfile.
- Finite lunar recurrence preview; leap-month and missing-day skipping.
- Todoist OAuth with encrypted HTTP-only session cookies, state validation, same-origin mutation checks, and no browser-visible secrets.
- Static task creation and unfinished task updates; known completed/deleted tasks skipped; pagination; stable retry request IDs; partial results returned on errors.
- Vitest and React Testing Library: 12 tests passed across 4 files.
- TypeScript and ESLint passed. Optimized production build passed.
- Antfu ESLint, lint-staged, Conventional Commit validation, and simple-git-hooks are configured and verified.
- Public GitHub repository created at https://github.com/robertwang1001/chinese-lunar-todoist; commit `308a4e9` is pushed to `main`.
- Vercel project `chinese-lunar-todoist` created in the `robertwangs-projects` scope.
- Production deployment succeeded at https://chinese-lunar-todoist.vercel.app for commit `308a4e9`.
- Production HTTP check: homepage 200; OAuth missing configuration 503 as expected.
- Local production HTTP check: homepage 200; OAuth missing configuration 503; task mutation without session 401; cross-origin mutation 403.

External setup remains blocked:

- The local GitHub CLI token is invalid, although Git pushes through the configured Git credential work.
- Fine-grained Vercel project reads still return 403 for scope `robertwangs-projects`; deployment state is available through the GitHub commit status.
- Todoist OAuth credentials are not configured. Real OAuth and Todoist calls have not been tested; API behavior is covered with mocks.

Initial product limits:

- One locally saved event configuration, no cross-device sync or event collection.
- Missing leap months/day 30 are skipped; finite search through lunar year 2100.
- User reconnects when the access token expires; refresh-token rotation is not implemented.
- Browser storage and stable task markers aid tracking but cannot guarantee global exactly-once creation across browser data loss or concurrent tabs.
