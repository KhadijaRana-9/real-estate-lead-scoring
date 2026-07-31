// Reusable, PRODUCTION-SAFE demo-dataset generator. Run with:
//   npm run seed:large
//
// Ensures a set of demo agencies/agents exist (never destructively
// touches User/Agency - safe to re-run without breaking existing
// logins). By default this is purely additive/idempotent: if these 5
// demo agencies already have properties, it does nothing further. Any
// deletion is scoped ONLY to agencyId IN (these 5 demo agencies' own
// ids) - it can never touch a property/inquiry belonging to any other
// agency, including real pre-existing production data that predates
// these demo agencies entirely. Set SEED_FORCE_REGENERATE=true to
// intentionally wipe and rebuild just these 5 agencies' own demo data.

require('dotenv').config();
const bcrypt = require('bcryptjs');

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const Agency = require('../features/agency/agency.model');
const User = require('../features/auth/auth.model');
const Property = require('../features/property/property.model');
const Inquiry = require('../features/inquiry/inquiry.model');
const { calculateLeadScore } = require('../shared/utils/leadScoring');

const TOTAL_PROPERTIES = Number(process.env.SEED_PROPERTY_COUNT) || 10000;
const BATCH_SIZE = 1000;
const PASSWORD = 'Password123!';

const AGENCIES = [
  { companyName: 'DreamHomes', slug: 'dreamhomes', contactEmail: 'admin@dreamhomes.pk', subscriptionPlan: 'professional', subscriptionStatus: 'active', weight: 4 },
  { companyName: 'Al-Falah Estates', slug: 'al-falah-estates', contactEmail: 'contact@alfalahestates.pk', subscriptionPlan: 'enterprise', subscriptionStatus: 'active', weight: 3 },
  { companyName: 'Prime Homes Pakistan', slug: 'prime-homes-pk', contactEmail: 'hello@primehomes.pk', subscriptionPlan: 'starter', subscriptionStatus: 'trialing', weight: 2 },
  { companyName: 'Capital Realty Partners', slug: 'capital-realty', contactEmail: 'info@capitalrealty.pk', subscriptionPlan: 'professional', subscriptionStatus: 'active', weight: 2 },
  { companyName: 'Skyline Properties', slug: 'skyline-properties', contactEmail: 'sales@skylineproperties.pk', subscriptionPlan: 'starter', subscriptionStatus: 'trialing', weight: 1 },
];

const AGENT_NAMES = [
  'Ahmed Raza', 'Sara Khan', 'Bilal Hussain', 'Ayesha Siddiqui', 'Usman Tariq',
  'Fatima Noor', 'Hassan Iqbal', 'Mariam Yousaf', 'Kamran Aslam', 'Zainab Malik',
];

