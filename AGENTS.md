<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Agent and Developer Rules

Instructions for AI agents and developers working in this repository (SWEAT-BE Django backend and the React/TanStack frontend).

Goals for every change:

1. Do not break existing features.
2. Do not repeat the known mistakes in Section 5.
3. Keep code modular, testable, and optimized.
4. Leave the code cleaner than you found it, but only within the scope of the task.

---

## 0. Ground rules

- **Read before writing.** Before changing a file, read it, its callers, and its tests. Search for usages (`rg`/`grep`) before renaming or removing anything.
- **Do not trust line numbers in old notes.** Audit line references go stale. Locate code by searching for the symbol or string.
- **Small, scoped changes.** One concern per change. Do not mix refactoring, bug fixes, and new features in one change.
- **Behavior preservation during refactors.** A refactor must not change observable behavior: API responses, status codes, error shapes, DB writes, and side effects stay the same unless the task says otherwise.
- **Ask before destructive actions.** Get explicit approval before deleting files, dropping or altering tables, rewriting git history, rotating credentials, or changing deployment, CI, or sync configuration.
- **Never commit or print secrets.** Do not paste tokens, passwords, API keys, OTPs, or `.env` contents into code, tests, logs, docs, or chat.
- **If unsure, stop and report.** State what you found, what you assumed, and what you need from the user. Do not invent requirements.

---

## 1. Implementation workflow (every task)

Follow these nine steps for every task from a senior, whether it is a bug, a feature, or a refactor.

1. **Understand the requirement.** Restate the task in your own words. List what is in scope, what is out of scope, and what success looks like. Ask if anything is ambiguous.
2. **Find the relevant existing implementation.** Search for the feature's views, serializers, services, models, components, hooks, and API modules. Check for existing code that already does part of the job.
3. **Trace the complete request and database flow.**
   - Backend: URL → permission classes → view → serializer → service → model/ORM queries → signals, tasks, outbox events → response.
   - Frontend: route → component → hook → `src/api` endpoint → backend endpoint → rendered state (loading, error, empty, success).
   - Note which tenant database each step touches.
4. **Understand the existing coding pattern.** Match the naming, folder structure, error format, permission style, and test style already used nearby. Do not introduce a second pattern for the same job.
5. **Identify which files need modification.** Write the list before editing. Justify each file. Anything not on the list needs a reason to be touched.
6. **Implement the change.** Make the smallest change that meets the requirement, following Sections 2 to 4.
7. **Write or update tests.** Add tests for the new behavior and for regressions. Bug fixes need a test that fails before the fix and passes after it. Refactors need characterization tests that pass unchanged before and after.
8. **Verify the functionality locally.** Run the checks in Section 6 and exercise the feature through the UI or API as a user would. If you cannot run something, say so in the report. Do not claim it passed.
9. **Prepare a clear explanation for your senior.** Use the report template in Section 1.1.

### 1.1 Report template (step 9)

```
Task: <one line>
Type: bug | feature | refactor | cleanup
Requirement understood as: <summary, plus any assumptions>
Existing implementation found: <files and symbols>
Request and DB flow: <short trace, backend and frontend>
Files changed:
- <path>: <what changed and why>
Behavior changes: <none, or list each one>
Out of scope but noticed: <list, not fixed>
Tests:
- Added/updated: <names>
- Run: <commands and results>
- Not run: <what and why>
Risks and trade-offs: <what improved, what risk remains, what was deliberately not changed>
Manual verification: <steps taken and results>
```

### 1.2 Change-type rules

**Bug fix**

- Reproduce the bug first, and write down the reproduction steps.
- Write a failing regression test before changing code.
- Fix the root cause, not just the symptom. Check for the same bug elsewhere with a search.
- Keep the fix minimal. Do not refactor the surrounding code in the same change.

**Feature**

- Confirm the API contract (request and response shape, status codes, errors) with the senior before building the frontend if the contract is new.
- Follow the existing module structure for the feature area. New feature code goes in a new module, not added to a large existing file.
- Include permissions, validation, tenant scoping, and tests for success, denial, and invalid input.
- Feature-flag risky changes when the project has a flag mechanism.

**Refactor**

- Lock behavior first with characterization tests (Section 7).
- Extract in small steps and run tests after each step.
- Do not change contracts, URLs, or response shapes unless the task says so. If they must change, update every consumer in the same change.

