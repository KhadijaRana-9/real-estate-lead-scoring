const propertyRepository = require('../property/property.repository');
const inquiryRepository = require('../inquiry/inquiry.repository');
const propertyService = require('../property/property.service');
const inquiryService = require('../inquiry/inquiry.service');
const dashboardService = require('../dashboard/dashboard.service');
const platformDashboardService = require('../platform/dashboard.service');
const platformAgenciesService = require('../platform/agencies.service');
const agencyService = require('../agency/agency.service');
const billingService = require('../billing/billing.service');
const crmService = require('../crm/crm.service');
const crmRepository = require('../crm/crm.repository');
const authService = require('../auth/auth.service');
const auditLogService = require('../audit/auditLog.service');
const agencyDirectoryService = require('../marketplace/agencyDirectory.service');
const developerService = require('../developer/developer.service');
const projectService = require('../project/project.service');
const blogService = require('../blog/blog.service');
const marketService = require('../market/market.service');
const favoriteService = require('../favorite/favorite.service');
const propertyReviewService = require('../propertyReview/propertyReview.service');
const User = require('../auth/auth.model');
// Phase 5 (Super Admin / Platform AI) - direct model access for genuinely
// cross-tenant aggregations, same discipline platform/dashboard.service.js
// and platform/agencies.service.js already use (no tenantId scoping
// exists or applies at the platform level - these are super_admin-only
// tools, gated by TOOL_DEFINITIONS.roles below, never by tenant).
const Agency = require('../agency/agency.model');
const Property = require('../property/property.model');
const Inquiry = require('../inquiry/inquiry.model');
const Favorite = require('../favorite/favorite.model');
const Task = require('../crm/task.model');
const { PLANS } = require('../billing/billing.constants');
const { FAQ_TOPICS } = require('./localEngine/faq');
const { suggestLeadAction, daysSince } = require('./localEngine/leadActions');

