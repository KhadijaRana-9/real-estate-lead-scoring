require('dotenv').config();
const bcrypt = require('bcryptjs');

const loadEnv = require('../config/env');
const connectDB = require('../config/db');
const User = require('../features/auth/auth.model');
const Property = require('../features/property/property.model');
const Inquiry = require('../features/inquiry/inquiry.model');

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

async function seed() {
  const env = loadEnv();
  await connectDB(env.mongoUri);

  console.log('Clearing existing data...');
  await Promise.all([User.deleteMany({}), Property.deleteMany({}), Inquiry.deleteMany({})]);

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@dreamhomes.pk',
    passwordHash,
    role: 'admin',
  });

  const agents = await User.create([
    { name: 'Ahmed Raza', email: 'ahmed.agent@dreamhomes.pk', passwordHash, role: 'agent' },
    { name: 'Sara Khan', email: 'sara.agent@dreamhomes.pk', passwordHash, role: 'agent' },
  ]);

  await User.create({
    name: 'Bilal Customer',
    email: 'bilal.customer@dreamhomes.pk',
    passwordHash,
    role: 'customer',
  });

  console.log('Creating properties...');
  const titles = [
    'Luxury Villa',
    'Modern Bungalow',
    'Cozy Apartment',
    'Family House',
    'Corner Plot',
    'Downtown Flat',
    'Garden Villa',
    'Executive House',
    'Studio Apartment',
    'Investment Plot',
    'Hillside Home',
    'Gated Community House',
  ];

  const properties = [];
  for (let i = 0; i < titles.length; i += 1) {
    const city = pick(CITIES);
    const type = pick(TYPES);
    const area = randomBetween(3, 12);
    const bedrooms = type === 'plot' ? 0 : randomBetween(1, 6);
    const bathrooms = type === 'plot' ? 0 : randomBetween(1, bedrooms + 1);
    const price = randomBetween(5, 30) * 1000000;

    properties.push({
      title: titles[i],
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
    });
  }

  const createdProperties = await Property.insertMany(properties);

  console.log('Creating sample inquiries...');
  const { calculateLeadScore } = require('../shared/utils/leadScoring');
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
      budget,
      price: property.price,
      moveTimeline,
      message,
      phone: customer.phone,
      propertyViews: property.views,
    });

    inquiries.push({
      property: property._id,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      message,
      budget,
      moveTimeline,
      score: total,
      status,
      scoreBreakdown: breakdown,
    });
  }

  await Inquiry.insertMany(inquiries);

  console.log('Seed complete.');
  console.log('Login credentials (password for all: "Password123!"):');
  console.log(`  Admin:  ${admin.email}`);
  agents.forEach((a) => console.log(`  Agent:  ${a.email}`));

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