**Cleanup**

- Confirm nothing uses the code (`rg` for references, `depcheck` for packages, the build for generated files).
- Delete in a dedicated change. Get approval first for `_archived_apps/`, scripts, and migrations (Section 9).

---

## 2. Backend rules (Python / Django / DRF)

### Architecture

- **Views are thin.** A view checks permissions, validates input through a serializer, calls a service, and returns a response. Business logic does not belong in views.
- **Services own business logic and transactions.** Put logic in `services_*.py` or a `services/` package. `transaction.atomic()` belongs in services, not views.
- **Selectors for non-trivial reads.** Keep complex query construction out of views.
- **Feature-based modules.** New code goes in a module for its feature. Target under about 500 lines per module. Split when a file grows past that.
- **No new god files or classes.** If a view class is longer than about 150 lines, extract a service.
- **Adapters for external providers** (SMS, email, WhatsApp, payments, telephony). Each provider implements a common interface. Stubs must be clearly marked and never wired into production paths silently.

### Security (non-negotiable)

- **No hard-coded secrets**, passwords, tokens, credentialed IPs, or default API keys in source. Read them from environment variables through `settings`, and fail at startup if a required value is missing in production.
- **Every endpoint declares explicit permission classes.** `AllowAny` is only for public read endpoints or verified webhooks, and it must come with:
  - signature or shared-secret verification (for webhooks),
  - a throttle,
  - a comment explaining why it is public.
