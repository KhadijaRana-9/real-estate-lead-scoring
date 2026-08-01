const e = require('./entities');

// One entry per tool in ai.tools.js. `triggers` are multi-word phrases
// matched as substrings (weight = phrase length, so more specific
// phrases outrank shorter generic ones); `keywords` are single words
// matched on a word boundary (flat weight) so real phrasing variance
// ("Search my available house listings" vs "show houses in Lahore")
// still adds up to a real score instead of requiring an exact phrase.
// `extract` pulls arguments out of the same text; `requiredArgs` lists
// which extracted fields must be present before the tool is actually
// called - if any are missing, the engine asks a clarifying question
// instead of calling the tool with a hole in it.
const TOOL_INTENTS = [
  {
    tool: 'search_properties',
    triggers: ['search propert', 'find propert', 'show propert', 'looking for', 'houses in', 'house in', 'flats in', 'flat in', 'plots in', 'plot in', 'list propert', 'available propert', 'houses under', 'houses for', 'any properties', "what's available", 'what do you have', 'available listings', 'listings under'],
    keywords: ['house', 'houses', 'home', 'flat', 'flats', 'apartment', 'apartments', 'plot', 'plots', 'farmhouse', 'listing', 'listings', 'bedroom', 'bhk'],
    extract: (t) => ({ city: e.extractCity(t), type: e.extractType(t), bedrooms: e.extractBedrooms(t), ...e.extractPriceRange(t) }),
    requiredArgs: [],
  },
  {
    tool: 'get_property_details',
    triggers: ['property details', 'tell me about property', 'details for property', 'more about this property'],
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: "Which property? Share its ID (you'll see one after a search) and I'll pull up the details.",
  },
  {
    tool: 'compare_properties',
    triggers: ['compare propert', 'compare these', 'compare listings'],
    keywords: ['compare'],
    extract: (t) => ({ propertyIds: e.extractObjectIds(t) }),
    requiredArgs: ['propertyIds'],
    clarify: 'Share 2-5 property IDs and I\'ll compare them side by side.',
  },
  {
    tool: 'recommend_properties',
    triggers: ['similar propert', 'recommend propert', 'suggest propert', 'properties like this', 'more like this'],
    keywords: ['similar', 'recommend', 'recommendations'],
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: "Which property should I base recommendations on? Share its ID.",
  },
  {
    tool: 'estimate_property_price',
    triggers: ['estimate price', 'estimate value', 'what is this worth', 'fair price', 'price estimate', 'how much is'],
    keywords: ['estimate', 'worth', 'valuation'],
    extract: (t) => ({ city: e.extractCity(t), area: e.extractArea(t), bedrooms: e.extractBedrooms(t), bathrooms: e.extractBathrooms(t) }),
    requiredArgs: ['area'],
    clarify: 'How many marla/sqft is the property? I need the area to estimate a price.',
  },
  {
    tool: 'get_property_analytics',
    triggers: ['property analytics', 'recently added propert', 'most viewed propert', 'featured propert', 'highest priced', 'lowest priced', 'listing analytics'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_lead_stats',
    triggers: ['lead stats', 'my leads', 'how many leads', 'lead summary', 'hot leads', 'leads do i have', 'leads do we have'],
    keywords: ['leads'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'explain_lead_score',
    triggers: ['explain lead', 'explain score', 'why did this lead score', 'lead score breakdown', 'score for lead'],
    extract: (t) => ({ inquiryId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['inquiryId'],
    clarify: 'Which lead? Share its ID and I\'ll break down the score.',
  },
  {
    tool: 'get_lead_pipeline',
    triggers: ['lead pipeline', 'pipeline stages', 'sales pipeline', 'show pipeline', 'lead breakdown', 'leads breakdown'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'move_lead_stage',
    triggers: ['move lead', 'move this lead', 'change stage', 'update stage', 'mark lead as', 'set stage'],
    extract: (t) => ({ inquiryId: e.extractObjectIds(t)[0], stage: e.extractStage(t) }),
    requiredArgs: ['inquiryId', 'stage'],
    clarify: 'Tell me the lead ID and which stage to move it to (new, contacted, viewing scheduled, negotiation, won, or lost).',
  },
  {
    tool: 'get_dashboard_summary',
    triggers: ['dashboard', 'my stats', 'overview', 'how am i doing', 'monthly inquiries', 'inquiry trend'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_platform_stats',
    triggers: ['platform stats', 'platform overview', 'all agencies', 'across the platform', 'how many agencies', 'agencies are active', 'agencies active', 'subscription plan breakdown', 'plan breakdown', 'subscription breakdown'],
    keywords: ['agencies'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_agency_performance',
    triggers: ['agency performance', 'how is my agency', 'conversion rate', 'top agents', 'agency stats'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_agency_branding',
    triggers: ['agency branding', 'my branding', 'logo and colors', 'brand colors'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'list_platform_agencies',
    triggers: ['list agencies', 'show agencies', 'all agencies on the platform'],
    extract: (t) => ({ page: e.extractNumber(t, 'page') }),
    requiredArgs: [],
  },
  {
    tool: 'get_current_user',
    triggers: ['who am i', 'my account', 'my profile', 'current user', 'my role'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_my_sessions',
    triggers: ['my sessions', 'active sessions', 'logged in devices', 'my logins'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_audit_log',
    triggers: ['audit log', 'recent activity', 'who did what', 'activity history'],
    extract: (t) => ({ limit: e.extractNumber(t, 'last') || e.extractNumber(t, 'limit') }),
    requiredArgs: [],
  },
  {
    tool: 'get_subscription',
    triggers: ['my subscription', 'my plan', 'billing plan', 'what plan am i on', 'usage limits', 'subscription plan'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_invoices',
    triggers: ['my invoices', 'billing history', 'past invoices', 'payment history'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'list_tasks',
    triggers: ['my tasks', 'show tasks', 'list tasks', 'pending tasks', 'to-do', 'todo'],
    extract: (t) => ({ status: e.extractTaskStatus(t) }),
    requiredArgs: [],
  },
  {
    tool: 'create_task',
    triggers: ['create a task', 'add a task', 'new task', 'remind me to', 'task to'],
    extract: (t) => ({ title: e.extractTitleAfter(t, ['create a task', 'add a task', 'new task', 'remind me to', 'task to']), dueDate: e.extractDate(t) }),
    requiredArgs: ['title'],
    clarify: 'What should the task say? e.g. "create a task to call Ayesha tomorrow".',
  },
  {
    tool: 'list_appointments',
    triggers: ['my appointments', 'show appointments', 'upcoming viewings', 'scheduled viewings', 'my viewings'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'create_appointment',
    triggers: ['schedule an appointment', 'book a viewing', 'schedule a viewing', 'set up a viewing', 'new appointment'],
    extract: (t) => ({
      title: e.extractTitleAfter(t, ['schedule an appointment', 'book a viewing', 'schedule a viewing', 'set up a viewing', 'new appointment']) || 'Property viewing',
      scheduledAt: e.extractDate(t),
      relatedProperty: e.extractObjectIds(t)[0],
    }),
    requiredArgs: ['scheduledAt'],
    clarify: 'When should I schedule it? e.g. "book a viewing tomorrow".',
  },
  {
    tool: 'get_upcoming_reminders',
    triggers: ['reminders', 'what do i have coming up', 'due soon', 'overdue tasks', 'upcoming'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'search_agencies',
    triggers: ['agencies in', 'agency in', 'find an agency', 'find agencies', 'recommend an agency', 'which agency', 'real estate agencies', 'real estate agency', 'trusted agency', 'trusted agencies', 'best agency', 'best agencies', 'verified agencies', 'verified agency'],
    keywords: ['agency'],
    extract: (t) => ({ city: e.extractCity(t), verifiedOnly: /\bverified\b/i.test(t) || undefined }),
    requiredArgs: [],
  },
  {
    tool: 'get_agency_details',
    triggers: ['tell me about agency', 'about this agency', 'agency profile', 'agency called', 'trust score for', 'trust score of', "agency's trust score"],
    extract: (t) => ({ agencyName: e.extractQuoted(t) || e.extractTitleAfter(t, ['tell me about agency', 'about this agency', 'agency called', 'trust score for', 'trust score of']) }),
    requiredArgs: ['agencyName'],
    clarify: 'Which agency? Tell me its name.',
  },
  {
    tool: 'search_developers',
    triggers: ['developers in', 'developer in', 'real estate developers', 'top developers', 'find a developer', 'find developers', 'construction company', 'construction companies'],
    keywords: ['developer', 'developers'],
    extract: (t) => ({ city: e.extractCity(t) }),
    requiredArgs: [],
  },
  {
    tool: 'search_projects',
    triggers: ['projects in', 'project in', 'housing scheme', 'housing schemes', 'new launches', 'upcoming projects', 'under construction projects', 'find a project', 'development project', 'development projects'],
    keywords: ['project', 'projects'],
    extract: (t) => ({
      city: e.extractCity(t),
      status: /\bupcoming\b/i.test(t) ? 'upcoming' : /\bunder construction\b/i.test(t) ? 'under_construction' : /\blaunched\b/i.test(t) ? 'launched' : /\bcompleted\b/i.test(t) ? 'completed' : undefined,
    }),
    requiredArgs: [],
  },
  {
    tool: 'get_market_insights',
    triggers: ['market insight', 'market insights', 'market trend', 'market trends', 'price trend', 'price index', 'average price in', 'average prices', 'how is the market', 'market overview', 'property prices in'],
    keywords: ['market'],
    extract: (t) => ({ city: e.extractCity(t) }),
    requiredArgs: [],
  },
  {
    tool: 'search_blog_posts',
    triggers: ['blog post', 'blog posts', 'news article', 'buying guide', 'selling guide', 'read about', 'articles about'],
    keywords: ['blog', 'article', 'articles'],
    extract: (t) => ({ search: e.extractQuoted(t) }),
    requiredArgs: [],
  },
  {
    tool: 'get_marketplace_stats',
    triggers: ['how many properties on the platform', 'how many listings on the platform', 'platform totals', 'marketplace stats', 'marketplace statistics', 'how big is the platform', 'total listings', 'cities covered'],
    extract: () => ({}),
    requiredArgs: [],
  },
];

function findByTool(name) {
  return TOOL_INTENTS.find((i) => i.tool === name) || null;
}

module.exports = { TOOL_INTENTS, findByTool };
