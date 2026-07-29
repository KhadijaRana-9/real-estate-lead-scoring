# Security Audit

Every finding is tied to a real line in this repo. Severity is rated by realistic exploitability against this specific app, not generic OWASP boilerplate.

## Critical

### 1. Mass assignment — `property.controller.js:32,41`, `property.service.js:54,71`
```js
async function updateProperty(id, data, requester) {
  const property = await Property.findById(id);
  ...
  Object.assign(property, data); // data === raw req.body
```
Any authenticated agent can `PUT /api/properties/:id` with `{ agent: '<someone else's userId>' }` and transfer a listing's ownership, or set `views` to any number. `createProperty` (`:54`) is partially protected (`agent: agentId` is spread *after* `...data`, so ownership can't be forged on create) but `status`, `views`, and any future field are fully attacker-controlled on update.
**Fix:** whitelist via Zod schema with `.strict()` semantics (unknown keys stripped by default on `.parse()`) — see the Zod schemas being added in this session. Never spread `req.body` into a Mongoose write.

### 2. No input validation — every route
`auth.controller.js:10`, `inquiry.controller.js:6` do manual truthy checks (`if (!name || !email...)`) and nothing else. No length limits, no format checks (email format, phone format), no type coercion guarantees. Mongoose schema validation is the only real backstop, and it fires *after* a DB round-trip, producing inconsistent error shapes.
**Fix:** Zod schema + validation middleware in front of every route handler (in progress).

### 3. JWT has no revocation path — `auth.service.js:40-46`, `.env.example: JWT_EXPIRES_IN=7d`
A stolen token (XSS, leaked log, shared device) is valid for a week with no way to invalidate it server-side. "Logout" only removes it from `localStorage` client-side (`AuthContext.jsx:36-40`) — the token itself remains usable against the API until it naturally expires.
**Fix:** short-lived access token (10–15 min) + DB-backed, rotatable refresh token that can be revoked on logout/password-change/suspicious-activity (in progress).

### 4. No rate limiting — anywhere, especially `/api/auth/login`
`auth.controller.js:22` has no throttling. Password brute-forcing and account enumeration (the "Invalid email or password" message is at least uniform, which is correct — don't change that) are unmitigated.
**Fix:** `express-rate-limit`, stricter window on `/api/auth/*` (in progress).

## High

### 5. Unescaped regex from user input — `property.service.js:10`
```js
if (city) filter.city = new RegExp(`^${city}$`, 'i');
```
`city` comes straight from `req.query` on a **public, unauthenticated** endpoint. This is a classic ReDoS/regex-injection surface — a crafted `city` value can inject regex metacharacters. At minimum, escape regex special characters before interpolating; better, validate `city` against an allowlist of known cities via the Zod query schema.

### 6. No `helmet` — `app.js`
No security headers at all: no `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or CSP. One line (`app.use(helmet())`) closes most of this.

### 7. No NoSQL-injection hardening
Mongoose parameterizes most queries, which mitigates classic injection, but query params are passed through with light coercion (`property.service.js:12, 15-16` do `Number(...)`, which is good) — this is *mostly* safe today because numeric fields are explicitly cast, but there's no systematic guard (`express-mongo-sanitize`) against operator injection (`{"$gt": ""}`-style payloads) if a new endpoint is added carelessly later. Add it as a global middleware now, cheaply, rather than relying on every future route author remembering to cast.

## Medium

### 8. CORS is origin-restricted but single-value in practice — `app.js:13`, `env.js:16`
`CLIENT_ORIGIN` defaults to `http://localhost:5173` and is comma-split for multiple origins — correctly implemented, just flagging: make sure the production env var is the exact deployed frontend origin, never `*`, especially once refresh tokens move to cookies (see below).

### 9. CSRF: currently low risk, will become relevant
Auth is Bearer-token-in-header (`axios.js:7-13`), not cookie-based, so CSRF isn't currently exploitable. **If** the refresh token migrates to an httpOnly cookie (recommended for XSS resistance — see #3's fix), CSRF protection (`SameSite=Strict` + double-submit token) becomes mandatory at that point, not optional.

### 10. XSS: low risk today, one rule to preserve
React JSX auto-escapes, and nothing in the client uses `dangerouslySetInnerHTML` on user-supplied content (`property.description`, `inquiry.message`) as far as reviewed. Keep it that way — the moment someone wants "rich text" descriptions, that's the moment a sanitizer (DOMPurify) becomes non-negotiable.

### 11. Secrets handling
`env.js:1-9` correctly fails fast if `MONGO_URI`/`JWT_SECRET` are missing — good practice, keep it. `.env`, `.env.local` are present in the repo working tree; confirm `.gitignore` covers all of `server/.env`, `server/.env.local`, `client/.env.local` (the root `.gitignore` was mid-edit per the git status at session start — worth double-checking before any commit). For production, prefer the hosting platform's secret manager (Vercel env vars, already in use) over `.env` files; never commit a real `JWT_SECRET`.

## Enterprise-grade additions once foundations are in

- **Password policy**: minimum length/complexity enforced via Zod on signup (currently `passwordHash` accepts anything bcrypt can hash — no minimum length check exists anywhere).
- **Audit log**: who changed what on a listing, and when — needed once multiple agents can touch the same tenant's data.
- **Tenant isolation enforcement**: once multi-tenancy lands, every query must be provably scoped — add an automated test that asserts cross-tenant reads are impossible, not just a code review checklist.
- **2FA** for admin accounts before this holds real customer PII at scale.
- **Dependency scanning**: `npm audit` (or Snyk/Dependabot) wired into CI so vulnerable transitive deps get flagged automatically, not discovered manually.
- **Secrets rotation policy**: documented process for rotating `JWT_SECRET` without invalidating every session simultaneously (dual-secret verification window).

## What's already right (don't regress these)

- Passwords are bcrypt-hashed (`auth.service.js:16`), never returned to the client (`toPublicUser`, `auth.controller.js:4`).
- Login error messages don't leak whether the email or password was wrong (`auth.service.js:25,32`) — correct anti-enumeration practice.
- RBAC via `requireRole` middleware is applied consistently on write routes (`property.routes.js:12-14`, `inquiry.routes.js:9`).
- Ownership checks exist on update/delete (`property.service.js:65,83`) — the bug is that they check the *wrong thing is protected* (role/ownership, yes; *which fields* can be written, no), not that they're missing.