// Every tool the model can call. `roles` is the actual authorization
// boundary - not a suggestion to the model. Regardless of what a
// prompt-injected message tries to talk the model into requesting, the
// executor below re-checks role AND scopes every DB query to ctx.tenantId
// (which comes from the authenticated request, never from the model),
// so a jailbroken model still can't retrieve another agency's data or a
// tool it isn't authorized for.
//
// `mutates: true` marks the (small, explicit) set of tools that change
// data - only those get the confirm-before-executing gate in
// localEngine/index.js. Deliberately opt-in, not opt-out: a tool with no
// `mutates` field is treated as a safe read (see localEngine/index.js
// and executeTool's timeout/retry policy below), so a newly-added tool
// that forgets to think about this defaults to the *safer* behavior
// (no auto-execute, retryable) rather than the riskier one.
const TOOL_DEFINITIONS = {
  // ---- Property ----
  search_properties: {
    name: 'search_properties',
    description: "Search this agency's available property listings by city, type, price range, bedrooms, or area (marla/sqft).",
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. Lahore' },
        type: { type: 'string', enum: ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse'] },
        minPrice: { type: 'number' },
        maxPrice: { type: 'number' },
        bedrooms: { type: 'number' },
        minArea: { type: 'number' },
        maxArea: { type: 'number' },
        areaUnit: { type: 'string', enum: ['marla', 'sqft'] },
      },
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  get_my_properties: {
    name: 'get_my_properties',
    description: "List the current agent's own property listings (agency_admin sees every agent's) - every status (draft/available/sold), not just publicly available ones. Supports filtering by status/featured and sorting.",
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'available', 'sold'] },
        featured: { type: 'boolean' },
        sortBy: { type: 'string', enum: ['newest', 'most_viewed', 'least_viewed', 'most_expensive', 'cheapest'] },
      },
    },
    roles: ['agent', 'agency_admin'],
  },
  get_property_details: {
    name: 'get_property_details',
    description: 'Get full details for one specific property by its ID.',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  compare_properties: {
    name: 'compare_properties',
    description: 'Compare 2-5 available properties side by side by their IDs (price, size, location, amenities).',
    parameters: {
      type: 'object',
      properties: { propertyIds: { type: 'array', items: { type: 'string' }, description: '2 to 5 property IDs' } },
      required: ['propertyIds'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  recommend_properties: {
    name: 'recommend_properties',
    description: 'Get similar-property recommendations based on one reference property (same city/type, closest price).',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  get_favorite_properties: {
    name: 'get_favorite_properties',
    description: "Get the current user's saved/favorited properties.",
    parameters: { type: 'object', properties: {} },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  add_favorite_property: {
    name: 'add_favorite_property',
    description: 'Save/favorite a property by its ID.',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  remove_favorite_property: {
    name: 'remove_favorite_property',
    description: 'Remove a property from the current user\'s saved/favorited list.',
    parameters: {
      type: 'object',
      properties: { propertyId: { type: 'string' } },
      required: ['propertyId'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
  },
  submit_inquiry: {
    name: 'submit_inquiry',
    description: 'Submit a real inquiry/expression of interest to the listing agent for a specific property (contact agent about a property). Name and email come from the current logged-in user automatically.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        budget: { type: 'number' },
        message: { type: 'string' },
        phone: { type: 'string' },
        moveTimeline: { type: 'string', enum: ['immediate', '1-3m', '3-6m', 'exploring'] },
      },
      required: ['propertyId', 'budget'],
    },
    roles: ['customer'],
  },
  estimate_property_price: {
    name: 'estimate_property_price',
    description: 'Estimate a fair market price for a property given city, area, bedrooms, bathrooms.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        area: { type: 'number' },
        bedrooms: { type: 'number' },
        bathrooms: { type: 'number' },
      },
      required: ['area'],
    },
    roles: ['agent', 'agency_admin'],
  },
  get_property_analytics: {
    name: 'get_property_analytics',
    description: 'Get listing analytics: recently added, featured, most viewed, highest/lowest priced, top rated, most reviewed, lowest rated, and most favorited (customer interest) properties. topRated/lowestRated only include properties with a minimum number of real reviews (avoids one review looking definitive).',
    parameters: { type: 'object', properties: {} },
    // Broadened to include customer - all of these slices (including
    // the new rating-based ones) are legitimate marketplace-browsing
    // questions for a customer, not just internal agent analytics.
    roles: ['customer', 'agent', 'agency_admin'],
  },

  // ---- Lead ----
  get_lead_stats: {
    name: 'get_lead_stats',
    description: "Get the current user's lead/inquiry statistics: totals, hot/warm/cold counts, average score, most viewed property.",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  explain_lead_score: {
    name: 'explain_lead_score',
    description: 'Get the full scoring breakdown for one specific lead by its inquiry ID, to explain why it scored the way it did.',
    parameters: {
      type: 'object',
      properties: { inquiryId: { type: 'string', description: 'The inquiry/lead ID' } },
      required: ['inquiryId'],
    },
    roles: ['agent', 'agency_admin'],
  },
  get_lead_pipeline: {
    name: 'get_lead_pipeline',
    description: 'Get every lead grouped by CRM pipeline stage (new, contacted, viewing_scheduled, negotiation, closed_won, closed_lost).',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  move_lead_stage: {
    name: 'move_lead_stage',
    description: 'Move a lead to a different pipeline stage.',
    parameters: {
      type: 'object',
      properties: {
        inquiryId: { type: 'string' },
        stage: { type: 'string', enum: inquiryService.PIPELINE_STAGES },
      },
      required: ['inquiryId', 'stage'],
    },
    roles: ['agent', 'agency_admin'],
    mutates: true,
  },

  // ---- Dashboard ----
  get_dashboard_summary: {
    name: 'get_dashboard_summary',
    description: "Get this agency's full dashboard: cards (properties, inquiries, hot leads, avg score) and charts (monthly inquiries trend, lead status breakdown, top properties).",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  get_platform_stats: {
    name: 'get_platform_stats',
    description: 'Get platform-wide statistics across every agency: totals, active/trial/suspended counts, plan distribution, growth, top agencies.',
    parameters: { type: 'object', properties: {} },
    roles: ['super_admin'],
  },
  // ---- Phase 5 (Super Admin / Platform AI) - all read-only, all
  // platform-wide (never scoped by any user-supplied agency/tenant id) ----
  get_platform_agency_health: {
    name: 'get_platform_agency_health',
    description: 'Get real, transparent per-agency health signals across the platform: agencies with agents but no property listings, and agencies approaching their plan\'s property or agent limit. Every flag is backed by real counts, never a predictive/churn score.',
    parameters: { type: 'object', properties: {} },
    roles: ['super_admin'],
  },
  get_platform_priorities: {
    name: 'get_platform_priorities',
    description: "Get today's platform-wide priorities for the Super Admin: agencies pending approval, and agencies flagged by get_platform_agency_health's real signals.",
    parameters: { type: 'object', properties: {} },
    roles: ['super_admin'],
  },
  get_platform_rankings: {
    name: 'get_platform_rankings',
    description: 'Get a ranked list of agencies by a real platform-wide metric: property count, inquiry count, favorited-property count, or agent count. Never revenue, views, conversion, or ROI - those are not tracked.',
    parameters: {
      type: 'object',
      properties: { metric: { type: 'string', enum: ['properties', 'inquiries', 'favorites', 'agents'] } },
      required: ['metric'],
    },
    roles: ['super_admin'],
  },

  // ---- Agency ----
  get_agency_performance: {
    name: 'get_agency_performance',
    description: "Get this agency's performance: total properties/agents/leads, average lead score, conversion rate, total views, top agents by views.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  // ---- Phase 4 (Agency Admin AI) ----
  get_agency_overview: {
    name: 'get_agency_overview',
    description: "Get a plain-English business overview of this agency: properties (total and active), leads (total, hot/warm/cold), appointments today, and overdue CRM tasks.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_agency_priorities: {
    name: 'get_agency_priorities',
    description: "Get today's prioritized action list for this agency: hot leads that genuinely need follow-up (no open task/appointment yet), today's appointments, and overdue CRM tasks.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_priority_leads: {
    name: 'get_priority_leads',
    description: 'Get a filtered, sorted list of this agency\'s leads with the real reason each one is included - by hot/warm/cold status, by city, and/or leads that have gone stale (still "new" with no contact for several days). Reuses the existing lead score/pipeline stage, never a new scoring algorithm.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['hot', 'warm', 'cold'] },
        city: { type: 'string' },
        stale: { type: 'boolean', description: 'Only leads still in the "new" stage with no contact for several days' },
      },
    },
    roles: ['agency_admin'],
  },
  get_team_activity: {
    name: 'get_team_activity',
    description: "Get real, transparent per-agent activity for this agency: how many properties each agent has, how many active (not-yet-closed) leads on their listings, and how many overdue CRM tasks are assigned to them.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_agency_branding: {
    name: 'get_agency_branding',
    description: "Get this agency's branding settings (logo, colors, custom domain).",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  list_platform_agencies: {
    name: 'list_platform_agencies',
    description: 'List agencies on the platform with pagination, optionally filtered by status (pending/active/suspended/rejected) or subscription plan (trial/starter/professional/enterprise).',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number' },
        status: { type: 'string', enum: ['pending', 'active', 'suspended', 'rejected'] },
        inactiveOnly: { type: 'boolean', description: 'Any status other than active - there is no single "inactive" status value' },
        plan: { type: 'string', enum: Object.keys(PLANS) },
      },
    },
    roles: ['super_admin'],
  },

  // ---- FAQ (Phase 2 - Customer AI) ----
  get_faq_answer: {
    name: 'get_faq_answer',
    description: 'Answer a common question about using DreamHomes as a property shopper - contacting an agent, favorites, inquiries, buying a property, whether an account is required, or scheduling a viewing.',
    parameters: {
      type: 'object',
      properties: { topic: { type: 'string', enum: Object.keys(FAQ_TOPICS) } },
      required: ['topic'],
    },
    roles: ['customer'],
  },

  // ---- User ----
  get_current_user: {
    name: 'get_current_user',
    description: 'Get the current logged-in user: name, email, role, and which agency workspace they belong to.',
    parameters: { type: 'object', properties: {} },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  get_my_sessions: {
    name: 'get_my_sessions',
    description: 'List the current user\'s active login sessions (device sessions, when issued, when they expire).',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  get_audit_log: {
    name: 'get_audit_log',
    description: 'Get recent audit log entries (who did what: property changes, lead stage moves, agency changes). agency_admin sees everyone, agent sees only their own actions.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max entries, default 20' } },
    },
    roles: ['agent', 'agency_admin'],
  },

  // ---- Billing ----
  get_subscription: {
    name: 'get_subscription',
    description: "Get this agency's current subscription plan, status, usage vs plan limits, and available plans.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },
  get_invoices: {
    name: 'get_invoices',
    description: "Get this agency's billing invoices/history.",
    parameters: { type: 'object', properties: {} },
    roles: ['agency_admin'],
  },

  // ---- CRM ----
  list_tasks: {
    name: 'list_tasks',
    description: "List the current user's CRM tasks, optionally filtered by status.",
    parameters: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'done'] } },
    },
    roles: ['agent', 'agency_admin'],
  },
  create_task: {
    name: 'create_task',
    description: 'Create a new CRM follow-up task, optionally linked to a lead or property.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO date' },
        relatedInquiry: { type: 'string' },
        relatedProperty: { type: 'string' },
      },
      required: ['title'],
    },
    roles: ['agent', 'agency_admin'],
    mutates: true,
  },
  list_appointments: {
    name: 'list_appointments',
    description: "List the current user's upcoming scheduled appointments/viewings.",
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },
  create_appointment: {
    name: 'create_appointment',
    description: "Schedule a new appointment/property viewing. When booked by a customer, relatedProperty is required so it can be assigned to that property's real listing agent.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        scheduledAt: { type: 'string', description: 'ISO datetime' },
        location: { type: 'string' },
        relatedProperty: { type: 'string' },
      },
      required: ['title', 'scheduledAt'],
    },
    roles: ['customer', 'agent', 'agency_admin'],
    mutates: true,
  },
  get_upcoming_reminders: {
    name: 'get_upcoming_reminders',
    description: 'Get tasks due soon/overdue and appointments coming up in the next 48 hours.',
    parameters: { type: 'object', properties: {} },
    roles: ['agent', 'agency_admin'],
  },

  // ---- Marketplace (public, cross-tenant - every agency on the
  // platform, not just the requester's own workspace) ----
  search_agencies: {
    name: 'search_agencies',
    description: 'Search real estate agencies on the platform by city or name, with real stats (rating, trust score, listing count).',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        search: { type: 'string', description: 'Agency name or partial name' },
        verifiedOnly: { type: 'boolean' },
      },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  get_agency_details: {
    name: 'get_agency_details',
    description: "Get one agency's full public profile: trust score breakdown, rating, listings, agents, reviews summary.",
    parameters: {
      type: 'object',
      properties: { agencySlug: { type: 'string' }, agencyName: { type: 'string' } },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  search_developers: {
    name: 'search_developers',
    description: 'Search real estate developers on the platform (companies building projects) by city or name.',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' }, search: { type: 'string' } },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  search_projects: {
    name: 'search_projects',
    description: 'Search development projects (housing schemes/towers) by city, status (upcoming/under_construction/launched/completed), or name.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        status: { type: 'string', enum: ['upcoming', 'under_construction', 'launched', 'completed'] },
        search: { type: 'string' },
      },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  get_market_insights: {
    name: 'get_market_insights',
    description: 'Get real market data: average prices by city and property type, or a 12-month price trend for one specific city.',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string', description: 'Omit for the platform-wide overview by city and type' } },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  search_blog_posts: {
    name: 'search_blog_posts',
    description: 'Search published blog/news articles (market news, buying/selling guides, investment, legal) by keyword or category.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        category: { type: 'string', enum: ['market-news', 'buying-guide', 'selling-guide', 'investment', 'lifestyle', 'agency-news', 'legal'] },
      },
    },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
  get_marketplace_stats: {
    name: 'get_marketplace_stats',
    description: 'Get real, platform-wide public marketplace totals: total agencies, properties, agents, and cities covered.',
    parameters: { type: 'object', properties: {} },
    roles: ['customer', 'agent', 'agency_admin', 'super_admin'],
  },
};

