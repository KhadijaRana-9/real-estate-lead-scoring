// Core logic for the demo/test-account seed, extracted so it can run both
// from the CLI script (npm run seed) and from an already-connected process
// (e.g. an authenticated ops route), same rationale and pattern as
// ../../migrations/lib/introduceAgencies.js and categorizeMedia.js. See
// ../seed.js for the CLI entry point. Logic is copied verbatim from the
// pre-extraction seed.js - no behavioral change, only removed the
// connectDB/loadEnv/process.exit calls that only make sense for a
// standalone CLI process.

const bcrypt = require('bcryptjs');

const Agency = require('../../features/agency/agency.model');
const User = require('../../features/auth/auth.model');
const Property = require('../../features/property/property.model');
const Inquiry = require('../../features/inquiry/inquiry.model');
const { calculateLeadScore } = require('../../shared/utils/leadScoring');

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

async function runDemoSeed() {
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

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await upsertUser({ name: 'Admin User', email: 'admin@dreamhomes.pk', passwordHash, role: 'agency_admin', agencyId: agency._id });
  const agents = await Promise.all([
    upsertUser({ name: 'Ahmed Raza', email: 'ahmed.agent@dreamhomes.pk', passwordHash, role: 'agent', agencyId: agency._id }),
    upsertUser({ name: 'Sara Khan', email: 'sara.agent@dreamhomes.pk', passwordHash, role: 'agent', agencyId: agency._id }),
  ]);
  await upsertUser({ name: 'Bilal Customer', email: 'bilal.customer@dreamhomes.pk', passwordHash, role: 'customer', agencyId: agency._id });

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

  const existingInquiryCount = await Inquiry.countDocuments({ agencyId: agency._id });
  let inquiriesCreated = 0;
  if (existingInquiryCount === 0) {
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
    inquiriesCreated = inquiries.length;
  }

  return { agencyId: agency._id, admin: admin.email, agents: agents.map((a) => a.email), inquiriesCreated };
}

const TEST_AGENCY_SLUG = 'test-agency';
const TEST_PASSWORD = 'Password123!';

async function upsertTestUser({ name, email, role, agencyId }) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  return User.findOneAndUpdate(
    { agencyId, email: email.toLowerCase() },
    { $set: { name, email: email.toLowerCase(), passwordHash, role, agencyId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function runTestAccountSeed() {
  const testAgency = await Agency.findOneAndUpdate(
    { slug: TEST_AGENCY_SLUG },
    {
      $set: {
        companyName: 'Test Agency',
        contactEmail: 'contact@test-agency.example.com',
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active',
        status: 'active',
      },
      $setOnInsert: { slug: TEST_AGENCY_SLUG },
    },
    { upsert: true, new: true }
  );

  const agencyOwner = await upsertTestUser({
    name: 'Test Agency Owner',
    email: 'test.agency.owner@example.com',
    role: 'agency_admin',
    agencyId: testAgency._id,
  });

  const agent = await upsertTestUser({
    name: 'Test Agent',
    email: 'test.agent@example.com',
    role: 'agent',
    agencyId: testAgency._id,
  });

  const customer = await upsertTestUser({
    name: 'Test Customer',
    email: 'test.customer@example.com',
    role: 'customer',
    agencyId: testAgency._id,
  });

  const superAdminHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const superAdmin = await User.findOneAndUpdate(
    { role: 'super_admin', email: 'test.superadmin@example.com' },
    { $set: { name: 'Test Super Admin', email: 'test.superadmin@example.com', passwordHash: superAdminHash, role: 'super_admin', agencyId: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const testProperties = [
    { title: 'Test Agent Villa - DHA Phase 6', city: 'Lahore', type: 'house', price: 45000000, area: 10, bedrooms: 5, bathrooms: 4 },
    { title: 'Test Agent Apartment - Clifton', city: 'Karachi', type: 'flat', price: 22000000, area: 6, bedrooms: 3, bathrooms: 2 },
    { title: 'Test Agent Plot - Bahria Town', city: 'Islamabad', type: 'plot', price: 15000000, area: 8, bedrooms: 0, bathrooms: 0 },
  ];

  const createdTestProperties = [];
  for (const p of testProperties) {
    // eslint-disable-next-line no-await-in-loop
    const property = await Property.findOneAndUpdate(
      { agencyId: testAgency._id, title: p.title },
      {
        $setOnInsert: {
          agencyId: testAgency._id,
          title: p.title,
          description: `A real seeded test listing in ${p.city}, used to verify agent listing visibility and tenant isolation.`,
          price: p.price,
          city: p.city,
          area: p.area,
          areaUnit: 'marla',
          type: p.type,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          images: [IMAGE_POOL[0]],
          agent: agent._id,
          status: 'available',
          views: 12,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdTestProperties.push(property);
  }

  const existingTestInquiry = await Inquiry.findOne({ agencyId: testAgency._id, 'customer.email': customer.email });
  let testInquiryCreated = false;
  if (!existingTestInquiry) {
    const referenceProperty = createdTestProperties[0];
    const { total, status, breakdown } = calculateLeadScore({
      budget: referenceProperty.price,
      price: referenceProperty.price,
      moveTimeline: '1-3m',
      message: 'Interested in scheduling a viewing - this looks like a great fit for our family.',
      phone: '03001234567',
      propertyViews: referenceProperty.views,
    });
    await Inquiry.create({
      agencyId: testAgency._id,
      property: referenceProperty._id,
      customer: { name: customer.name, email: customer.email, phone: '03001234567' },
      message: 'Interested in scheduling a viewing - this looks like a great fit for our family.',
      budget: referenceProperty.price,
      moveTimeline: '1-3m',
      score: total,
      status,
      scoreBreakdown: breakdown,
    });
    testInquiryCreated = true;
  }

  return {
    agencyId: testAgency._id,
    superAdmin: superAdmin.email,
    agencyOwner: agencyOwner.email,
    agent: agent.email,
    customer: customer.email,
    testInquiryCreated,
  };
}

async function runSeed() {
  const demo = await runDemoSeed();
  const test = await runTestAccountSeed();
  return { demo, test };
}

module.exports = { runSeed, runDemoSeed, runTestAccountSeed };
