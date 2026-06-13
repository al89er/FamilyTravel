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

# Git Workflow for AI Coding Agents

Rules:

* After completing a task, run `npm run build`.
* If build fails, fix the build before committing.
* If build passes and files changed, create ONE local commit.
* Never push unless the user explicitly says “push”.
* Never run `git push` automatically.
* Never commit secrets, .env files, Supabase keys, or generated private files.
* Keep commits task-based and meaningful.
* Do not commit every tiny intermediate edit.
* If unsure, ask before committing.

Commit message types:

* feat: new user-visible feature
* fix: bug fix
* style: UI-only styling change
* refactor: internal restructuring without feature change
* chore: tooling/config/version changes
* docs: documentation changes
* checkpoint: temporary local save point

Examples:

* feat: add currency helper daily rate cache
* fix: scroll to top on page navigation
* style: polish home welcome top bar
* chore: add version metadata workflow
* checkpoint: save local progress before modal footer refactor

# Required Finalization Workflow

For every completed coding task, choose exactly one:

* npm run finish:patch -- "type: summary"
  Use for bug fixes, copy changes, styling polish, small UI fixes, non-breaking refactors.

* npm run finish:minor -- "type: summary"
  Use for new user-visible features, new sections, new cards, new workflows, API integrations.

* npm run finish:major -- "type: summary"
  Use for breaking changes, schema changes, auth/permission changes, migrations, or data model changes.

Rules:

* Do not use git commit directly for normal completed tasks.
* Use finish:* so version bump, metadata generation, build, and local commit happen together.
* Never push unless the user explicitly says “push”.
* If build fails, fix it before committing.
* Mention the new version in the final response.
* package.json version is the source of truth.
* src/version.ts is generated; do not edit manually.

commit:checkpoint is only for temporary local save points when specifically requested.
finish:* is preferred for completed AI coding tasks.