const CITY_CENTERS = {
  Lahore: { lat: 31.5497, lng: 74.3436 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Faisalabad: { lat: 31.4504, lng: 73.1350 },
  Multan: { lat: 30.1575, lng: 71.5249 },
  Peshawar: { lat: 34.0151, lng: 71.5249 },
  Quetta: { lat: 30.1798, lng: 66.9750 },
};

const LOCALITIES_BY_CITY = {
  Lahore: ['DHA Phase 5', 'DHA Phase 6', 'DHA Phase 8', 'Gulberg III', 'Johar Town', 'Model Town', 'Bahria Town', 'Askari X', 'Wapda Town', 'Valencia'],
  Karachi: ['DHA Phase 8', 'DHA Phase 6', 'Bahria Town Karachi', 'Gulshan-e-Iqbal', 'Clifton', 'North Nazimabad', 'Gulistan-e-Johar', 'Malir Cantt'],
  Islamabad: ['DHA Islamabad', 'Bahria Town Islamabad', 'F-10', 'F-11', 'G-13', 'G-11', 'Bani Gala', 'PWD Housing Society'],
  Rawalpindi: ['Bahria Town Rawalpindi', 'DHA Phase 2', 'Askari XI', 'Chaklala Scheme 3', 'Satellite Town'],
  Faisalabad: ['Model Town', 'Gulberg', 'Wapda City', 'Jinnah Colony', 'Madina Town'],
  Multan: ['Bosan Road', 'Gulgasht Colony', 'Model Town', 'Cantt Area'],
  Peshawar: ['Hayatabad', 'DHA Peshawar', 'University Town', 'Warsak Road'],
  Quetta: ['Cantt Area', 'Jinnah Town', 'Samungli Road', 'Airport Road'],
};

const RESIDENTIAL_TYPES = ['house', 'flat', 'plot', 'farmhouse'];
const COMMERCIAL_TYPES = ['office', 'shop', 'warehouse'];

const AMENITY_POOL = [
  'Parking', '24/7 Security', 'Gym', 'Swimming Pool', 'Park View', 'Corner Plot',
  'Servant Quarter', 'Lawn', 'Solar Panels', 'Generator Backup', 'Elevator', 'CCTV',
  'Gated Community', 'Near Mosque', 'Near School', 'Near Hospital', 'Furnished',
  'Balcony', 'Store Room', 'Water Boring', 'Central AC', 'Fire Safety System',
];

const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
];

const TITLE_ADJECTIVES = ['Luxury', 'Modern', 'Spacious', 'Cozy', 'Elegant', 'Executive', 'Charming', 'Contemporary', 'Prime', 'Stunning'];
const TITLE_NOUNS = {
  house: 'House', flat: 'Apartment', plot: 'Plot', farmhouse: 'Farm House',
  office: 'Office Space', shop: 'Shop', warehouse: 'Warehouse',
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLastYear() {
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(Math.random() * oneYearMs));
}

function weightedAgencyPicker(agencyDocs) {
  const pool = [];
  agencyDocs.forEach((doc, i) => {
    const weight = AGENCIES[i].weight;
    for (let w = 0; w < weight; w += 1) pool.push(doc);
  });
  return () => pick(pool);
}

async function ensureAgencies() {
  const docs = [];
  for (const def of AGENCIES) {
    const existing = await Agency.findOne({ slug: def.slug });
    if (existing) {
      docs.push(existing);
      continue;
    }
    const created = await Agency.create({
      companyName: def.companyName,
      slug: def.slug,
      contactEmail: def.contactEmail,
      subscriptionPlan: def.subscriptionPlan,
      subscriptionStatus: def.subscriptionStatus,
      status: 'active',
    });
    docs.push(created);
  }
  return docs;
}

async function ensureAgentsForAgency(agency, count) {
  const existing = await User.find({ agencyId: agency._id, role: 'agent' });
  if (existing.length >= count) return existing;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const toCreate = count - existing.length;
  const newAgents = [];
  for (let i = 0; i < toCreate; i += 1) {
    const name = pick(AGENT_NAMES);
    const email = `agent${existing.length + i + 1}.${agency.slug}@example.com`;
    const already = await User.findOne({ agencyId: agency._id, email });
    if (already) continue;
    newAgents.push({ name, email, passwordHash, role: 'agent', agencyId: agency._id });
  }
  if (newAgents.length) {
    const created = await User.insertMany(newAgents);
    return [...existing, ...created];
  }
  return existing;
}