function getToolsForRole(role) {
  return Object.values(TOOL_DEFINITIONS)
    .filter((t) => t.roles.includes(role))
    .map(({ name, description, parameters }) => ({ name, description, parameters }));
}

const PROPERTY_LIST_FIELDS = 'title city locality type price bedrooms bathrooms area areaUnit featured views';

const EXECUTORS = {
  async search_properties(args, ctx) {
    const filter = { status: 'available' };
    if (args.city) filter.city = new RegExp(`^${String(args.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (args.type) filter.type = args.type;
    if (args.bedrooms) filter.bedrooms = { $gte: Number(args.bedrooms) };
    if (args.minPrice || args.maxPrice) {
      filter.price = {};
      if (args.minPrice) filter.price.$gte = Number(args.minPrice);
      if (args.maxPrice) filter.price.$lte = Number(args.maxPrice);
    }
    // areaUnit is filtered exactly (marla vs sqft), not converted - a
    // listing entered in sqft is correctly excluded from a marla-range
    // search rather than wrongly compared, since this app never converts
    // between the two on the data side (see property.model.js).
    if (args.minArea || args.maxArea) {
      filter.area = {};
      if (args.minArea) filter.area.$gte = Number(args.minArea);
      if (args.maxArea) filter.area.$lte = Number(args.maxArea);
      if (args.areaUnit) filter.areaUnit = args.areaUnit;
    }

    // Ranked by real, already-stored fields only - featured status and
    // view count aren't new data, just a better sort of the same matched
    // set (previously createdAt-only, which meant two searches for the
    // exact same filter could surface an obscure listing ahead of an
    // actively-promoted one with no signal behind the ordering at all).
    //
    // `count` is the real total matching this filter, from a genuine
    // countDocuments query - NOT items.length. Before this fix, `count`
    // WAS items.length, so any search with 8+ real matches always
    // reported "Found 8 properties" verbatim regardless of whether the
    // true total was 8 or 80, because it was counting the post-limit(8)
    // page, not the actual match set. `shown` carries the display-page
    // size separately so the reply can say "top 8 of 23" instead of
    // silently claiming 8 was the whole answer.
    // bedrooms is a $gte floor by design (see entities.js's
    // extractBedrooms - "3 bedrooms" deliberately means "3+", already
    // tested elsewhere), but a floor of 1 matches nearly every listing,
    // so without this, a big featured/highly-viewed property with 6
    // bedrooms would rank ahead of a genuinely close 1-2 bedroom match
    // just because the base sort is featured-first - a real customer
    // typing "1 bedroom house" reads that as visibly wrong, not a
    // reasonable interpretation of "1+". When a bedroom count was
    // requested, pull a wider candidate window and re-rank by how close
    // each result's real bedroom count is to what was asked, with the
    // original featured/views/createdAt order preserved as the tiebreak
    // (Array.prototype.sort is stable) - the $gte filter and true total
    // are unchanged, only which 8 of the matches get shown first.
    //
    // `sortBy` (from extractSortIntent) handles "cheapest"/"most
    // expensive" the same way: this is a city-scoped question, so it
    // correctly resolves here rather than to get_property_analytics
    // (whose cheapest/expensive slices ignore city entirely) - it just
    // needs to actually honor the price ordering instead of silently
    // falling back to featured-first.
    const candidateLimit = args.bedrooms || args.sortBy ? 40 : 8;
    const [candidates, total] = await Promise.all([
      propertyRepository.find(ctx.tenantId, filter).sort({ featured: -1, views: -1, createdAt: -1 }).limit(candidateLimit).select(PROPERTY_LIST_FIELDS),
      propertyRepository.countDocuments(ctx.tenantId, filter),
    ]);
    let items = candidates;
    if (args.bedrooms) {
      items = [...items].sort((a, b) => Math.abs(a.bedrooms - args.bedrooms) - Math.abs(b.bedrooms - args.bedrooms));
    } else if (args.sortBy === 'price_asc') {
      items = [...items].sort((a, b) => a.price - b.price);
    } else if (args.sortBy === 'price_desc') {
      items = [...items].sort((a, b) => b.price - a.price);
    }
    items = items.slice(0, 8);
    // Real rating data on every card the AI shows, same as the main
    // site's search results (property.service.js's attachRatings).
    items = await propertyService.attachRatings(ctx.tenantId, items);
    return { renderAs: 'property_cards', count: total, shown: items.length, properties: items };
  },

  async get_my_properties(args, ctx) {
    // Reuses listMyProperties exactly as-is (the same function
    // AgentDashboard.jsx's "My Listings" tab already calls via
    // GET /properties/mine) - every status (draft/available/sold), not
    // just the public 'available' catalog search_properties searches.
    // status/featured/sortBy are applied here, in JS, since
    // listMyProperties itself takes no filter args - same pattern as
    // search_properties' bedroom-proximity/price sort above.
    let items = await propertyService.listMyProperties(ctx.tenantId, ctx.requester);
    const total = items.length;

    if (args.status) items = items.filter((p) => p.status === args.status);
    if (args.featured !== undefined) items = items.filter((p) => Boolean(p.featured) === Boolean(args.featured));

    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      most_viewed: (a, b) => b.views - a.views,
      least_viewed: (a, b) => a.views - b.views,
      most_expensive: (a, b) => b.price - a.price,
      cheapest: (a, b) => a.price - b.price,
    };
    if (args.sortBy && sorters[args.sortBy]) items = [...items].sort(sorters[args.sortBy]);

    const shown = items.slice(0, 8);
    return { renderAs: 'property_cards', count: items.length, totalUnfiltered: total, shown: shown.length, properties: shown };
  },

  async get_property_details(args, ctx) {
    // Reuses the exact same enrichment the real property detail page
    // gets (property.service.js's getPropertyById -> attachAgencySummary:
    // listing agent contact info, agency summary, real aggregated
    // rating) instead of a bare repository read - previously this tool
    // returned the raw Property doc only, so the AI could never answer
    // "who's the agent for this?" or "what's it rated?" about a specific
    // property even though that data exists and the real page shows it.
    let property;
    try {
      property = await propertyService.getPropertyById(ctx.tenantId, args.propertyId);
    } catch {
      return { error: 'Property not found.' };
    }
    if (ctx.requester.role === 'customer' && property.status !== 'available') {
      return { error: 'Property not found.' };
    }
    // Same real computation the property page's "AI Price Insight" card
    // uses (shared/utils/priceEstimate.js via propertyService.
    // getPriceEstimate) - not a new estimate, just included by default so
    // "tell me about this property" already answers the market-estimate
    // question instead of requiring a separate query.
    const priceInsight = propertyService.getPriceEstimate({
      city: property.city,
      area: property.area,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
    });
    return { renderAs: 'property_cards', count: 1, properties: [property], priceInsight };
  },

  async compare_properties(args, ctx) {
    try {
      const properties = await propertyService.compareProperties(ctx.tenantId, args.propertyIds);
      return { renderAs: 'comparison_table', properties };
    } catch (err) {
      return { error: err.message };
    }
  },

  async recommend_properties(args, ctx) {
    try {
      const properties = await propertyService.recommendProperties(ctx.tenantId, args.propertyId);
      return { renderAs: 'property_cards', count: properties.length, properties };
    } catch {
      return { error: 'Reference property not found.' };
    }
  },

  async get_favorite_properties(_args, ctx) {
    const properties = await favoriteService.listFavoriteProperties(ctx.tenantId, ctx.requester.id);
    return { renderAs: 'property_cards', count: properties.length, properties };
  },

  async add_favorite_property(args, ctx) {
    try {
      await favoriteService.addFavorite(ctx.tenantId, ctx.requester.id, args.propertyId);
      return { favorited: true };
    } catch (err) {
      return { error: err.message };
    }
  },

  async remove_favorite_property(args, ctx) {
    await favoriteService.removeFavorite(ctx.tenantId, ctx.requester.id, args.propertyId);
    return { favorited: false };
  },

  async submit_inquiry(args, ctx) {
    try {
      const inquiry = await inquiryService.createInquiry(ctx.tenantId, {
        propertyId: args.propertyId,
        customer: { name: ctx.requester.name, email: ctx.requester.email, phone: args.phone },
        message: args.message,
        budget: args.budget,
        moveTimeline: args.moveTimeline,
      });
      return { renderAs: 'inquiry_submitted', inquiryId: inquiry._id, score: inquiry.score, status: inquiry.status };
    } catch (err) {
      return { error: err.message };
    }
  },

  async estimate_property_price(args) {
    return propertyService.getPriceEstimate(args);
  },

  async get_property_analytics(_args, ctx) {
    const [analytics, mostFavorited, lowestRated, mostInquired] = await Promise.all([
      propertyService.getAnalytics(ctx.tenantId),
      // Real Favorite aggregation (favorite.service.js) - answers
      // "most popular"/"most saved"/"highest customer engagement",
      // previously nothing in this tool could speak to customer
      // interest at all, only agent-facing view counts.
      favoriteService.getMostFavoritedProperties(ctx.tenantId, { limit: 5 }),
      // Same MIN_REVIEW_SAMPLE_SIZE floor as topRated, just inverted -
      // answers "low-rated"/"needs improvement" honestly instead of
      // silently having no such slice at all.
      propertyReviewService.getLowestRatedProperties(ctx.tenantId, { limit: 5 }),
      // Real Inquiry aggregation - "which property gets the most
      // inquiries" is a distinct, stronger signal than views/favorites
      // (actual expressed contact intent), answered with its own real
      // data rather than substituting a different metric.
      inquiryService.getMostInquiredProperties(ctx.tenantId, { limit: 5 }),
    ]);
    return { renderAs: 'property_analytics', ...analytics, mostFavorited, lowestRated, mostInquired };
  },

  async get_lead_stats(_args, ctx) {
    const summary = await dashboardService.getSummary(ctx.tenantId, ctx.requester);
    return { renderAs: 'lead_stats', ...summary.cards };
  },

  async explain_lead_score(args, ctx) {
    const propertyFilter = ctx.requester.role === 'agency_admin' ? {} : { agent: ctx.requester.id };
    const propertyIds = await propertyRepository.find(ctx.tenantId, propertyFilter).distinct('_id');
    const inquiry = await inquiryRepository.findById(ctx.tenantId, args.inquiryId);

    if (!inquiry || !propertyIds.some((id) => id.toString() === inquiry.property.toString())) {
      return { error: 'Lead not found or not accessible to this user.' };
    }

    // Phase 3 (Agent/Agency Admin AI) - real existence checks against
    // this lead's own linked records, so the suggestion never tells the
    // agent to do something already scheduled (see leadActions.js).
    const [openTaskCount, upcomingAppointmentCount] = await Promise.all([
      crmRepository.tasks.countDocuments(ctx.tenantId, { relatedInquiry: inquiry._id, status: { $ne: 'done' } }),
      crmRepository.appointments.countDocuments(ctx.tenantId, { relatedInquiry: inquiry._id, status: 'scheduled', scheduledAt: { $gte: new Date() } }),
    ]);

    const suggestedAction = suggestLeadAction({
      pipelineStage: inquiry.pipelineStage,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      hasOpenTask: openTaskCount > 0,
      hasUpcomingAppointment: upcomingAppointmentCount > 0,
    });

    return {
      renderAs: 'lead_score_explanation',
      score: inquiry.score,
      status: inquiry.status,
      breakdown: inquiry.scoreBreakdown,
      customer: inquiry.customer.name,
      budget: inquiry.budget,
      moveTimeline: inquiry.moveTimeline,
      pipelineStage: inquiry.pipelineStage,
      suggestedAction,
    };
  },

  async get_lead_pipeline(_args, ctx) {
    const result = await inquiryService.getPipeline(ctx.tenantId, ctx.requester);
    return { renderAs: 'lead_pipeline', ...result };
  },

  async move_lead_stage(args, ctx) {
    try {
      const inquiry = await inquiryService.moveLeadStage(ctx.tenantId, args.inquiryId, args.stage, ctx.requester);
      return { moved: true, inquiryId: inquiry._id, newStage: inquiry.pipelineStage };
    } catch (err) {
      return { error: err.message };
    }
  },

  async get_dashboard_summary(_args, ctx) {
    const summary = await dashboardService.getSummary(ctx.tenantId, ctx.requester);
    return { renderAs: 'dashboard_summary', ...summary };
  },

  async get_platform_stats() {
    const summary = await platformDashboardService.getPlatformSummary();
    return { renderAs: 'platform_summary', ...summary };
  },

  async get_agency_performance(_args, ctx) {
    const result = await agencyService.getPerformance(ctx.tenantId);
    return { renderAs: 'agency_performance', ...result };
  },

  // Phase 4 (Agency Admin AI) - reuses dashboardService.getSummary
  // (the exact same data get_dashboard_summary already returns, incl.
  // the real hot/warm/cold leadStatusBreakdown) rather than recomputing
  // any of it, and adds only the handful of real counts that tool
  // doesn't already carry (active-status properties, today's
  // appointments, overdue tasks) via the existing tenant-scoped
  // repositories.
  async get_agency_overview(_args, ctx) {
    const summary = await dashboardService.getSummary(ctx.tenantId, ctx.requester);
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [activeProperties, appointmentsToday, overdueTasks] = await Promise.all([
      propertyRepository.countDocuments(ctx.tenantId, { status: 'available' }),
      crmRepository.appointments.countDocuments(ctx.tenantId, { status: 'scheduled', scheduledAt: { $gte: now, $lte: endOfToday } }),
      crmRepository.tasks.countDocuments(ctx.tenantId, { status: { $ne: 'done' }, dueDate: { $lt: now } }),
    ]);

    return {
      renderAs: 'agency_overview',
      totalProperties: summary.cards.totalProperties,
      activeProperties,
      totalInquiries: summary.cards.totalInquiries,
      hotLeads: summary.cards.hotLeads,
      leadStatusBreakdown: summary.charts.leadStatusBreakdown,
      averageLeadScore: summary.cards.averageLeadScore,
      appointmentsToday,
      overdueTasks,
      team: summary.cards.team,
    };
  },

  // Phase 4 (Agency Admin AI) - reuses crmService.getUpcomingReminders
  // (the exact same overdue-tasks/appointments data get_upcoming_
  // reminders already returns) for the ATTENTION/TODAY buckets, and adds
  // only the one thing that tool doesn't compute: which hot leads
  // genuinely have no open follow-up yet (a real Task/Appointment
  // existence check, same discipline as explain_lead_score's Phase 3
  // suggestion - never a duplicate suggestion for a lead someone is
  // already handling).
  async get_agency_priorities(_args, ctx) {
    const reminders = await crmService.getUpcomingReminders(ctx.tenantId, ctx.requester);
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const appointmentsToday = reminders.upcomingAppointments.filter((a) => new Date(a.scheduledAt) <= endOfToday);

    const propertyIds = await propertyRepository.find(ctx.tenantId, {}).distinct('_id');
    const hotLeads = await inquiryRepository
      .find(ctx.tenantId, { property: { $in: propertyIds }, status: 'hot', pipelineStage: { $nin: ['closed_won', 'closed_lost'] } })
      .select('customer score createdAt')
      .sort({ createdAt: 1 })
      .limit(20);

    const hotLeadIds = hotLeads.map((l) => l._id);
    const [openTaskLeadIds, upcomingApptLeadIds] = await Promise.all([
      crmRepository.tasks.find(ctx.tenantId, { relatedInquiry: { $in: hotLeadIds }, status: { $ne: 'done' } }).distinct('relatedInquiry'),
      crmRepository.appointments.find(ctx.tenantId, { relatedInquiry: { $in: hotLeadIds }, status: 'scheduled', scheduledAt: { $gte: now } }).distinct('relatedInquiry'),
    ]);
    const covered = new Set([...openTaskLeadIds, ...upcomingApptLeadIds].map(String));
    const hotLeadsNeedingFollowUp = hotLeads
      .filter((l) => !covered.has(l._id.toString()))
      .map((l) => ({ id: l._id, customer: l.customer.name, score: l.score, ageDays: daysSince(l.createdAt) }));

    return {
      renderAs: 'agency_priorities',
      hotLeadsNeedingFollowUp,
      appointmentsToday: appointmentsToday.map((a) => ({ title: a.title, scheduledAt: a.scheduledAt })),
      overdueTasks: reminders.overdueTasks.map((t) => ({ title: t.title, dueDate: t.dueDate })),
    };
  },

  // Phase 4 (Agency Admin AI) - filters/sorts real, already-stored lead
  // fields (score, status, pipelineStage, createdAt, and city via the
  // related property) - explicitly NOT a new scoring algorithm, the
  // exact same score shared/utils/leadScoring.js already computed.
  async get_priority_leads(args, ctx) {
    let propertyFilter = {};
    if (args.city) {
      propertyFilter.city = new RegExp(`^${String(args.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    const properties = await propertyRepository.find(ctx.tenantId, propertyFilter).select('city');
    const propertyIds = properties.map((p) => p._id);
    const cityById = new Map(properties.map((p) => [p._id.toString(), p.city]));

    const inquiryFilter = { property: { $in: propertyIds }, pipelineStage: { $nin: ['closed_won', 'closed_lost'] } };
    if (args.status) inquiryFilter.status = args.status;

    let leads = await inquiryRepository
      .find(ctx.tenantId, inquiryFilter)
      .select('customer score status pipelineStage createdAt property')
      .sort({ score: -1 })
      .limit(30);

    if (args.stale) {
      leads = leads.filter((l) => l.pipelineStage === 'new' && daysSince(l.createdAt) >= 3);
    }

    const items = leads.slice(0, 10).map((l) => ({
      id: l._id,
      customer: l.customer.name,
      score: l.score,
      status: l.status,
      pipelineStage: l.pipelineStage,
      ageDays: daysSince(l.createdAt),
      city: cityById.get(l.property.toString()),
    }));

    return { renderAs: 'priority_leads', count: leads.length, leads: items };
  },

  // Phase 4 (Agency Admin AI) - real, transparent per-agent counts only
  // (properties, active leads on their listings, overdue tasks assigned
  // to them) - no invented engagement/activity score, matching the
  // instruction to prefer simple transparent calculations over a new
  // scoring model.
  async get_team_activity(_args, ctx) {
    const agents = await User.find({ agencyId: ctx.tenantId, role: 'agent' }).select('name email').sort({ name: 1 });
    if (!agents.length) return { renderAs: 'team_activity', agents: [] };

    const agentIds = agents.map((a) => a._id);
    const properties = await propertyRepository.find(ctx.tenantId, { agent: { $in: agentIds } }).select('agent');
    const propertyToAgent = new Map(properties.map((p) => [p._id.toString(), p.agent.toString()]));
    const allPropertyIds = properties.map((p) => p._id);

    const [activeInquiries, overdueTasks] = await Promise.all([
      inquiryRepository.find(ctx.tenantId, { property: { $in: allPropertyIds }, pipelineStage: { $nin: ['closed_won', 'closed_lost'] } }).select('property'),
      crmRepository.tasks.find(ctx.tenantId, { assignedTo: { $in: agentIds }, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }).select('assignedTo'),
    ]);

    const agentSummaries = agents.map((agent) => {
      const id = agent._id.toString();
      const propertyCount = properties.filter((p) => p.agent.toString() === id).length;
      const activeLeads = activeInquiries.filter((i) => propertyToAgent.get(i.property.toString()) === id).length;
      const overdue = overdueTasks.filter((t) => t.assignedTo.toString() === id).length;
      return { name: agent.name, email: agent.email, propertyCount, activeLeads, overdueTasks: overdue };
    });

    return { renderAs: 'team_activity', agents: agentSummaries };
  },

  async get_agency_branding(_args, ctx) {
    return agencyService.getBranding(ctx.tenantId);
  },

  async list_platform_agencies(args) {
    const result = await platformAgenciesService.listAgencies({
      page: args.page,
      status: args.inactiveOnly ? undefined : args.status,
      statusNot: args.inactiveOnly ? 'active' : undefined,
      plan: args.plan,
    });
    return { renderAs: 'agency_table', ...result };
  },

  // Phase 5 (Super Admin / Platform AI) - real per-agency flags only,
  // reusing billingService.computeUsage/PLANS exactly as billing.
  // service.js's own assertWithinLimit already does (no second limit-
  // checking implementation). Never a predictive/churn score - every
  // flag is a plain threshold over real, current counts.
  async get_platform_agency_health(_args) {
    const APPROACHING_LIMIT_RATIO = 0.8;
    const agencies = await Agency.find({ status: 'active' }).select('companyName slug subscriptionPlan');

    const flagged = [];
    for (const agency of agencies) {
      // eslint-disable-next-line no-await-in-loop
      const [agentCount, propertyCount] = await Promise.all([
        User.countDocuments({ agencyId: agency._id, role: 'agent' }),
        Property.countDocuments({ agencyId: agency._id }),
      ]);
      const plan = PLANS[agency.subscriptionPlan];
      const usage = { properties: propertyCount, agents: agentCount };
      const flags = [];

      if (agentCount > 0 && propertyCount === 0) {
        flags.push(`${agentCount} agent${agentCount === 1 ? '' : 's'} but no property listings`);
      }
      if (plan?.maxProperties !== Infinity && propertyCount >= plan.maxProperties * APPROACHING_LIMIT_RATIO) {
        flags.push(`approaching its property limit (${propertyCount}/${plan.maxProperties})`);
      }
      if (plan?.maxAgents !== Infinity && agentCount >= plan.maxAgents * APPROACHING_LIMIT_RATIO) {
        flags.push(`approaching its agent limit (${agentCount}/${plan.maxAgents})`);
      }

      if (flags.length) {
        flagged.push({ agencyId: agency._id, companyName: agency.companyName, slug: agency.slug, plan: agency.subscriptionPlan, usage, flags });
      }
    }

    return { renderAs: 'platform_agency_health', count: flagged.length, agencies: flagged };
  },

  // Phase 5 (Super Admin / Platform AI) - reuses the existing pending-
  // agency review queue (platformAgenciesService.listAgencies, the same
  // data the Agency Management page's "Pending Approval" tab already
  // shows) for HIGH PRIORITY, and this tool's own health signals above
  // for ATTENTION - no new data source for either bucket.
  async get_platform_priorities() {
    const [pending, health] = await Promise.all([
      platformAgenciesService.listAgencies({ status: 'pending', limit: 10 }),
      EXECUTORS.get_platform_agency_health({}),
    ]);

    return {
      renderAs: 'platform_priorities',
      pendingAgencies: pending.items.map((a) => ({ companyName: a.companyName, slug: a.slug })),
      pendingTotal: pending.pagination.total,
      flaggedAgencies: health.agencies,
    };
  },

  // Phase 5 (Super Admin / Platform AI) - one parameterized ranking tool
  // instead of four near-identical ones. 'properties'/'agents' reuse
  // plain countDocuments grouping (same shape platform/dashboard.
  // service.js's own mostActiveAgencies already uses for properties);
  // 'inquiries'/'favorites' are genuinely new platform-wide aggregations
  // (the existing inquiryService.getMostInquiredProperties/favoriteService.
  // getMostFavoritedProperties rank PROPERTIES within one tenant, not
  // AGENCIES across the platform - a different grouping key, not a
  // duplicate of either).
  async get_platform_rankings(args) {
    const RANKING_MODELS = { properties: Property, inquiries: Inquiry, favorites: Favorite };
    let raw;
    if (args.metric === 'agents') {
      raw = await User.aggregate([
        { $match: { role: 'agent' } },
        { $group: { _id: '$agencyId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);
    } else {
      const Model = RANKING_MODELS[args.metric];
      raw = await Model.aggregate([
        { $group: { _id: '$agencyId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);
    }

    const agencyIds = raw.map((r) => r._id).filter(Boolean);
    const agencies = await Agency.find({ _id: { $in: agencyIds } }).select('companyName slug');
    const agencyById = new Map(agencies.map((a) => [a._id.toString(), a]));

    const items = raw
      .filter((r) => r._id && agencyById.has(r._id.toString()))
      .map((r) => ({ companyName: agencyById.get(r._id.toString()).companyName, slug: agencyById.get(r._id.toString()).slug, count: r.count }));

    return { renderAs: 'platform_rankings', metric: args.metric, agencies: items };
  },

  async get_faq_answer(args) {
    const entry = FAQ_TOPICS[args.topic];
    if (!entry) return { error: "I don't have an answer for that yet - try asking your question a different way." };
    return { topic: args.topic, question: entry.question, answer: entry.answer };
  },

  async get_current_user(_args, ctx) {
    return { id: ctx.requester.id, name: ctx.requester.name, email: ctx.requester.email, role: ctx.requester.role, agencyId: ctx.tenantId };
  },

  async get_my_sessions(_args, ctx) {
    const sessions = await authService.listActiveSessions(ctx.requester.id);
    return { renderAs: 'session_list', count: sessions.length, sessions };
  },

  async get_audit_log(args, ctx) {
    const logs = await auditLogService.list(ctx.tenantId, ctx.requester, { limit: args.limit });
    return { renderAs: 'audit_timeline', count: logs.length, logs };
  },

  async get_subscription(_args, ctx) {
    return { renderAs: 'subscription_summary', ...(await billingService.getCurrentSubscription(ctx.tenantId)) };
  },

  async get_invoices(_args, ctx) {
    const invoices = await billingService.listInvoices(ctx.tenantId);
    return { renderAs: 'invoice_table', count: invoices.length, invoices };
  },

  async list_tasks(args, ctx) {
    const tasks = await crmService.listTasks(ctx.tenantId, ctx.requester, { status: args.status });
    return { renderAs: 'task_list', count: tasks.length, tasks };
  },

  async create_task(args, ctx) {
    const task = await crmService.createTask(ctx.tenantId, ctx.requester, {
      title: args.title,
      dueDate: args.dueDate,
      relatedInquiry: args.relatedInquiry,
      relatedProperty: args.relatedProperty,
    });
    return { renderAs: 'task_list', count: 1, tasks: [task] };
  },

  async list_appointments(_args, ctx) {
    const appointments = await crmService.listAppointments(ctx.tenantId, ctx.requester, {});
    return { renderAs: 'appointment_list', count: appointments.length, appointments };
  },

  async create_appointment(args, ctx) {
    // appointment.model.js's assignedTo is required and is what agents'
    // own calendars are actually filtered by (crm.service.js's
    // scopeFilter) - crmService.createAppointment() defaults it to the
    // caller's own id when not given, which is correct for an agent
    // booking their own viewing, but would silently assign a customer's
    // booking to the customer's own user id (not a real agent), making
    // it invisible to any agent's calendar. Resolved here to the
    // property's real listing agent instead, for a customer only.
    let assignedTo;
    if (ctx.requester.role === 'customer') {
      if (!args.relatedProperty) {
        return { error: 'Which property would you like to view? I need that to schedule it with the right agent.' };
      }
      const property = await propertyRepository.findById(ctx.tenantId, args.relatedProperty);
      if (!property) return { error: 'Property not found.' };
      assignedTo = property.agent;
    }

    const appointment = await crmService.createAppointment(ctx.tenantId, ctx.requester, {
      title: args.title,
      scheduledAt: args.scheduledAt,
      location: args.location,
      relatedProperty: args.relatedProperty,
      assignedTo,
    });
    return { renderAs: 'appointment_list', count: 1, appointments: [appointment] };
  },

  async get_upcoming_reminders(_args, ctx) {
    const result = await crmService.getUpcomingReminders(ctx.tenantId, ctx.requester);
    return { renderAs: 'reminders', ...result };
  },

  async search_agencies(args) {
    const result = await agencyDirectoryService.listAgencies({
      city: args.city,
      search: args.search,
      verified: args.verifiedOnly ? 'true' : undefined,
      limit: 8,
    });
    return { renderAs: 'agency_cards', count: result.items.length, agencies: result.items };
  },

  async get_agency_details(args, ctx) {
    let slug = args.agencySlug;
    if (!slug && args.agencyName) {
      const found = await agencyDirectoryService.listAgencies({ search: args.agencyName, limit: 1 });
      slug = found.items[0]?.slug;
    }
    if (!slug) return { error: 'Which agency? Give me its name.' };
    try {
      const profile = await agencyDirectoryService.getAgencyProfile(slug, ctx.requester?.id);
      return { renderAs: 'agency_details', ...profile };
    } catch {
      return { error: `Couldn't find an agency matching "${args.agencyName || slug}".` };
    }
  },

  async search_developers(args) {
    const result = await developerService.list({ city: args.city, search: args.search, limit: 8 });
    return { renderAs: 'developer_cards', count: result.items.length, developers: result.items };
  },

  async search_projects(args) {
    const result = await projectService.list({ city: args.city, status: args.status, search: args.search, limit: 8 });
    return { renderAs: 'project_cards', count: result.items.length, projects: result.items };
  },

  async get_market_insights(args) {
    if (args.city) {
      const insight = await marketService.cityInsight(args.city);
      return { renderAs: 'market_insight', ...insight };
    }
    const overview = await marketService.overview();
    return { renderAs: 'market_overview', ...overview };
  },

  async search_blog_posts(args) {
    const result = await blogService.listPublic({ search: args.search, category: args.category, limit: 6 });
    return { renderAs: 'blog_cards', count: result.items.length, posts: result.items };
  },

  async get_marketplace_stats() {
    const stats = await agencyDirectoryService.getPublicPlatformStats();
    return { renderAs: 'marketplace_stats', ...stats };
  },
};

const TOOL_TIMEOUT_MS = 8000;
const READ_RETRY_DELAY_MS = 200;
// Only these arg names are ever eligible to become an audit log's
// targetId, and only when they actually look like a real ObjectId -
// never a raw string (city, title, ...) blindly cast at Mongoose.
const TARGET_ID_ARG_KEYS = ['inquiryId', 'propertyId', 'propertyIds'];
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('tool_timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function likelyTargetId(args) {
  for (const key of TARGET_ID_ARG_KEYS) {
    const value = Array.isArray(args?.[key]) ? args[key][0] : args?.[key];
    if (typeof value === 'string' && OBJECT_ID_RE.test(value)) return value;
  }
  return null;
}

// A SEPARATE audit trail from the business-level entries the underlying
// services already write (e.g. inquiry.service.js's 'lead.stage_change')
// - this one records the AI invocation itself (which tool, matched by
// which role/tenant, how long it took, whether it succeeded), not the
// business event. The two are complementary, not duplicates: a
// move_lead_stage call now produces two audit rows - the existing
// 'lead.stage_change' row (unchanged) plus this new 'ai.tool_call' row
// tagged source: 'ai_chat'. Fire-and-forget from the caller's
// perspective (auditLogService.record already swallows its own errors -
// see audit/auditLog.service.js's own comment), but awaited here so a
// log write always completes before the response goes out, same
// convention every other service in this codebase follows.
async function auditToolCall(name, args, ctx, { success, reason, durationMs }) {
  await auditLogService.record({
    tenantId: ctx.tenantId,
    actor: ctx.requester,
    action: 'ai.tool_call',
    targetType: 'AiTool',
    targetId: likelyTargetId(args),
    metadata: {
      source: 'ai_chat',
      tool: name,
      mutates: Boolean(TOOL_DEFINITIONS[name]?.mutates),
      success,
      reason,
      durationMs,
      args,
    },
  });
}

async function executeTool(name, args, ctx) {
  const definition = TOOL_DEFINITIONS[name];
  if (!definition || !definition.roles.includes(ctx.requester.role)) {
    await auditToolCall(name, args, ctx, { success: false, reason: 'unauthorized' });
    return { error: 'This tool is not available for your role.' };
  }
  const executor = EXECUTORS[name];
  if (!executor) {
    await auditToolCall(name, args, ctx, { success: false, reason: 'unknown_tool' });
    return { error: 'Unknown tool.' };
  }

  const isMutating = Boolean(definition.mutates);
  const startedAt = Date.now();
  let result;
  let failureReason = null;

  try {
    result = await withTimeout(executor(args || {}, ctx), TOOL_TIMEOUT_MS);
  } catch (err) {
    failureReason = err.message === 'tool_timeout' ? 'timeout' : 'error';
    // Reads get exactly one retry on a transient failure. Writes never
    // auto-retry - a retried write could double-create a task or
    // double-move a lead stage, which is worse than surfacing the
    // failure and letting the user re-ask.
    if (!isMutating) {
      await delay(READ_RETRY_DELAY_MS);
      try {
        result = await withTimeout(executor(args || {}, ctx), TOOL_TIMEOUT_MS);
        failureReason = null;
      } catch (retryErr) {
        failureReason = retryErr.message === 'tool_timeout' ? 'timeout' : 'error';
      }
    }
  }

  const success = failureReason === null;
  if (!success) {
    result = { error: failureReason === 'timeout' ? 'That took too long to look up - please try again.' : 'Tool execution failed.' };
  }

  await auditToolCall(name, args, ctx, { success, reason: success ? undefined : failureReason, durationMs: Date.now() - startedAt });

  return result;
}

module.exports = { getToolsForRole, executeTool, TOOL_DEFINITIONS };
