const bcrypt = require('bcryptjs');
const Agency = require('../agency/agency.model');
const User = require('../auth/auth.model');
const { uploadFile } = require('../../shared/storage');
const stripeProvider = require('../billing/providers/stripeProvider');
const { PLANS, TRIAL_DAYS } = require('../billing/billing.constants');

const SALT_ROUNDS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const DOCUMENT_FIELDS = [
  { field: 'registrationCertificate', docType: 'registration_certificate' },
  { field: 'businessLicense', docType: 'business_license' },
  { field: 'cnicDocument', docType: 'cnic' },
  { field: 'officeProof', docType: 'office_proof' },
];

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// `files` is multer's `.fields()` shape - an object keyed by field name,
// each value an array (0 or 1 entries here, every field is maxCount 1).
async function uploadVerificationDocuments(files) {
  const missing = DOCUMENT_FIELDS.filter(({ field }) => !files?.[field]?.[0]);
  if (missing.length > 0) {
    throw badRequest(`Missing required verification document(s): ${missing.map((m) => m.field).join(', ')}`);
  }

  return Promise.all(
    DOCUMENT_FIELDS.map(async ({ field, docType }) => {
      const file = files[field][0];
      const result = await uploadFile(file.buffer, file.originalname, file.mimetype);
      return { docType, name: file.originalname, url: result.url, type: file.mimetype };
    })
  );
}

async function uploadOptionalImage(files, field) {
  const file = files?.[field]?.[0];
  if (!file) return '';
  const result = await uploadFile(file.buffer, file.originalname, file.mimetype);
  return result.url;
}

// The full Step 1-4 submission, in one request (see AgencyOnboarding.jsx
// - files are held as in-memory File objects across the wizard's steps
// client-side and only actually uploaded here, at final submit, rather
// than needing a pre-auth "draft" concept like PropertyWizard's, since
// no authenticated session exists yet for an anonymous applicant).
//
// Creates a real, persisted Agency (status: 'pending') and its owner
// User (role: 'agency_admin') immediately - not a separate "registration
// request" record - so the exact same Agency/User documents every other
// feature already works with (billing, properties, dashboard) just start
// out gated by `status` instead of needing a parallel review-queue model.
async function register(data, files) {
  const existingSlug = await Agency.findOne({ slug: data.slug }).select('_id');
  if (existingSlug) throw conflict('This workspace URL is already taken. Please choose another.');

  const plan = PLANS[data.subscriptionPlan];
  if (!plan) throw badRequest(`Unknown plan "${data.subscriptionPlan}"`);

  const verificationDocuments = await uploadVerificationDocuments(files);
  const [logo, ownerAvatar] = await Promise.all([uploadOptionalImage(files, 'logo'), uploadOptionalImage(files, 'profilePicture')]);

  const isTrial = data.subscriptionPlan === 'trial';

  const agency = await Agency.create({
    companyName: data.companyName,
    slug: data.slug,
    contactEmail: data.ownerEmail,
    logo,
    description: data.description,
    establishedYear: data.establishedYear ?? null,
    website: data.website,
    address: data.address,
    city: data.city,
    country: data.country,
    subscriptionPlan: data.subscriptionPlan,
    subscriptionStatus: 'trialing',
    billingCycle: isTrial ? 'monthly' : data.billingCycle,
    // A real 7-day window (see resolveTenant.js, which blocks feature
    // routes once this passes) - null for every other tier, which is
    // exactly what makes that check a no-op for them (see its own
    // comment for why that's the right signal to key off, not
    // subscriptionStatus alone).
    trialEndsAt: isTrial ? new Date(Date.now() + TRIAL_DAYS * DAY_MS) : null,
    status: 'pending',
    // Free Trial never owes Stripe anything - 'unpaid' would be
    // misleading (implies a charge is pending), so it gets the same
    // 'not_required' a super_admin-direct-created agency gets.
    paymentStatus: isTrial ? 'not_required' : 'unpaid',
    verificationDocuments,
  });

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await User.create({
    name: data.ownerName,
    email: data.ownerEmail,
    passwordHash,
    role: 'agency_admin',
    agencyId: agency._id,
    phone: data.ownerPhone,
    cnic: data.ownerCnic,
    avatar: ownerAvatar,
  });

  // Free Trial never talks to Stripe at all - no checkout, no card, full
  // access for TRIAL_DAYS via the trialEndsAt set above. Otherwise this
  // mirrors billing.service.js's requestUpgrade: when Stripe isn't
  // configured (no STRIPE_SECRET_KEY - the real state of this
  // environment today), registration still succeeds and the agency is
  // left pending for admin review; nothing here pretends a payment
  // happened. Once configured, the exact same code path returns a real
  // Checkout URL and the frontend redirects to it.
  if (isTrial || !stripeProvider.isConfigured()) {
    return { agency, checkoutUrl: null, paymentConfigured: !isTrial && stripeProvider.isConfigured() };
  }

  const clientOrigin = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173';
  const session = await stripeProvider.createCheckoutSession({
    agencyId: agency._id,
    plan: data.subscriptionPlan,
    price: data.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly,
    interval: data.billingCycle === 'yearly' ? 'year' : 'month',
    currency: plan.currency,
    successUrl: `${clientOrigin}/register/pending?agencyId=${agency._id}`,
    cancelUrl: `${clientOrigin}/register/pending?agencyId=${agency._id}&payment=cancelled`,
  });

  return { agency, checkoutUrl: session.url, paymentConfigured: true };
}

// Public, minimal-data status check - lets RegistrationPending.jsx poll
// for approval without needing to authenticate (no session exists yet
// for a pending applicant). Deliberately returns only status/company
// name/rejection reason, never anything else on the Agency doc (no
// contact info, no verification documents, no billing state).
async function getRegistrationStatus(agencyId) {
  const agency = await Agency.findById(agencyId).select('companyName slug status rejectionReason');
  if (!agency) throw notFound('Registration not found');
  return { status: agency.status, companyName: agency.companyName, slug: agency.slug, rejectionReason: agency.rejectionReason };
}

module.exports = { register, getRegistrationStatus };
