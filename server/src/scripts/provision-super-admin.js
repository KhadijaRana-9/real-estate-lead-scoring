// Deliberate, manual, one-off bootstrap for the platform's first Super
// Admin account. NOT part of the multi-tenancy migration and never
// triggered automatically - granting platform-wide access across every
// tenant is a privileged action a human should run on purpose.
//
// Usage:
//   SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=... npm run provision:super-admin

require('dotenv').config();
const bcrypt = require('bcryptjs');

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const User = require('../features/auth/auth.model');

async function provision() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Admin';

  if (!email || !password) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables before running this script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await User.findOne({ role: 'super_admin', email: email.toLowerCase() });
  if (existing) {
    console.log(`Super admin ${email} already exists (${existing._id}). Nothing to do.`);
    return process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'super_admin', agencyId: null });
  console.log(`Provisioned super_admin ${user.email} (${user._id})`);
  process.exit(0);
}

provision().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