function buildProperty(agency, agents) {
  const category = Math.random() < 0.75 ? 'residential' : 'commercial';
  const type = category === 'residential' ? pick(RESIDENTIAL_TYPES) : pick(COMMERCIAL_TYPES);
  const city = pick(Object.keys(CITY_CENTERS));
  const center = CITY_CENTERS[city];
  const locality = pick(LOCALITIES_BY_CITY[city]);

  const isPlotLike = type === 'plot' || type === 'warehouse';
  const bedrooms = isPlotLike ? 0 : type === 'shop' || type === 'office' ? randomBetween(0, 2) : randomBetween(1, 6);
  const bathrooms = isPlotLike ? 0 : Math.max(1, Math.round(bedrooms * 0.75));
  const area = randomBetween(3, 20);

  const basePricePerMarla = {
    Islamabad: 3500000, Lahore: 2800000, Karachi: 2600000, Rawalpindi: 2200000, Faisalabad: 1800000,
  }[city] || 1500000;
  const commercialMultiplier = category === 'commercial' ? 1.6 : 1;
  const price = Math.round(
    basePricePerMarla * area * commercialMultiplier * (0.85 + Math.random() * 0.5)
  );

  const views = Math.random() < 0.1 ? randomBetween(200, 900) : randomBetween(0, 150);
  const featured = Math.random() < 0.05;
  const status = Math.random() < 0.08 ? 'sold' : 'available';

  const lat = center.lat + (Math.random() - 0.5) * 0.25;
  const lng = center.lng + (Math.random() - 0.5) * 0.25;

  const agent = pick(agents);
  const title = `${pick(TITLE_ADJECTIVES)} ${TITLE_NOUNS[type]} in ${locality}`;
  const description = `A ${pick(TITLE_ADJECTIVES).toLowerCase()} ${type} located in ${locality}, ${city}, offering ${area} marla of prime real estate. Ideal for ${category === 'commercial' ? 'business use' : 'families'}.`;

  return {
    agencyId: agency._id,
    title,
    description,
    price,
    city,
    locality,
    area,
    areaUnit: 'marla',
    type,
    category,
    bedrooms,
    bathrooms,
    amenities: pickN(AMENITY_POOL, randomBetween(3, 7)),
    location: { lat, lng },
    images: pickN(IMAGE_POOL, randomBetween(1, 4)),
    agent: agent._id,
    status,
    featured,
    views,
    createdAt: randomDateWithinLastYear(),
  };
}

