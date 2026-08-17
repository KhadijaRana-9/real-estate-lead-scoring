# Development Workflow (Superpowers methodology, adopted 2026-08-05)

This repo has adopted the **workflow methodology** popularized by
[obra/superpowers](https://github.com/obra/superpowers) — not the software
package itself. Nothing from that repo is installed here: no dependency, no
hook, no plugin, no runtime footprint. This file is the entire "install" —
a description of how engineering work on this codebase should be done,
followed directly by whichever agent (Claude Code or otherwise) is doing
the work.

## Workflow — every non-trivial task follows these phases in order

1. **Understand the requirement.** Restate it precisely before touching code.
2. **Audit existing code first.** Read the relevant feature module(s)
   end-to-end before writing anything. Never assume architecture — verify it
   (`Read`/`Grep`/`Glob`, not memory).
3. **Identify dependencies.** What existing services, models, middleware,
   or frontend components does this touch or reuse?
4. **Identify risks.** Auth/RBAC/tenancy/data-integrity/backward-compat
   implications, explicitly, before implementing.
5. **Produce an implementation plan.** For anything multi-file or
   multi-phase, use the Plan tool (`ExitPlanMode`) so it's reviewed before
   code changes start.
6. **Break work into small phases** when the task is large enough to
   warrant it. Small, well-scoped tasks (a CSS tweak, a one-line fix) skip
   straight to implementation — this workflow scales down, it doesn't add
   ceremony to trivial changes.
7. **Implement one phase at a time.**
8. **Verify each phase** before moving to the next — don't stack unverified
   changes.
9. **Run appropriate tests** (`npx jest ...` for backend; live boot +
   manual exercise for anything UI-facing, per this project's existing
   "run the dev server and use the feature" standard).
10. **Perform a self-review** of the actual diff before calling it done.
11. **Confirm no unrelated files were modified.**
12. **Confirm backward compatibility** — existing data, existing API
    contracts, existing conversations/records must keep working with no
    migration required unless explicitly scoped in.
13. **Summarize what changed and why** at the end — concise, no padding.

## Standing rules

- Never skip the audit phase, even under time pressure.
- Never guess architecture — read it.
- Never duplicate existing functionality — extend what's there
  (services, middleware, components) over creating parallel systems.
- Never modify files outside the scope of the current task.
- Keep changes modular; favor SOLID boundaries already established by this
  codebase's feature-based backend structure
  (`server/src/features/<feature>/{model,service,controller,routes,schema}.js`).
- Avoid new dependencies unless there's a clear, stated benefit.
- Security, multi-tenancy isolation, and auth/RBAC correctness are
  first-class concerns on every change that touches them — not an
  afterthought pass.
- Optimize for maintainability over short-term speed.

## Explicitly preserved unless the user asks otherwise

Authentication, authorization, JWT/refresh-token architecture,
multi-tenancy (`agencyId` discriminator + `resolveTenant`), database
schemas, API contracts, existing frontend components, the existing AI
Assistant architecture (offline deterministic engine — see
`server/src/features/ai/`), and build/deploy configuration are not to be
changed as a side effect of unrelated work.
