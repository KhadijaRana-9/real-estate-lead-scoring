// Reusable, PRODUCTION-SAFE demo bootstrap. Run with:
//   npm run seed
//
// Every write is an upsert or an existence-checked insert, keyed by a
// real business identifier (agency slug, user email, property title
// within this agency). Re-running it is a no-op for anything that
// already exists. It NEVER deletes or modifies data outside what it
// itself owns (agencyId: dreamhomes-agency._id), so it is safe to run
// against a database that already has real, unrelated data in it -
// which is exactly the situation production was in when this was
// rewritten (see server/src/migrations/001_introduce_agencies.js for
// the actual fix for that: migrating pre-existing data, not seeding
// fresh demo data over it).

require('dotenv').config();
const bcrypt = require('bcryptjs');

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const Agency = require('../features/agency/agency.model');
const User = require('../features/auth/auth.model');
const Property = require('../features/property/property.model');
const Inquiry = require('../features/inquiry/inquiry.model');
const { calculateLeadScore } = require('../shared/utils/leadScoring');

const SEED_AGENCY_SLUG = 'dreamhomes';

const CITIES = ['Faisalabad', 'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi'];
const TYPES = ['house', 'flat', 'plot'];
const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function upsertUser({ name, email, passwordHash, role, agencyId }) {
  return User.findOneAndUpdate(
    { agencyId, email: email.toLowerCase() },
    { $setOnInsert: { name, email, passwordHash, role, agencyId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  console.log('Ensuring seed Agency exists (upsert, never overwrites an existing one)...');
  const agency = await Agency.findOneAndUpdate(
    { slug: SEED_AGENCY_SLUG },
    {
      $setOnInsert: {
        companyName: 'DreamHomes',
        slug: SEED_AGENCY_SLUG,
        contactEmail: 'admin@dreamhomes.pk',
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active',
        status: 'active',
      },
    },
    { upsert: true, new: true }
  );

  console.log('Ensuring demo users exist (upsert by email within this agency)...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await upsertUser({ name: 'Admin User', email: 'admin@dreamhomes.pk', passwordHash, role: 'agency_admin', agencyId: agency._id });
  const agents = await Promise.all([
    upsertUser({ name: 'Ahmed Raza', email: 'ahmed.agent@dreamhomes.pk', passwordHash, role: 'agent', agencyId: agency._id }),
    upsertUser({ name: 'Sara Khan', email: 'sara.agent@dreamhomes.pk', passwordHash, role: 'agent', agencyId: agency._id }),
  ]);
  await upsertUser({ name: 'Bilal Customer', email: 'bilal.customer@dreamhomes.pk', passwordHash, role: 'customer', agencyId: agency._id });

  console.log('Ensuring demo properties exist (upsert by title within this agency)...');
  const titles = [
    'Luxury Villa', 'Modern Bungalow', 'Cozy Apartment', 'Family House', 'Corner Plot',
    'Downtown Flat', 'Garden Villa', 'Executive House', 'Studio Apartment', 'Investment Plot',
    'Hillside Home', 'Gated Community House',
  ];

  const createdProperties = [];
  for (const title of titles) {
    const city = pick(CITIES);
    const type = pick(TYPES);
    const area = randomBetween(3, 12);
    const bedrooms = type === 'plot' ? 0 : randomBetween(1, 6);
    const bathrooms = type === 'plot' ? 0 : randomBetween(1, bedrooms + 1);
    const price = randomBetween(5, 30) * 1000000;

    // eslint-disable-next-line no-await-in-loop
    const property = await Property.findOneAndUpdate(
      { agencyId: agency._id, title },
      {
        $setOnInsert: {
          agencyId: agency._id,
          title,
          description: `A beautiful ${type} located in ${city}, offering ${area} marla of prime real estate.`,
          price,
          city,
          area,
          areaUnit: 'marla',
          type,
          bedrooms,
          bathrooms,
          images: [pick(IMAGE_POOL)],
          agent: pick(agents)._id,
          status: 'available',
          views: randomBetween(0, 60),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdProperties.push(property);
  }

  console.log('Ensuring sample inquiries exist (skipped if this agency already has any)...');
  const existingInquiryCount = await Inquiry.countDocuments({ agencyId: agency._id });
  if (existingInquiryCount > 0) {
    console.log(`  ${existingInquiryCount} inquiries already exist for this agency - skipping (not duplicating).`);
  } else {
    const timelines = ['immediate', '1-3m', '3-6m', 'exploring'];
    const sampleCustomers = [
      { name: 'Usman Tariq', email: 'usman@example.com', phone: '03001234567' },
      { name: 'Ayesha Malik', email: 'ayesha@example.com', phone: '03011234567' },
      { name: 'Hassan Iqbal', email: 'hassan@example.com', phone: null },
      { name: 'Fatima Noor', email: 'fatima@example.com', phone: '03211234567' },
    ];

    const inquiries = [];
    for (const property of createdProperties.slice(0, 8)) {
      const customer = pick(sampleCustomers);
      const moveTimeline = pick(timelines);
      const message = pick([
        'Interested in scheduling a viewing this weekend, please call me back.',
        'Is the price negotiable? Looking to move in soon.',
        'Can you share more photos of the interior and the neighborhood?',
        'Just browsing for now, exploring options in the area.',
      ]);
      const budget = property.price + randomBetween(-2000000, 2000000);

      const { total, status, breakdown } = calculateLeadScore({
        budget, price: property.price, moveTimeline, message, phone: customer.phone, propertyViews: property.views,
      });

      inquiries.push({
        agencyId: agency._id,
        property: property._id,
        customer: { name: customer.name, email: customer.email, phone: customer.phone },
        message, budget, moveTimeline, score: total, status, scoreBreakdown: breakdown,
      });
    }

    await Inquiry.insertMany(inquiries);
    console.log(`  ${inquiries.length} inquiries created.`);
  }

  console.log('\nSeed complete (idempotent - safe to re-run).');
  console.log('Login credentials (password for all: "Password123!"):');
  console.log(`  Admin:  ${admin.email}`);
  agents.forEach((a) => console.log(`  Agent:  ${a.email}`));

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
