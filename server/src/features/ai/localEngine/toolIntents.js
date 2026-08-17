const e = require('./entities');
const { FAQ_TOPICS, matchFaqTopic } = require('./faq');

// Generated rather than hand-enumerated: "featured houses"/"newest
// flats"/"cheapest homes" etc. all describe the exact same
// get_property_analytics slices as "featured properties"/"newest
// listings" already did - the underlying noun someone attaches the
// adjective to doesn't change which real data answers it, so every
// adjective is paired with every common property noun instead of
// covering only the couple of combinations that happened to come up in
// testing. Each phrase is 2+ words (>= 9 chars once combined), so every
// combination reliably clears the confidence threshold on its own.
const ANALYTICS_ADJECTIVES = [
  'featured', 'newest', 'latest', 'cheapest', 'expensive',
  // Multi-word adjectives work identically in the flatMap below
  // ("top rated" + " " + "propert" = "top rated propert") - real
  // rating/review data, see property.service.js's getAnalytics.
  'top rated', 'highest rated', 'best rated', 'most reviewed',
];
const PROPERTY_NOUNS = ['propert', 'house', 'home', 'flat', 'listing'];
const ANALYTICS_COMPOUND_TRIGGERS = ANALYTICS_ADJECTIVES.flatMap((adj) => PROPERTY_NOUNS.map((noun) => `${adj} ${noun}`));

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
    // Agent's OWN listings (every status: draft/available/sold) - a
    // real, distinct capability from search_properties (which only
    // searches this agency's public 'available' catalog, not scoped to
    // "mine" and never includes sold/draft). Listed first so its longer,
    // more specific "my properties/listings" triggers beat
    // search_properties' generic 'propert'/'listing' keywords for an
    // agent asking about their own portfolio.
    tool: 'get_my_properties',
    triggers: [
      'my properties', 'my listings', 'my active listings', 'my featured listings', 'my newest properties',
      'my sold properties', 'my sold listings', 'recently added listings', 'recent listings', 'my available properties',
      'show all my properties', 'show my properties', 'show my listings', 'all my properties', 'all my listings',
      'most expensive property', 'cheapest property', 'which property is most expensive', 'which property is cheapest',
      'which listing', 'listings need attention', 'need attention', 'low views', 'listings performing well',
      'performing well', 'underperforming', 'listings are underperforming',
    ],
    extract: (t) => e.extractMyListingsFilter(t),
    requiredArgs: [],
  },
  {
    // 'between'/'around'/'approximately'/'near' are deliberately short,
    // generic triggers - individually low-scoring, but combined with a
    // property-type keyword (house/properties/etc, below) they reliably
    // clear the confidence threshold for range/proximity price phrasing
    // ("properties between 2 crore and 8 crore", "homes around 5
    // crore") without needing to enumerate every connector-word
    // combination as its own trigger phrase. Real extraction of the
    // actual figures happens in entities.js's extractPriceRange -
    // these triggers only affect which tool gets selected.
    tool: 'search_properties',
    triggers: [
      'search propert', 'find propert', 'show propert', 'looking for', 'houses in', 'house in', 'flats in', 'flat in', 'plots in', 'plot in',
      'apartments in', 'apartment in', 'villas in', 'villa in', 'homes in', 'housing in', 'properties in', 'property in',
      // Offices/shops/warehouses are real, supported property types
      // (ai.tools.js's search_properties `type` enum, already handled by
      // extractType's TYPE_SYNONYMS below) but previously had zero
      // matcher coverage at all - "offices in Lahore" scored 0 and fell
      // straight to the generic help message, not even attempting a
      // search, unlike every other property type.
      'offices in', 'office in', 'shops in', 'shop in', 'warehouses in', 'warehouse in', 'listings in', 'listing in',
      'list propert', 'available propert', 'houses under', 'houses for', 'any properties', "what's available", 'what do you have', 'available listings', 'listings under',
      // Bare category browsing with no city/price qualifier at all
      // ("Show houses.") - every other "TYPE in <city>" trigger above
      // requires a city; these cover the same types with none.
      'show houses', 'show apartments', 'show flats', 'show plots', 'show villas', 'show farmhouses', 'show homes',
      'show offices', 'show shops', 'show warehouses', 'show me properties', 'commercial propert', 'residential propert',
      'budget of',
      'between', 'around', 'approximately', 'near', 'under', 'below', 'above', 'over', 'minimum', 'maximum', 'at least', 'at most',
      // "houses from 2 crore to 8 crore" - 'from' alone is far too
      // generic to trigger on (collides with unrelated phrases like
      // "recommendations from an agent"), but the specific sequence of a
      // money unit immediately followed by "to" is a safe, low-collision
      // signal that a price range is being stated this way.
      'crore to', 'lakh to', 'lac to',
      // A bare currency/area unit is itself a strong, low-collision
      // signal that a real filter is being described (combined with a
      // property-type keyword this reliably beats get_property_analytics'
      // narrower triggers when both a price/area figure AND a word like
      // "featured" appear together, e.g. "featured properties under 5
      // crore" - a real, price-filterable search, not a bare analytics
      // request that would otherwise win and silently drop the price).
      'crore', 'lakh', 'lac', 'marla', 'kanal', 'sqft',
    ],
    // 'homes'/'bedrooms' (plural) were pre-existing gaps - the keyword
    // regex is a strict `\bword\b` word boundary, so the singular-only
    // entries never matched the plural someone actually typed ("minimum
    // 4 bedrooms" scored 0 before this fix, for any tool). 'villa(s)' was
    // already a recognized type synonym in extractType but was never
    // scored as a keyword here. 'housing' is common informal usage
    // ("housing in Lahore") that shares no word-boundary substring with
    // "house", so it never matched anything before this fix.
    keywords: [
      'house', 'houses', 'home', 'homes', 'housing', 'villa', 'villas', 'flat', 'flats', 'apartment', 'apartments',
      'plot', 'plots', 'farmhouse', 'listing', 'listings', 'bedroom', 'bedrooms', 'bhk', 'property', 'properties',
      // Real, supported property types (search_properties' `type` enum)
      // with previously zero keyword coverage - see the trigger comment
      // above for how this was found missing entirely, not just the
      // singular/plural gaps the earlier keywords already fixed.
      'office', 'offices', 'shop', 'shops', 'store', 'stores', 'warehouse', 'warehouses', 'godown', 'godowns', 'land',
    ],
    extract: (t) => ({ city: e.extractCity(t), type: e.extractType(t), bedrooms: e.extractBedrooms(t), sortBy: e.extractSortIntent(t), ...e.extractPriceRange(t), ...e.extractAreaRange(t) }),
    // Optional, per-intent extension (like `clarify`) - reports any
    // filter the user asked for that this tool has no real parameter
    // for (area range, a bedroom maximum), so index.js can have the
    // reply say so explicitly instead of silently applying only part of
    // the request and looking like it applied all of it.
    detectUnsupported: (t) => e.detectUnsupportedFilters(t),
    requiredArgs: [],
  },
  {
    tool: 'get_property_details',
    triggers: ['property details', 'tell me about property', 'details for property', 'more about this property'],
    // A real ObjectId anywhere in the message is itself a strong signal
    // for this intent - see matcher.js's idBoost. This deliberately
    // replaces enumerating a trigger phrase per question form ("who is
    // the agent for property <id>", "is property <id> available?"):
    // those phrase fragments ("available?", "is property", "worth it")
    // are dangerously generic on their own - "is there anything
    // available?" has nothing to do with one specific property and must
    // not be hijacked away from LLM escalation just because it contains
    // the word "available". idBoost only fires when a real id is
    // actually present, which every one of those question forms has.
    idBoost: true,
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: "Which property? Share its ID (you'll see one after a search) and I'll pull up the details.",
  },
  {
    tool: 'compare_properties',
    triggers: ['compare propert', 'compare these', 'compare listings', 'which one is better', 'which is better', 'better value'],
    keywords: ['compare'],
    extract: (t) => ({ propertyIds: e.extractObjectIds(t) }),
    requiredArgs: ['propertyIds'],
    clarify: 'Share 2-5 property IDs and I\'ll compare them side by side.',
  },
  {
    tool: 'recommend_properties',
    triggers: ['similar propert', 'recommend propert', 'suggest propert', 'properties like this', 'more like this', 'similar to property', 'similar listings', 'something similar'],
    keywords: ['similar', 'recommend', 'recommendations'],
    idBoost: true,
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: "Which property should I base recommendations on? Share its ID.",
  },
  {
    tool: 'get_favorite_properties',
    triggers: [
      'my favorites', 'my favourites', 'favorite propert', 'favourite propert', 'favorited propert', 'favourited propert',
      'saved propert', 'saved listing', 'my saved', 'properties i saved', 'properties i favorited', 'properties i favourited',
      'saved homes', 'favorite houses', 'favourite houses',
    ],
    exactMatchEligible: true,
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'add_favorite_property',
    triggers: ['save this property', 'favorite this property', 'favourite this property', 'add to favorites', 'add to favourites', 'add to my favorites', 'add to my favourites', 'save to favorites', 'save to favourites'],
    // See get_property_details above - "add property <id> to favorites"
    // has no contiguous trigger phrase (the id sits between "add" and
    // "to favorites"), so this leans on the same id-boost signal. The
    // keyword is what keeps it from tying with get_property_details
    // (both would otherwise score idBoost-only 10 and lose the tie to
    // whichever tool is listed first) - "favorite(s)" pushes this ahead.
    // 'add'/'save' further separate this from remove_favorite_property,
    // which would otherwise also tie on 'favorite(s)' + idBoost alone.
    keywords: ['favorite', 'favorites', 'favourite', 'favourites', 'add', 'save'],
    idBoost: true,
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: "Which property? Share its ID and I'll save it to your favorites.",
  },
  {
    tool: 'remove_favorite_property',
    triggers: ['remove from favorites', 'remove from favourites', 'unfavorite', 'unfavourite', 'remove from my favorites', 'remove from my favourites', 'remove from saved'],
    // Same idBoost tie-break reasoning as add_favorite_property above -
    // 'remove' is what keeps "remove property <id> from favorites" from
    // tying with (and losing to, on array order) add_favorite_property.
    keywords: ['favorite', 'favorites', 'favourite', 'favourites', 'remove'],
    idBoost: true,
    extract: (t) => ({ propertyId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['propertyId'],
    clarify: 'Which property should I remove from your favorites? Share its ID.',
  },
  {
    // Budget reuses extractPriceRange rather than a parallel extractor -
    // a stated inquiry budget ("my budget is 5 crore", "up to 5 crore")
    // is the same money-parsing problem search already solves.
    tool: 'submit_inquiry',
    // 'contact agent about'/'contact the agent about' (longer, more
    // specific) are listed ahead of the shorter fallbacks so a message
    // that also mentions a price ("...about property X, budget 5 crore")
    // doesn't let search_properties' now-broader price triggers (crore/
    // around/under, added for range search coverage) outscore a clearly
    // stated contact-the-agent intent.
    triggers: [
      'contact agent about', 'contact the agent about', 'contact the agent', 'contact agent',
      'submit an inquiry', 'submit inquiry', 'send an inquiry', 'inquire about',
      "i'm interested in this property", 'im interested in this property', 'express interest',
    ],
    keywords: ['inquiry', 'inquire'],
    idBoost: true,
    extract: (t) => {
      const range = e.extractPriceRange(t);
      return { propertyId: e.extractObjectIds(t)[0], budget: range.maxPrice ?? range.minPrice, message: e.extractQuoted(t) };
    },
    requiredArgs: ['propertyId', 'budget'],
    clarify: 'Which property, and what\'s your budget? e.g. "contact agent about property <id>, my budget is 5 crore".',
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
    // get_property_analytics returns a fixed set of real slices
    // (recentlyAdded/featured/mostViewed/highestPrice/lowestPrice) - all
    // of the trigger phrases below map to one of those same slices,
    // nothing new is being computed, just recognized under more of the
    // ways people actually ask for it. Most of the list is
    // ANALYTICS_COMPOUND_TRIGGERS (every adjective x every property noun,
    // generated above) plus the handful of standalone phrases
    // ("most viewed", "highest priced", ...) that already clear the
    // confidence threshold on their own without needing a noun paired in.
    tool: 'get_property_analytics',
    triggers: [
      'property analytics', 'recently added propert', 'listing analytics',
      'most viewed', 'top viewed', 'highest viewed', 'highest priced', 'lowest priced',
      'top-rated', 'highest-rated', 'best-rated', 'most-reviewed', // hyphenated forms - trigger matching is plain substring, not regex, so these don't match the spaced generated variants
      // "which property HAS THE highest RATING" - noun-then-adjective
      // word order, doesn't fit ANALYTICS_COMPOUND_TRIGGERS' adjective-
      // then-noun generator below at all, so these need to be explicit.
      'highest rating', 'has the highest rating', 'trending propert', 'trending listing', 'trending house',
      // "most views"/"most reviews" (noun, not the -ed adjective form
      // ANALYTICS_COMPOUND_TRIGGERS generates) - a real, common way to
      // ask the exact same mostViewed/mostReviewed slices.
      'most views', 'most reviews', 'low-rated', 'low rated', 'lowest rated', 'lowest-rated',
      'needs improvement', 'need improvement', 'customer feedback', 'customer reviews', 'what are customers saying',
      // Real customer-interest signals (mostFavorited/mostInquired, see
      // ai.tools.js's executor) - "popular"/"saved"/"engagement" all
      // describe the same real favorite-count data; "inquiries"/
      // "promote"/"marketing" point at the real inquiry-count data.
      'most popular', 'saved the most', 'most customer interest', 'customers viewing the most', 'highest engagement',
      'most inquiries', 'gets the most inquiries', 'should i promote', 'need marketing', "haven't received inquiries",
      'have not received inquiries',
      ...ANALYTICS_COMPOUND_TRIGGERS,
      // "luxury"/"premium" have no real tier or tag anywhere in this
      // data model - `featured` (a real, agent-set flag) is the closest
      // honest proxy, so bare "luxury homes"-style phrasing maps here
      // rather than to search_properties, which has no way to filter by
      // either word at all. If a real price/area/bedroom constraint is
      // ALSO present, search_properties's own currency/area-unit
      // triggers outscore these and win instead - detectUnsupportedFilters
      // then honestly flags "luxury"/"premium" as not a real filter,
      // exactly like it already does for area ranges and bedroom caps.
      'luxury propert', 'luxury home', 'luxury house', 'luxury listing', 'premium propert', 'premium home', 'premium house', 'premium listing',
    ],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_lead_stats',
    triggers: ['lead stats', 'my leads', 'how many leads', 'lead summary', 'hot leads', 'warm leads', 'cold leads', 'leads do i have', 'leads do we have'],
    keywords: ['leads'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    // Phase 3 (Agent/Agency Admin AI) - the "what should I do" phrasing
    // below routes to this SAME tool/executor rather than a new one: the
    // executor now also computes a real, rule-based next-step suggestion
    // (see leadActions.js) alongside the score breakdown, so "why did it
    // score this way" and "what should I do about it" are two natural
    // ways to ask for the same enriched answer.
    tool: 'explain_lead_score',
    triggers: [
      'explain lead', 'explain score', 'why did this lead score', 'lead score breakdown', 'score for lead',
      'what should i do about this lead', 'what should i do next with this lead', 'next steps for this lead',
      'suggest a follow up', 'how should i follow up', 'follow up suggestion',
    ],
    extract: (t) => ({ inquiryId: e.extractObjectIds(t)[0] }),
    requiredArgs: ['inquiryId'],
    clarify: 'Which lead? Share its ID and I\'ll break down the score and suggest a next step.',
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
    exactMatchEligible: true,
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_platform_stats',
    triggers: [
      'platform stats', 'platform overview', 'all agencies', 'across the platform', 'how many agencies', 'agencies are active', 'agencies active', 'subscription plan breakdown', 'plan breakdown', 'subscription breakdown',
      // Phase 5 (Platform overview) - the exact example phrasings.
      'how is the platform doing', 'how is the platform', 'summary of dreamhomes', 'give me a summary of dreamhomes',
      "what's happening across the platform", 'whats happening across the platform', 'how many are on', 'how many agencies are on trial', 'how many agencies are paid',
    ],
    keywords: ['agencies'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_agency_performance',
    triggers: ['agency performance', 'conversion rate', 'top agents', 'agency stats'],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    // Phase 4 (Agency Business Overview) - "how is my agency (doing)"
    // deliberately moved here FROM get_agency_performance above: this
    // tool answers it more completely (adds hot/warm/cold breakdown,
    // appointments today, overdue tasks - all real data
    // get_agency_performance's own reply never mentioned), reusing
    // dashboardService.getSummary rather than recomputing any of it (see
    // ai.tools.js's executor). get_agency_performance keeps its other,
    // more specific triggers (conversion rate, top agents) unchanged.
    tool: 'get_agency_overview',
    triggers: [
      'how is my agency', 'how is my agency doing', 'agency overview', 'business overview', 'business summary',
      'give me a business summary', "what's happening in my agency", 'whats happening in my agency',
      'give me an overview', 'give me an overview of my agency', 'overview of my agency',
    ],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_agency_priorities',
    triggers: [
      'what should i focus on today', 'what needs my attention', "today's priorities", 'todays priorities',
      "give me today's priorities", 'give me todays priorities', "my agency's priorities", 'my agencys priorities',
      "today's crm priorities", 'todays crm priorities', 'daily priorities', 'priorities for today',
      "give me today's crm priorities", 'action plan for today',
    ],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    // Longer, specific phrases so these outscore get_lead_stats' own
    // shorter 'hot leads'/'warm leads'/'cold leads' triggers (which stay
    // exactly as they are, unchanged, for the bare aggregate-count
    // question) - "show me hot leads in Lahore" needs the actual
    // filtered LIST with a real reason per lead, not just a total count.
    tool: 'get_priority_leads',
    triggers: [
      'which leads need attention', 'leads need attention', 'leads needing attention',
      'hottest leads', 'show me my hottest leads', 'my hottest leads',
      'leads going cold', 'leads are going cold',
      'leads are overdue', 'which leads are overdue', 'overdue leads',
      "leads haven't been followed up", 'leads have not been followed up',
      'our urgent leads', 'urgent leads', 'stale leads',
      'show me hot leads', 'show me warm leads', 'show me cold leads',
      'show my hot leads', 'show my warm leads', 'show my cold leads',
      // "hot leads IN <city>" - these two together (21 combined, on top
      // of whichever "show me hot leads"-style trigger above also
      // matches) reliably outscore get_lead_stats' own 'hot leads'
      // trigger + 'leads' keyword (9 + 8 = 17 combined) even without a
      // "show me" prefix. 'leads in' alone is deliberately sub-threshold
      // (8 < CONFIDENCE_THRESHOLD's 9) so it can only ever supplement an
      // already-qualifying match, never cause a wrong match on its own.
      'hot leads in', 'warm leads in', 'cold leads in', 'leads in',
    ],
    extract: (t) => {
      const args = {};
      const lower = t.toLowerCase();
      // Checked FIRST and made mutually exclusive with status below:
      // "leads going cold" contains the literal word "cold" but means
      // stale/losing momentum, not a request for the `cold` status
      // category (a real, different, existing bucket - see
      // leadScoring.js) - without this ordering, "going cold" would
      // incorrectly also set status: 'cold'.
      const stale = /\b(going cold|stale|overdue|haven'?t been followed up|have not been followed up)\b/.test(lower);
      if (stale) {
        args.stale = true;
      } else if (/\bhot\b/.test(lower)) {
        args.status = 'hot';
      } else if (/\bwarm\b/.test(lower)) {
        args.status = 'warm';
      } else if (/\bcold\b/.test(lower)) {
        args.status = 'cold';
      }
      const city = e.extractCity(t);
      if (city) args.city = city;
      return args;
    },
    requiredArgs: [],
  },
  {
    tool: 'get_team_activity',
    triggers: [
      'how is my team', 'how is my team doing', 'which agents need attention', 'agents need attention',
      'which agents have overdue tasks', 'agents have overdue tasks', 'which agents have the most active leads',
      'agents have the most active leads', 'agents with pending follow-ups', 'agents with pending follow ups',
      'team activity', 'team performance',
    ],
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
    // Phase 5 - "which agencies..."/"show me..."/"agencies on <plan>"
    // phrasing added for the real, filtered LIST (not just a count) -
    // 'inactive'/'active'/'suspended'/'rejected'/'pending' and each real
    // plan name below are all substrings of these triggers already, so
    // this intent alone reliably outscores get_platform_stats' shorter
    // 'agencies active'/'how many agencies' triggers for "which"/"show
    // me"-shaped questions.
    tool: 'list_platform_agencies',
    triggers: [
      'list agencies', 'show agencies', 'all agencies on the platform', 'show me all agencies',
      // Short but deliberate: "which agencies <anything>" reasonably
      // always implies wanting the real list, so this alone clears the
      // confidence threshold - and combined with any of the more
      // specific phrases below, comfortably outscores get_platform_
      // stats' own shorter 'agencies are active'/'how many agencies'
      // triggers for a "which agencies..." question.
      'which agencies',
      'which agencies are active', 'which agencies are inactive', 'which agencies are suspended', 'which agencies are rejected', 'which agencies are pending',
      'which agencies are on professional', 'which agencies are on enterprise', 'which agencies are on starter', 'which agencies are on trial',
      'agencies on professional', 'agencies on enterprise', 'agencies on starter', 'agencies on trial',
      'which agencies are paid', 'agencies are paid',
    ],
    extract: (t) => {
      const args = {};
      const lower = t.toLowerCase();
      const page = e.extractNumber(t, 'page');
      if (page) args.page = page;
      if (/\binactive\b/.test(lower)) args.inactiveOnly = true;
      else if (/\bsuspended\b/.test(lower)) args.status = 'suspended';
      else if (/\brejected\b/.test(lower)) args.status = 'rejected';
      else if (/\bpending\b/.test(lower)) args.status = 'pending';
      else if (/\bactive\b/.test(lower)) args.status = 'active';
      for (const planKey of ['trial', 'starter', 'professional', 'enterprise']) {
        if (lower.includes(planKey)) {
          args.plan = planKey;
          break;
        }
      }
      return args;
    },
    requiredArgs: [],
  },
  {
    tool: 'get_platform_agency_health',
    triggers: [
      'which agencies need attention', 'agencies need attention', 'agency health', 'agencies with no listings',
      'show me agencies with no active listings', 'agencies with no active listings', 'agencies approaching their property limit',
      'agencies approaching their agent limit', 'which agencies are close to their property limit', 'which agencies are close to their agent limit',
      'agencies close to their limit',
    ],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_platform_priorities',
    triggers: [
      "today's platform priorities", 'todays platform priorities', 'platform priorities', 'what should i focus on',
      'what needs attention across the platform', 'give me today\'s platform priorities',
    ],
    extract: () => ({}),
    requiredArgs: [],
  },
  {
    tool: 'get_platform_rankings',
    triggers: [
      'which agency has the most properties', 'which agencies have the most properties', 'most properties on the platform',
      'which agencies have the most inquiries', 'which agency has the most inquiries',
      'which agencies have the most favorited properties', 'most favorited properties',
      'which agencies have the most agents', 'which agencies have the largest teams', 'largest teams',
    ],
    extract: (t) => {
      const lower = t.toLowerCase();
      if (/\binquir/.test(lower)) return { metric: 'inquiries' };
      if (/favorit/.test(lower)) return { metric: 'favorites' };
      if (/\bagents?\b|\bteams?\b/.test(lower)) return { metric: 'agents' };
      return { metric: 'properties' };
    },
    requiredArgs: ['metric'],
    clarify: 'Ranked by what - properties, inquiries, favorited properties, or agents?',
  },
  {
    // Phase 2 (Customer AI) - long, specific "how do I..." triggers
    // (flattened from faq.js's own topic list, so the two can never
    // drift apart) deliberately don't overlap the shorter action
    // triggers/keywords elsewhere (e.g. submit_inquiry's 'contact the
    // agent', add_favorite_property's 'favorite' keyword) - "how do I
    // contact an agent" is a question about the platform, not a request
    // to actually contact one, and scores well clear of those tools'
    // keyword-only totals either way.
    tool: 'get_faq_answer',
    triggers: Object.values(FAQ_TOPICS).flatMap((topic) => topic.triggers),
    extract: (t) => ({ topic: matchFaqTopic(t) }),
    requiredArgs: ['topic'],
    clarify: 'Which would you like to know about - contacting an agent, favorites, inquiries, buying a property, whether you need an account, or scheduling a viewing?',
  },
  {
    tool: 'get_current_user',
    triggers: [
      'who am i', 'my account', 'my profile', 'current user', 'my role', 'what is my role', "what's my role",
      'what agency do i belong to', 'am i an agent or admin', 'show my account information',
    ],
    exactMatchEligible: true,
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
    triggers: ['my subscription', 'my plan', 'billing plan', 'what plan am i on', 'usage limits', 'subscription plan', 'what is my plan', "what's my plan"],
    exactMatchEligible: true,
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
    triggers: ['my tasks', 'show tasks', 'list tasks', 'pending tasks', 'to-do', 'todo', 'to do list', 'todo list', "what's on my to-do"],
    exactMatchEligible: true,
    extract: (t) => ({ status: e.extractTaskStatus(t) }),
    requiredArgs: [],
  },
  {
    tool: 'create_task',
    triggers: ['create a task', 'add a task', 'new task', 'remind me to', 'task to'],
    exactMatchEligible: true,
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
    triggers: ['schedule an appointment', 'book a viewing', 'schedule a viewing', 'set up a viewing', 'new appointment', 'schedule a visit', 'book a visit', 'book a property visit', 'visit for property'],
    idBoost: true,
    extract: (t) => {
      const raw = e.extractTitleAfter(t, ['schedule an appointment', 'book a viewing', 'schedule a viewing', 'set up a viewing', 'new appointment', 'schedule a visit', 'book a visit', 'book a property visit']);
      // "book a property visit for <id> tomorrow" leaves "for <id>
      // tomorrow" as the raw leftover - that's identifying WHICH
      // property, not a title. Stripped here rather than in the shared
      // extractTitleAfter (also used by create_task, where "to call
      // Ayesha tomorrow" IS a real, intended title).
      const cleaned = raw?.replace(/^for\s+[0-9a-f]{24}\s*/i, '').trim();
      return {
        title: cleaned || 'Property viewing',
        scheduledAt: e.extractDate(t),
        relatedProperty: e.extractObjectIds(t)[0],
      };
    },
    requiredArgs: ['scheduledAt'],
    clarify: 'When should I schedule it? e.g. "book a viewing tomorrow".',
  },
  {
    tool: 'get_upcoming_reminders',
    triggers: ['reminders', 'what do i have coming up', 'due soon', 'overdue tasks', 'overdue follow', 'upcoming'],
    exactMatchEligible: true,
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
    // Conversational company-identity phrasings ('what kind of company
    // is X', 'information about X', 'tell me about X') are additive
    // triggers here, resolving to the same get_agency_details tool as
    // the original 'agency profile'/'trust score for' phrasings - no
    // new tool, no new registry entry, per the Phase (agency personas)
    // brief. 'what does X do' and 'who is/are X' are deliberately NOT
    // added as triggers: both are sentence-opening fragments with many
    // unrelated completions ("what does X cost", "who is the agent for
    // this listing"), and the trigger matcher only does fixed-substring
    // scoring - it can't require "do" to appear at the end the way a
    // full regex could. Adding either as a bare trigger would make
    // unrelated questions ("what does featured mean?") falsely match
    // this intent and produce a confusing "Which agency?" clarify
    // instead of a normal answer. Those two phrasings still resolve
    // correctly via LLM escalation (see llm/prompts.js's BASE_INSTRUCTIONS
    // update), which can actually tell "what does X do" (company
    // identity) apart from "what does X cost" (not) - the deterministic
    // matcher here can't.
    tool: 'get_agency_details',
    triggers: [
      'tell me about agency',
      'about this agency',
      'agency profile',
      'agency called',
      'trust score for',
      'trust score of',
      "agency's trust score",
      'what kind of company is',
      'what kind of company are',
      'information about',
      'tell me about',
    ],
    extract: (t) => ({
      agencyName:
        e.extractQuoted(t) ||
        e.extractCompanyName(t) ||
        e.extractTitleAfter(t, ['tell me about agency', 'about this agency', 'agency called', 'trust score for', 'trust score of']),
    }),
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
