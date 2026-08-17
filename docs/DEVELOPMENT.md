# Development notes

## Development Test Accounts

These are **development/local credentials only** — clearly fake, never used in
production. They are created and kept correct by `npm run seed` (run from
`server/`), which is safe to re-run at any time: it force-resets these
specific accounts' password/role/agency membership on every run, without
touching any other data.

All passwords: `Password123!`

### Customer
- Email: `test.customer@example.com`
- Password: `Password123!`
- Agency/workspace: `test-agency`

### Agency Owner (`agency_admin`)
- Email: `test.agency.owner@example.com`
- Password: `Password123!`
- Agency: **Test Agency** (`test-agency`)

### Agent (already belongs to an agency)
- Email: `test.agent@example.com`
- Password: `Password123!`
- Agency: **Test Agency** (`test-agency`)
- Has 3 real seeded listings under Test Agency, visible immediately in
  "My Listings" after logging in — used to verify agent listing
  visibility and tenant isolation without creating anything by hand.

### Super Admin
- Email: `test.superadmin@example.com`
- Password: `Password123!`
- Logs in via the separate platform console login (`/platform/login`),
  not the regular per-agency login — this role has no `agencyId` and is
  never tenant-scoped.

> **Platform Admin** is not a separate role in this codebase. `ROLES` in
> `server/src/features/auth/auth.model.js` is
> `['super_admin', 'agency_admin', 'agent', 'customer']` — Super Admin
> *is* the platform administrator. No separate role was invented for
> this.

### Logging in

- Customer / Agent / Agency Owner: the regular login page
  (`/login`), workspace `test-agency` (either via
  `?workspace=test-agency` in the URL, or by typing `test-agency` into
  the "Agency workspace" field shown for the "Agent / Agency" tab).
- Super Admin: `/platform/login` (no workspace needed).

### Also present: the original demo "DreamHomes" agency

Separately from the deterministic accounts above, the original demo seed
(random cities/prices, `Password123!` for all) still seeds the
`dreamhomes` agency and its own admin/agent/customer accounts
(`admin@dreamhomes.pk`, `ahmed.agent@dreamhomes.pk`,
`sara.agent@dreamhomes.pk`, `bilal.customer@dreamhomes.pk`). This is
kept exactly as it was — the deterministic Test Agency accounts above
exist *in addition to* it, specifically so cross-tenant isolation
(Test Agency vs. dreamhomes) can actually be exercised.

## Running the seed

```bash
cd server
npm run seed
```

Idempotent: safe to run as many times as you want. It will never create
duplicate agencies, users, agents, properties, or the seeded test
inquiry — everything is looked up by a stable key (agency slug, user
email, property title within its agency) before writing.

## Running the test suite — MongoDB must be a replica set

`agencies.service.js` (`deleteAgency`) uses a multi-document Mongo
transaction, and several integration tests exercise it. Multi-document
transactions require MongoDB to be running as a replica set (or mongos)
— a bare `mongod` running standalone will fail every test that touches
this path with:

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

This mirrors production: every managed MongoDB this app targets (e.g.
Atlas) is always a replica set, so the code intentionally does not
degrade to non-atomic deletes on a standalone server — it fails loudly
instead (see the comment above `deleteAgency`).

If your local `mongod` is standalone, either:
- point `TEST_MONGO_URI` at a replica-set-enabled instance, or
- initialize your local instance as a single-node replica set once:
  add `replication: { replSetName: rs0 }` to `mongod.cfg`, restart the
  service, then run `mongosh --eval "rs.initiate()"` (or the
  equivalent `replSetInitiate` command via the Node driver) against it.

```bash
cd server
TEST_MONGO_URI="mongodb://127.0.0.1:27017/realestate_test" npx jest
```
