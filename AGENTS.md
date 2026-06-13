# Versioning Policy for AI Coding Agents

Before committing or finalizing changes, choose one:

* `npm run version:patch`
  Use for bug fixes, small UI fixes, copy changes, styling polish, non-breaking internal refactors.

* `npm run version:minor`
  Use for new user-visible features, new app sections, new workflows, new cards, new API integrations.

* `npm run version:major`
  Use for breaking changes, database/schema changes, auth/permission model changes, data migration changes, or changes that require users/admins to adjust existing data.

Rules:

* Always run the correct version bump before final build.
* Always run `npm run build` after version bump.
* Mention the new version in the final summary.
* Do not manually edit `src/version.ts`; it is generated.
* `package.json` version is the source of truth.
* If unsure, use patch for small fixes and minor for new features.