async function seedProperties() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  console.log(`Ensuring ${AGENCIES.length} demo agencies exist...`);
  const agencyDocs = await ensureAgencies();

  console.log('Ensuring agents exist per agency...');
  const agentsByAgency = new Map();
  for (const agency of agencyDocs) {
    const agents = await ensureAgentsForAgency(agency, 5);
    agentsByAgency.set(agency._id.toString(), agents);
    console.log(`  ${agency.companyName}: ${agents.length} agents`);
  }

  // Scoped strictly to these 5 demo agencies' own ids - structurally
  // incapable of touching a property/inquiry belonging to any other
  // agency, no matter what this script's logic does from here.
  const demoAgencyIds = agencyDocs.map((a) => a._id);
  const existingDemoPropertyCount = await Property.countDocuments({ agencyId: { $in: demoAgencyIds } });
  const forceRegenerate = process.env.SEED_FORCE_REGENERATE === 'true';

  if (existingDemoPropertyCount > 0 && !forceRegenerate) {
    console.log(`\nThese demo agencies already have ${existingDemoPropertyCount} properties - skipping generation (idempotent).`);
    console.log('Set SEED_FORCE_REGENERATE=true to wipe and rebuild just this demo dataset.');
    return process.exit(0);
  }

  if (forceRegenerate && existingDemoPropertyCount > 0) {
    console.log(`Regenerating: clearing ${existingDemoPropertyCount} existing properties for these 5 demo agencies only...`);
    await Promise.all([
      Property.deleteMany({ agencyId: { $in: demoAgencyIds } }),
      Inquiry.deleteMany({ agencyId: { $in: demoAgencyIds } }),
    ]);
  }

  const pickAgency = weightedAgencyPicker(agencyDocs);

  console.log(`Generating ${TOTAL_PROPERTIES} properties in batches of ${BATCH_SIZE}...`);
  let inserted = 0;
  const allInsertedIds = [];
  const allInsertedByAgency = new Map();

  while (inserted < TOTAL_PROPERTIES) {
    const batchSize = Math.min(BATCH_SIZE, TOTAL_PROPERTIES - inserted);
    const batch = [];
    for (let i = 0; i < batchSize; i += 1) {
      const agency = pickAgency();
      const agents = agentsByAgency.get(agency._id.toString());
      batch.push(buildProperty(agency, agents));
    }
    const created = await Property.insertMany(batch, { ordered: false });
    created.forEach((doc) => {
      allInsertedIds.push(doc._id);
      const key = doc.agencyId.toString();
      if (!allInsertedByAgency.has(key)) allInsertedByAgency.set(key, []);
      allInsertedByAgency.get(key).push(doc);
    });
    inserted += batchSize;
    console.log(`  ${inserted}/${TOTAL_PROPERTIES}`);
  }

  console.log('Generating sample inquiries (leads) across a subset of properties...');
  const sampleCustomers = [
    { name: 'Usman Tariq', email: 'usman.buyer@example.com', phone: '03001234567' },
    { name: 'Ayesha Malik', email: 'ayesha.buyer@example.com', phone: '03011234567' },
    { name: 'Hassan Iqbal', email: 'hassan.buyer@example.com', phone: null },
    { name: 'Fatima Noor', email: 'fatima.buyer@example.com', phone: '03211234567' },
    { name: 'Kamran Aslam', email: 'kamran.buyer@example.com', phone: '03331234567' },
  ];
  const timelines = ['immediate', '1-3m', '3-6m', 'exploring'];
  const messages = [
    'Interested in scheduling a viewing this weekend, please call me back.',
    'Is the price negotiable? Looking to move in soon.',
    'Can you share more photos of the interior and the neighborhood?',
    'Just browsing for now, exploring options in the area.',
    'Ready to buy immediately if the price is right, please contact me today.',
  ];

  const inquiryTargetCount = Math.round(TOTAL_PROPERTIES * 0.18);
  const shuffledIds = [...allInsertedIds].sort(() => Math.random() - 0.5).slice(0, inquiryTargetCount);

  // Refetch minimal fields needed for scoring in batches to avoid holding
  // 10,000 full documents in memory at once.
  let inquiriesCreated = 0;
  for (let i = 0; i < shuffledIds.length; i += BATCH_SIZE) {
    const idBatch = shuffledIds.slice(i, i + BATCH_SIZE);
    const properties = await Property.find({ _id: { $in: idBatch } }).select('_id price views agencyId');
    const inquiryBatch = properties.map((property) => {
      const customer = pick(sampleCustomers);
      const moveTimeline = pick(timelines);
      const message = pick(messages);
      const budget = Math.max(1, property.price + randomBetween(-2000000, 2000000));

      const { total, status, breakdown } = calculateLeadScore({
        budget, price: property.price, moveTimeline, message, phone: customer.phone, propertyViews: property.views,
      });

      return {
        agencyId: property.agencyId,
        property: property._id,
        customer,
        message,
        budget,
        moveTimeline,
        score: total,
        status,
        scoreBreakdown: breakdown,
        createdAt: randomDateWithinLastYear(),
      };
    });
    await Inquiry.insertMany(inquiryBatch, { ordered: false });
    inquiriesCreated += inquiryBatch.length;
    console.log(`  inquiries ${inquiriesCreated}/${shuffledIds.length}`);
  }

  const finalPropertyCount = await Property.countDocuments({});
  const finalInquiryCount = await Inquiry.countDocuments({});

  console.log('\nSeed complete.');
  console.log(`Total properties in DB: ${finalPropertyCount}`);
  console.log(`Total inquiries in DB: ${finalInquiryCount}`);
  console.log('Demo workspaces (use ?workspace=<slug> or the login page): ' + agencyDocs.map((a) => a.slug).join(', '));
  console.log(`All demo agent accounts use password: ${PASSWORD}`);

  process.exit(0);
}

seedProperties().catch((err) => {
  console.error('seedProperties failed:', err);
  process.exit(1);
});
