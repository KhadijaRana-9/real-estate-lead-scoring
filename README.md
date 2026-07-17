# DreamHomes: Real-Estate Listings Portal with Lead Scoring

A full-stack real-estate portal: property listings with search/filter, an inquiry
flow that captures leads, an agent dashboard with analytics, and two "smart"
logic features: deterministic **lead scoring** and a **price estimator**, both
explainable rather than black boxes.

## Live Demo

**App:** https://real-estate-lead-scoring.vercel.app
(one URL. The frontend transparently proxies `/api/*` to the backend, so there's
nothing else to visit)

**Repo:** https://github.com/KhadijaRana-9/real-estate-lead-scoring

Seeded login (password `Password123!` for all):
- Admin: `admin@dreamhomes.pk`
- Agents: `ahmed.agent@dreamhomes.pk`, `sara.agent@dreamhomes.pk`
- Or sign up as a new customer/agent directly on the site

## Features

- Property listings: create, edit, delete (agents/admins), browse & search (everyone)
- Search & filters: city, price range, property type, minimum bedrooms
- Pagination (10 per page) instead of loading everything at once
- Inquiry form: customers contact an agent about a property with budget & timeline
- **Lead scoring**: every inquiry gets a 0–100 score + hot/warm/cold status, with a
  visible breakdown of *why* (budget match, urgency, interest, popularity)
- **Price estimation**: itemized PKR estimate from city rate, area, bedrooms, bathrooms
- Agent dashboard: stat cards, charts (monthly inquiries, lead status, top properties
  by views), leads table, "my listings" CRUD
- Auth with JWT and 3 roles: admin, agent, customer
- Responsive UI, dark mode, skeleton loading states, toast notifications, empty/error states

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), Tailwind CSS v4, React Router, Axios, React Hook Form, Framer Motion, Recharts, react-hot-toast |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |

## Architecture

```
        React + Vite (client)
               │
        Axios REST calls  (/api/*)
               │
        Express (Node.js)
               │
   JWT auth middleware ──► Role (RBAC) middleware
               │
   Controllers → Services → Utils (leadScoring, priceEstimate)
               │
          Mongoose ODM
               │
            MongoDB
```

The backend is organized by **feature**, not by layer: `auth`, `property`,
`inquiry`, and `dashboard` each own their model, service, controller and routes.
Cross-cutting concerns (JWT middleware, role guard, error handler, the scoring
and pricing utils) live under `shared/`.

## Folder Structure

```
server/
  src/
    config/          env.js (startup validation), db.js
    features/
      auth/          model, service, controller, routes
      property/      model, service, controller, routes
      inquiry/        model, service, controller, routes  (the "Lead")
      dashboard/      service, controller, routes (analytics)
    shared/
      middleware/     auth.js, role.js, error.js
      utils/          leadScoring.js, priceEstimate.js
    seed/            seed.js
  server.js
client/
  src/
    api/             axios instance + endpoint wrappers
    context/          AuthContext (JWT + role)
    components/       Navbar, Footer, PropertyCard, FilterPanel, SearchBar,
                       SkeletonCard, EmptyState, Pagination, charts/*,
                       LeadScoreBreakdown, PriceEstimateBreakdown, PropertyFormModal
    pages/            Home, Listings, PropertyDetail, Login, Signup, AgentDashboard
BUILD_LOG.md
README.md
```

## API Documentation

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Register (role: agent/customer) | ❌ |
| POST | `/api/auth/login` | Login, returns JWT | ❌ |
| GET | `/api/properties` | Search/filter/paginate listings | ❌ |
| GET | `/api/properties/mine` | Agent's own listings (any status) | ✅ Agent/Admin |
| GET | `/api/properties/:id` | Property detail (increments views) | ❌ |
| POST | `/api/properties` | Create listing | ✅ Agent/Admin |
| PUT | `/api/properties/:id` | Update listing (owner only) | ✅ Agent/Admin |
| DELETE | `/api/properties/:id` | Delete listing (owner only) | ✅ Agent/Admin |
| POST | `/api/properties/estimate-price` | Itemized price estimate | ❌ |
| POST | `/api/inquiries` | Submit inquiry (server computes score) | ❌ |
| GET | `/api/inquiries` | Leads for the agent's properties | ✅ Agent/Admin |
| GET | `/api/dashboard/summary` | Dashboard cards + chart data | ✅ Agent/Admin |

## Lead Scoring Logic

Computed server-side (`server/src/shared/utils/leadScoring.js`) when an inquiry
is created. It's deterministic, not random, and the breakdown is stored so the UI
can show *why* a lead scored the way it did:

| Factor | Weight | Rule |
|---|---|---|
| Budget Match | 0-30 | `30 × max(0, 1 − |budget − price| / price)`, closer to asking price scores higher |
| Urgency | 0–25 | immediate=25, 1-3 months=15, 3-6 months=8, exploring=3 |
| Interest | 0–25 | message length (up to 200 chars → full marks) + bonus for supplying a phone number |
| Popularity | 0–20 | log-scaled property view count at time of inquiry (repeat interest in a hot listing counts) |

**Total → hot ≥ 70, warm 40–69, cold < 40.**

## Price Estimation Logic

Heuristic, not ML (`server/src/shared/utils/priceEstimate.js`):

```
estimate = ratePerMarla[city] × area + bedroomPremium × bedrooms + bathroomPremium × bathrooms
```

Rates are a small lookup table for Faisalabad, Lahore, Islamabad, Karachi and
Rawalpindi (with a sane default for other cities); `bedroomPremium` = PKR 300,000,
`bathroomPremium` = PKR 150,000. The API returns the itemized calculation
alongside the total so the UI never shows a bare number.

## Setup Instructions

**Prerequisites:** Node.js 18+, MongoDB running locally (or an Atlas URI).

```bash
# 1. Backend
cd server
npm install
cp .env.example .env      # fill in MONGO_URI / JWT_SECRET
npm run seed               # optional: sample cities, properties, leads
npm run dev                 # http://localhost:5000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Seeded login (password `Password123!` for all):
- Admin: `admin@dreamhomes.pk`
- Agents: `ahmed.agent@dreamhomes.pk`, `sara.agent@dreamhomes.pk`

## Future Improvements

- Wishlist / saved properties
- Compare properties side-by-side
- Google Maps property location
- Cloudinary image upload (currently URL-based)
- Search-as-you-type city suggestions
- Automated test suite (unit + integration)
