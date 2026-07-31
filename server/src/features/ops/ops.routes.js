// TEMPORARY, one-time-use ops route for the production migration performed
// on 2026-07-31. Gated by a random secret (OPS_MIGRATION_SECRET) that
// exists only as a Vercel env var - never committed, never logged. Exists
// solely because the production MONGO_URI is Vercel "Sensitive"-flagged
// and unreadable via CLI, so migrations can't be run against it directly
// from a local shell; this lets the already-connected production process
// run its own (idempotent, non-destructive) migrations on request instead.
//
// Delete this whole file (and the route mount in app.js, and the env var)
// once the migration has been run and verified. It is not meant to be a
// permanent part of the app.

const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { runIntroduceAgenciesMigration } = require('../../migrations/lib/introduceAgencies');
const { runCategorizeMediaMigration } = require('../../migrations/lib/categorizeMedia');

const router = express.Router();

function requireOpsSecret(req, res, next) {
  const expected = process.env.OPS_MIGRATION_SECRET;
  const provided = req.headers['x-ops-secret'];
  if (!expected || !provided) {
    return res.status(404).json({ message: 'Not found' });
  }
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(404).json({ message: 'Not found' });
  }
  return next();
}

router.use(requireOpsSecret);

router.get('/db-info', (req, res) => {
  const conn = mongoose.connection;
  res.json({
    host: conn.host,
    name: conn.name,
    readyState: conn.readyState,
  });
});

router.post('/migrate', async (req, res, next) => {
  try {
    const agencies = await runIntroduceAgenciesMigration();
    const media = await runCategorizeMediaMigration();
    res.json({ agencies, media });
  } catch (err) {
    next(err);
  }
});

router.get('/verify', async (req, res, next) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const counts = {};
    await Promise.all(
      collections.map(async (c) => {
        counts[c.name] = await mongoose.connection.db.collection(c.name).countDocuments();
      })
    );
    res.json({ collections: counts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