- **Never use `AllowAny` on a mutating endpoint** without the above.
- **Authorization uses the RBAC engine** through explicit per-view declarations. Do not add bypasses based on class names or substrings.
- **Tenant resolution comes only from a verified source** (authenticated user, a webhook's bound tenant, or a signed token). Never fall back to a default tenant or the "first active tenant."
- **Never log or print secrets, OTPs, or personal data.** Use `logging` at appropriate levels.
- **DEBUG must not change security behavior.** No debug bypasses such as fixed OTP codes in production code paths. Inject test values through test settings or mocks.
- **Validate all input** through DRF serializers. Do not parse `request.body` or `request.data` by hand in new code.
- **Parameterized queries and safe identifiers.** Never build SQL with f-strings. Use `psycopg2.sql` for identifiers.

### Error handling

- **Never swallow exceptions.** `except Exception: pass` is forbidden. Catch the specific exception, log it with context, then handle or re-raise.
- **No bare `except:`.**
- **One API error format.** Follow the existing project standard and do not invent a new shape. Do not mix `{'error': ...}` and `{'detail': ...}` in new code.
- **Logging, not `print`.** This includes migrations and scripts.

### Data and migrations

- **Never edit or renumber applied migrations.** Create a new migration instead.
- **Keep migrations reviewable.** Do not mix schema changes with data backfills. Make them reversible where practical.
- **Add indexes deliberately** for fields used in filters, ordering, or joins. Justify them in the migration or PR description.
- **Watch for N+1 queries.** Use `select_related` and `prefetch_related` for any queryset that touches related objects in a loop or serializer. Verify with query-count assertions in tests.
- **Check the tenant database.** Confirm which database each query runs against, and whether the change touches tenant or master data.

### Style and typing

- Format with `ruff format` (or black, matching the project). Lint with `ruff check`.
- New and modified functions get type hints. Public service functions get docstrings.
- Keep functions under about 50 lines and nesting under 3 levels.
- No dead code, commented-out code, or unused imports.

---

## 3. Frontend rules (React / TypeScript / TanStack)

### Architecture

- **All network calls go through `src/api`** (client and endpoint modules). No raw `fetch` in components. Do not build auth headers manually.
- **Components render; hooks and services fetch and transform.** Put data work in hooks or endpoint modules.
- **Feature-based folders.** New feature code goes in `components/<feature>/` with its own hooks and types. Target under about 300 lines per component file. Split by section or tab when larger.
- **No new components over 1,000 lines.** If a file is growing, extract subcomponents before adding more.
- **Shared UI** goes in `components/ui/` or the shared components folder. Do not duplicate primitives.

### Typing

- **No `any`** in new code. Define types for every API response and request payload.
- Do not use `as any` to silence errors. Fix the type or add a mapper.
- Keep TypeScript strict mode on.

### React practices

- **Functional components and hooks only.** Class components are only for error boundaries.
- **Stable keys in lists.** Use database or generated ids. Never use array index for lists that can be reordered, edited, or removed.
- **Handle loading, error, and empty states** for every data-fetching view.
- **No `eslint-disable` for hook dependencies** unless a comment explains why and the risk is documented. Fix the dependency list or restructure the code.
- **Avoid prop drilling deeper than 2 levels.** Use context or the existing store.
- **Memoize only after measuring.** Do not add `useMemo`, `useCallback`, or `React.memo` by default.
- **Accessibility basics:** labels for inputs, alt text for images, keyboard-operable controls.
- **No debug output.** No `console.log` in committed code. Use a debug flag if logs are needed.

### Security

- **No secrets in frontend code.** No SIP passwords, API keys, or fallback credentials, including in `??` or `||` defaults.
- **No tokens in URLs**, including `EventSource` query strings. Use an agreed alternative with the backend.
- **Follow the documented token strategy.** If the design is memory-only, do not write tokens to `localStorage` or `sessionStorage`.
- **No hard-coded hosts or base URLs.** Read them from env config and fail clearly if missing.

---

## 4. Testing requirements

- **Every behavior change needs a test.** Every bug fix needs a regression test that fails before the fix.
- **Characterization tests before refactoring** legacy code. They must pass unchanged before and after the change.
- **Backend:** Django tests in `backend/tests/`. Cover the success path, permission denial (401/403), validation errors, and tenant isolation for every endpoint you touch.
- **Frontend:** vitest with Testing Library, once configured. Cover loading, error, and empty states for new data views.
- **No flaky tests.** No `sleep` and no wall-clock dependence. Mock time and external services.
- **Do not weaken or delete existing tests** to get a green build. If a test is wrong, explain why in the report and get approval.
- **Known failing test:** `test_02_auto_cancel_unconfirmed_booking_after_deadline` failed in the last logged run. If your change touches booking cancellation, it must pass. Do not hide it.
- **Trade-off checks:** for refactors, show old and new behavior match. For performance changes, include a query-count or timing check.

---

## 5. Known mistakes (do not repeat)

| # | Mistake | Rule |
|---|---|---|
| 1 | `except Exception: pass` in voice-agent and booking paths | Catch specific exceptions; log with context |
| 2 | Public mutating endpoints (inventory, voice-agent tools, telephony webhooks, billing webhook, door-open endpoint) | Verify signature or token, throttle, and use RBAC for staff endpoints |
| 3 | Hard-coded credentials and default API keys (settings, views, mock adapters, frontend bundle) | Read from env; fail if missing in production |
| 4 | Tenant fallback to a default tenant or first active tenant | Resolve tenant only from verified sources |
| 5 | OTP printed or logged; fixed OTP accepted when `DEBUG` is on | Never log OTPs; no debug bypasses |
| 6 | RBAC bypass by class-name substring for members and leads | Use explicit per-view permission declarations |
| 7 | Business logic and `transaction.atomic` inside giant views | Move to services; views stay thin |
| 8 | Duplicate class definitions (MFA and password reset views) | One definition per class; delete duplicates |
| 9 | Undefined variable (`end_hour`) in voice-calling tasks | Define all config values; cover the branch with a test |
| 10 | f-string SQL for database names in provisioning | Use `psycopg2.sql` and validate names |
| 11 | Raw `fetch` bypassing the API client | Use `src/api` modules |
| 12 | `any` in API types and `as any` casts | Type all responses; use mappers |
| 13 | Array index keys on editable lists | Use stable ids |
| 14 | 1,000 to 9,000 line React components | Split by section and feature |
| 15 | Debug `console.log` and `print` in shipped code | Use `logging` or a debug flag |
| 16 | Unused dependencies and generated dead files | Remove after `depcheck` or search confirms no use |
| 17 | Single settings file, no Redis cache | Split settings by environment; configure caching |
| 18 | Migration numbering collisions and prints in data migrations | Never renumber applied migrations; use `logging` |

Update this table as items are fixed. Remove a row only after a test covers it.

---

## 6. Checks to run before finishing a task

**Backend** (inside `backend/`, venv active):

```bash
ruff check . --exclude .venv,_archived_apps
ruff format --check . --exclude .venv,_archived_apps
python manage.py makemigrations --check --dry-run
python manage.py test tests
python manage.py check --deploy --settings=config.settings   # use a production-like env file
pip-audit -r requirements.txt                                 # when dependencies change
```

Tests and migrations need Postgres and Redis (or equivalent test services).

**Frontend** (repo root):

```bash
npm ci
npx tsc --noEmit
npm run lint
npx prettier --check .
npm run build
npm test                    # once vitest is configured
npm audit --omit=dev        # when dependencies change
```

**Secret scan before commit:**

```bash
git diff --cached | grep -iE "password|secret|api[_-]?key|token|otp" || true
```

Review every match. Do not commit real values.

If a check cannot run in your environment, say so in the report. Do not claim it passed.

---

## 7. Refactoring and feature-safety protocol

Use this for any refactor, especially in high-risk areas: voice agent, mobile views, telephony, permissions, billing, and the member portal.

1. **Inventory.** List every endpoint, component, and public function the code touches, and every caller.
2. **Lock behavior.** Add characterization tests for current inputs and outputs.
3. **Refactor in steps.** Extract one function or module at a time, and run tests after each step.
4. **Keep contracts stable.** Request and response shapes, status codes, error formats, and URL paths do not change unless the task says so. If they must change, version them or update all consumers in the same change.
5. **Feature-flag risky changes** when a flag mechanism exists. Otherwise keep the old path until the new one is verified.
6. **Verify side effects.** Emails, webhooks, outbox events, billing records, and audit logs must still happen exactly once.
7. **Check other features.** Search for every consumer of the changed module, including frontend pages, Celery tasks, management commands, and signals.
8. **Document the trade-off** in the report: what improved, what risk remains, and what was deliberately not changed.

---

## 8. Priority order for general improvement work

When asked for general improvements (not a specific feature), follow this order:

1. Security fixes (Section 5, items 2 to 6).
2. Silent failures and data-integrity risks (items 1, 9, 10, 18).
3. Refactor the highest-impact god files, one at a time: `views_voice_agent.py`, then `views_mobile.py`, then tenant resolution, then RBAC permissions.
4. Frontend: move raw fetches to `src/api`, split the largest components, add types.
5. Tooling: ruff, mypy (gradual), CI, pre-commit, vitest.
6. Cleanup: dead code, unused packages, archived code, one-off scripts.

Do not start step 3 or later until steps 1 and 2 are merged, unless the senior says otherwise.

---

## 9. Things an agent must NOT do

- Do not rewrite or force-push git history.
- Do not rotate credentials or change production secrets. Report them instead.
- Do not delete `_archived_apps/`, one-off scripts, or migrations without explicit approval.
- Do not change deployment, sync (including Lovable), or CI configuration without approval.
- Do not add dependencies without a stated reason, a license check, and a lockfile update.
- Do not disable linters, type checks, or tests to get a green build.
- Do not fix unrelated code you noticed while working. Note it in the report.
- Do not invent behavior for missing requirements. Ask.

---

## 10. Code review protocol

Use this when asked to review code, a branch, a PR, or a set of changes. The reviewer reports findings and does not rewrite code. The same protocol applies to an agent reviewing its own diff before step 9.

### 10.1 Reviewer ground rules

- **Do not modify files.** Describe fixes in words or as a short snippet inside the report.
- **Only report issues that are actually present.** Every finding cites a real file path and line (or a clearly identified symbol) and describes the evidence. No hypothetical problems, no style preferences without a rule behind them, and no issues in code the change does not touch.
- **Mark unverified items** as `UNVERIFIED` and say why.
- **Stay in scope.** Review the changed code and its direct dependents. Put unrelated problems under "Out of scope observations" and do not count them in severity totals.
- **Say so when nothing is wrong.** Write `None found` for empty severity levels.

### 10.2 Django / DRF backend checklist

**Architecture**

- Responsibilities: views handle HTTP, serializers handle validation and representation, services handle business logic, selectors or managers handle query construction, models hold data invariants.
- Coupling: views do not reach into other apps' internals. Cross-app calls go through services or public functions.
- Cohesion: each module, class, and function does one job. Flag classes that mix auth, validation, business rules, and I/O.
- SOLID: flag code that switches on provider or type name instead of using adapters, and interfaces that force unused methods.
- DRF and Django conventions: use the viewset and `GenericAPIView` patterns the project already uses, `get_queryset()` for scoping, `perform_create()` and `perform_update()` for side effects, and `Meta` options for model rules. Flag reimplementing built-in behavior.

**Code quality**

- Naming describes intent (`cancel_booking`, not `process`). Flag misleading names.
- Complexity: flag functions over about 50 lines, nesting deeper than 3 levels, and boolean flags that change behavior.
- DRY: flag duplicated validation, tenant or permission checks, and query logic. Only flag duplication of the same concept.
- Unnecessary abstractions: flag base classes, factories, or helpers with one caller that add indirection.
- Error handling: flag `except Exception: pass`, bare `except:`, and swallowed errors. Flag API error shapes that differ from the project standard.
- Logging: flag `print`, logged secrets, and logged personal data.

**Serializers and API contract**

- Serializers declare explicit `fields`. Flag `fields = "__all__"` and `exclude` on models with sensitive fields.
- Flag mass assignment: clients must not set ownership, tenant, status, price, or role unless the endpoint is designed for it.
- Status codes and response shapes match similar existing endpoints.

**Database and ORM**

- N+1: querysets iterated in loops or serialized with nested relations use `select_related` or `prefetch_related`. Flag related-manager access inside loops.
- Unnecessary queries: `.exists()` followed by `.get()`, `.count()` used only for emptiness, and queries in loops that could be one query.
- Inefficient loading: full rows where `only()` or `values()` would do; unbounded list endpoints without pagination.
- Writes: multi-step writes that must succeed together use `transaction.atomic()` in a service. Bulk operations skipping signals the code relies on need a comment.
- Indexes: fields used in `filter`, `order_by`, or joins on large tables are indexed. Flag new migrations that add or remove indexes without justification.
- Migrations: no edits to applied migrations, no schema and data changes mixed, no `print` in data migrations.
- Multi-tenant: queries use the correct tenant database, and tenant scoping applies to every queryset that returns tenant data.

**Security**

- Authorization: every view declares `permission_classes`. Flag `AllowAny` on non-public reads or writes, and mutating endpoints without signature, token, or throttle. Flag object-level access that only checks login, not ownership or tenant membership.
- Bypasses: flag checks based on class names, substrings, or client-supplied flags.
- Parameter handling: query parameters and bodies go through serializers or explicit validation. Flag raw `request.data` or `request.GET` values used in queries, file paths, or URLs.
- SQL safety: flag `raw()`, `extra()`, `cursor.execute()` with string formatting, and f-strings in queries.
- Unsafe input: flag unvalidated URLs (SSRF), uploads without type and size checks, and unescaped user input.
- CSRF: flag `csrf_exempt` without a reason and without alternative verification.
- Exposed data: flag responses that include password hashes, tokens, OTPs, secrets, internal IDs not needed by the client, other tenants' data, or stack traces.
- Configuration: flag hard-coded secrets, default API keys, `DEBUG`-dependent security behavior, and `ALLOWED_HOSTS = ['*']` in production paths.

**Testing**

- New endpoints, services, and permission rules have tests for success, permission denied, validation errors, and tenant isolation.
- Edge cases: empty input, duplicate submissions, repeated webhooks (idempotency), boundary values, and timezone-sensitive dates.
- Regression coverage: bug fixes include a test that fails before the fix. Changed behavior has an updated or new test.
- Query-count checks for changes to list endpoints or related objects.
- Determinism: no `sleep`, no real network calls, no wall-clock dependence, no weakened assertions.

### 10.3 React / TypeScript frontend checklist

**Architecture**

- Components render. Hooks and `src/api` modules fetch and transform. `src/services` or context handles shared state.
- Coupling: components import from a feature's public `index.ts`, not its internal files.
- Cohesion: flag components that handle fetching, business rules, form state, validation, and presentation together.
- Composition: prefer composition to boolean-prop variants. Flag components with more than about 6 behavior-changing props.
- Conventions: TanStack Router uses the project's file-route pattern. TanStack Query is used for server state where the project already does so. Flag two query libraries for the same data.

**Code quality**

- Names describe what a component renders or a hook does. Hooks start with `use`.
- Complexity: flag components over about 300 lines, functions over about 50 lines, and nested conditionals more than two levels deep in JSX.
- DRY: flag duplicated fetch-and-transform logic, form validation, and copied table or card markup.
- Unnecessary abstractions: flag HOCs, generic wrappers, or hooks used in one place.
- Types: flag `any`, `as any`, non-null assertions without a reason, untyped API responses, and props typed as `object` or `Record<string, any>`.

**Views and JSX**

- Business logic in JSX: calculations, permission rules, and status transitions belong in functions, hooks, or services. Flag complex expressions inline in render.
- Component boundaries: a section with its own state or data, or repeated markup, is a component. Flag markup repeated more than twice.
- Reuse: use `components/ui` primitives instead of custom buttons, modals, inputs, or badges.
- Lists: `key` is a stable id. Flag index keys on lists that can change.
- States: data-fetching views handle loading, error, and empty states. Flag views that crash or render nothing when data is missing.
- Accessibility: inputs have labels, images have alt text, interactive elements are buttons or links (not clickable `div`s), and keyboard operation works.

**Hooks and effects**

- `useEffect` dependencies are complete. Flag `eslint-disable` for `react-hooks/exhaustive-deps` without a documented reason.
- Fetching effects handle cleanup or cancellation to avoid updates after unmount and race conditions.
- Memoization is added where measured or clearly needed. Flag blanket memoization, and flag missing memoization that causes measurable re-render problems in large lists.
- Prop drilling deeper than 2 levels, where context or the store is the project pattern.

**API layer and data**

- Network calls go through `src/api`. Flag raw `fetch` or `axios` in components, manual `Authorization` headers, and hard-coded base URLs.
- API errors map to user-facing messages and do not expose raw server responses.
- Request and response types match backend serializers.
- Mutations update or invalidate the relevant cached queries so the UI is not stale.

**Security**

- No secrets, API keys, SIP passwords, or fallback credentials in frontend code, including `??` and `||` defaults.
- Tokens are not placed in URLs or in `localStorage` and `sessionStorage` when the documented strategy is memory-only.
- `dangerouslySetInnerHTML` is used only with trusted or sanitized content.
- External links that open in a new tab use `rel="noopener noreferrer"`.
- UI-only permission checks protect nothing. Confirm the backend enforces the same rule.
- Client-side route guards do not replace server-side checks.

**Testing**

- New components and hooks have tests for rendered output, loading, error, and empty states, and for interactions that change data.
- Tests use accessible queries (role, label), not class names or index selectors.
- Bug fixes include a regression test.
- No flaky patterns: no fixed timeouts, no network reliance, and no snapshot as the only assertion.

**Build and console**

- No `console.log`, `console.debug`, or `debugger` in committed code.
- No unused imports, unused variables, or dead components.
- Lint and TypeScript errors are not suppressed without a reason.

### 10.4 Scope and dependency review (both stacks)

- **Unrelated files:** flag formatting churn, renamed imports elsewhere, and edits to generated files such as `routeTree.gen.ts`.
- **Unnecessary refactoring:** flag restructuring the task does not need, unless it is a planned step in Section 8.
- **Unnecessary dependencies:** flag new packages without a stated reason, duplicate libraries solving the same problem, and packages added for one small helper. Check the lockfile diff.
- **Configuration:** flag changes to CI, deployment, lint rules, or sync configuration unless the task requires them.

### 10.5 Output format

Report findings grouped by severity, in this order:

```
CRITICAL
- [file:line] Rule name. Evidence: <what the code does>. Impact: <what can go wrong>. Suggested fix: <short description, no full rewrite>.

HIGH
- ...

MEDIUM
- ...

LOW
- ...

Out of scope observations (not counted above)
- ...

UNVERIFIED
- <item> - <reason it could not be checked>

Summary
- Files reviewed: <count and list>
- Verdict: APPROVE | REQUEST CHANGES
- Tests run by reviewer: <yes/no, and results>
```

**Severity guide**

- **CRITICAL:** security holes (unauthenticated mutation, tenant data leak, secret exposure, SQL injection, auth bypass), data loss or corruption, or changes that will break production behavior.
- **HIGH:** N+1 or unbounded queries on hot endpoints, missing authorization on non-public data, swallowed exceptions in business flows, missing tests for changed critical behavior, and architecture problems that block planned refactors.
- **MEDIUM:** duplicated logic that will drift, oversized components or functions, `any` in new code, missing loading or error states, index keys on dynamic lists, unclear naming, and missing indexes on new query paths.
- **LOW:** minor readability issues, style inconsistencies lint does not catch, and optional cleanups.

If any CRITICAL or HIGH item exists, the verdict is REQUEST CHANGES.
