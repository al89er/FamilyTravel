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

Recommended AI workflow:

1. Make requested code changes.
2. Run `npm run build`.
3. If build passes, run:
   `npm run commit:checkpoint -- "type: concise task summary"`
4. Stop.
5. Do not push.
