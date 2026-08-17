// Small, deterministic entity extractors used to turn free text into tool
// arguments - no ML, no external NLU service. Every function is a plain
// regex/keyword match against the raw message and returns `undefined`
// when it can't find something, rather than guessing.

const KNOWN_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

const TYPE_SYNONYMS = {
  house: 'house',
  home: 'house',
  villa: 'house',
  flat: 'flat',
  apartment: 'flat',
  plot: 'plot',
  land: 'plot',
  farmhouse: 'farmhouse',
  'farm house': 'farmhouse',
  office: 'office',
  shop: 'shop',
  store: 'shop',
  warehouse: 'warehouse',
  godown: 'warehouse',
};

const STAGE_SYNONYMS = {
  new: 'new',
  contacted: 'contacted',
  contact: 'contacted',
  viewing: 'viewing_scheduled',
  'viewing scheduled': 'viewing_scheduled',
  negotiation: 'negotiation',
  negotiating: 'negotiation',
  won: 'closed_won',
  'closed won': 'closed_won',
  lost: 'closed_lost',
  'closed lost': 'closed_lost',
};

const TASK_STATUS_SYNONYMS = { pending: 'pending', 'in progress': 'in_progress', ongoing: 'in_progress', done: 'done', completed: 'done' };

const OBJECT_ID_RE = /\b[0-9a-fA-F]{24}\b/g;

// Plain iterative Levenshtein distance - no new dependency. Only reached
// as a last-resort fallback (see extractCity below), so a correctly-
// spelled city - the overwhelming majority of real messages - never
// touches this code path at all.
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prev[j], prev[j - 1], prevDiag);
      prevDiag = temp;
    }
  }
  return prev[n];
}

// One typo/transposition allowed for shorter city names, two for the
// longer ones (Islamabad/Rawalpindi/Faisalabad) - a fixed, generous-
// enough-for-one-mistake threshold, not tuned against anything.
function maxEditsFor(city) {
  return city.length >= 8 ? 2 : 1;
}

// Last-resort fuzzy match against KNOWN_CITIES only (never against an
// arbitrary word) - deliberately conservative: skips words under 4
// letters (too short to fuzzy-match safely) and requires the candidate
// word's length to be within 1 of the city's, on top of the edit-
// distance check, so an unrelated short/medium word can't accidentally
// collide with a real city name.
function fuzzyFindCity(text) {
  const words = text.match(/[A-Za-z]+/g) || [];
  for (const word of words) {
    if (word.length < 4) continue;
    const lowerWord = word.toLowerCase();
    for (const city of KNOWN_CITIES) {
      if (Math.abs(word.length - city.length) > 1) continue;
      if (levenshteinDistance(lowerWord, city.toLowerCase()) <= maxEditsFor(city)) return city;
    }
  }
  return undefined;
}

function extractCity(text) {
  const found = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text));
  if (found) return found;
  const fuzzy = fuzzyFindCity(text);
  if (fuzzy) return fuzzy;
  const match = text.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\b/);
  return match ? match[1] : undefined;
}

function extractType(text) {
  const lower = text.toLowerCase();
  for (const [word, canonical] of Object.entries(TYPE_SYNONYMS)) {
    if (new RegExp(`\\b${word}s?\\b`).test(lower)) return canonical;
  }
  return undefined;
}

function parseMoneyToken(numStr, unit) {
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return undefined;
  if (/crore/i.test(unit)) return num * 1e7;
  // Pre-existing bug fixed here: every unit-matching regex in this file
  // already accepts "lac" as a lakh spelling (see extractPriceRange's
  // own (crore|lakh|lac) alternatives below), but this multiplier check
  // only recognized "lah"/"lakh" (/lak?h/), so a genuinely-matched "lac"
  // unit silently fell through to `return num` unmultiplied - e.g. "25
  // lac" parsed as 25 instead of 2,500,000. Caught by Phase 3's new
  // extractListingPrice tests; fixing at the source since every existing
  // caller (extractPriceRange, extractAreaRange, extractListingPrice)
  // shares this one function.
  if (/lak?h|lac/i.test(unit)) return num * 1e5;
  return num;
}

// "around X" / "approximately X" / "near X" - a fuzzy single-figure
// price has no dedicated tool parameter (search_properties only takes
// minPrice/maxPrice), so this NLU-layer heuristic turns it into a band
// around the stated figure using the tool's real, existing filter -
// nothing new is computed or stored, it's the same category of
// translation "under 5 crore" already does for maxPrice alone. Fixed
// and documented, not tuned against anything - revisit with real usage
// data if it turns out too wide/narrow.
const PRICE_PROXIMITY_TOLERANCE = 0.15;

function extractPriceRange(text) {
  const lower = text.toLowerCase();

  // "between X and Y" / "from X to Y", optionally with a dash instead of
  // a word ("between 2-8 crore"). Unit may be stated once (on either
  // number) and applies to both, matching how people actually write it.
  const connectedRange = lower.match(/(?:between|from)\s+([\d.]+)\s*(crore|lakh|lac)?\s*(?:and|to|-|–)\s*([\d.]+)\s*(crore|lakh|lac)?/);
  if (connectedRange) {
    return {
      minPrice: parseMoneyToken(connectedRange[1], connectedRange[2] || connectedRange[4] || ''),
      maxPrice: parseMoneyToken(connectedRange[3], connectedRange[4] || connectedRange[2] || ''),
    };
  }

  // "in the range of X to Y" / "in the range of X and Y"
  const rangeOf = lower.match(/range of\s+([\d.]+)\s*(crore|lakh|lac)?\s*(?:and|to|-|–)\s*([\d.]+)\s*(crore|lakh|lac)?/);
  if (rangeOf) {
    return {
      minPrice: parseMoneyToken(rangeOf[1], rangeOf[2] || rangeOf[4] || ''),
      maxPrice: parseMoneyToken(rangeOf[3], rangeOf[4] || rangeOf[2] || ''),
    };
  }

  // Bare "X to Y crore" / "X-Y crore" with no leading connector word at
  // all (e.g. "listings costing 2-8 crore") - the unit is only ever
  // stated once here, at the end, so it isn't optional the way the
  // connector-led patterns above allow.
  const bareRange = lower.match(/([\d.]+)\s*(?:-|–|to)\s*([\d.]+)\s*(crore|lakh|lac)\b/);
  if (bareRange) {
    return {
      minPrice: parseMoneyToken(bareRange[1], bareRange[3]),
      maxPrice: parseMoneyToken(bareRange[2], bareRange[3]),
    };
  }

  const under = lower.match(/(?:under|below|less than|up to)\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (under) return { maxPrice: parseMoneyToken(under[1], under[2] || '') };
  // "my budget is 5 crore"/"budget 5 crore"/"budget of 5 crore" - a stated budget reads as a
  // ceiling ("I can spend up to this"), same semantic as under/below.
  const budget = lower.match(/budget(?:\s+is|\s+of)?\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (budget) return { maxPrice: parseMoneyToken(budget[1], budget[2] || '') };
  // "maximum"/"max" require the unit, unlike under/below above - both
  // words are just as likely to prefix a bedroom/area figure ("maximum
  // 4 bedrooms"), so an optional unit here would misfire as a price.
  const maxSynonym = lower.match(/(?:maximum|max)\s+([\d.]+)\s*(crore|lakh|lac)\b/);
  if (maxSynonym) return { maxPrice: parseMoneyToken(maxSynonym[1], maxSynonym[2]) };

  const over = lower.match(/(?:over|above|more than|greater than)\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (over) return { minPrice: parseMoneyToken(over[1], over[2] || '') };
  const minSynonym = lower.match(/(?:minimum|min)\s+([\d.]+)\s*(crore|lakh|lac)\b/);
  if (minSynonym) return { minPrice: parseMoneyToken(minSynonym[1], minSynonym[2]) };

  const approx = lower.match(/(?:around|approximately|near|about)\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (approx) {
    const target = parseMoneyToken(approx[1], approx[2] || '');
    if (target != null) {
      return {
        minPrice: Math.round(target * (1 - PRICE_PROXIMITY_TOLERANCE)),
        maxPrice: Math.round(target * (1 + PRICE_PROXIMITY_TOLERANCE)),
      };
    }
  }

  return {};
}

// "cheapest house in Lahore" is city-scoped, so it correctly resolves to
// search_properties rather than get_property_analytics (whose
// cheapest/expensive slices are agency-wide, ignoring city entirely) -
// but search_properties had no way to honor the "cheapest" part at all,
// silently falling back to its normal featured/views sort. This gives it
// a real price-sort signal to apply, same pattern as bedroom-proximity
// ranking below.
function extractSortIntent(text) {
  const lower = text.toLowerCase();
  if (/\b(cheapest|lowest price|least expensive|most affordable)\b/.test(lower)) return 'price_asc';
  if (/\b(most expensive|highest price|priciest)\b/.test(lower)) return 'price_desc';
  return undefined;
}

function extractBedrooms(text) {
  const lower = text.toLowerCase();

  // search_properties' bedrooms parameter is $gte-only - there is no
  // maxBedrooms filter (adding one would be new business logic, out of
  // scope here). "less than"/"at most"/"maximum N bedrooms" is a pure
  // upper bound with nothing real to apply, so it's explicitly excluded
  // here, BEFORE the generic fallback below - otherwise that fallback
  // would extract the number and apply it as a wrong, backwards
  // *minimum* filter (e.g. "less than 3 bedrooms" would incorrectly
  // become "3+ bedrooms", the opposite of what was asked).
  if (/(?:less than|fewer than|at most|maximum|max)\s+\d+\s*(?:bed|bedroom|bhk)/.test(lower)) {
    return undefined;
  }

  // "between 2 and 4 bedrooms" - only the lower bound is extracted, for
  // the same $gte-only reason above; a result with more than 4 bedrooms
  // isn't a wrong answer to "at least 2", just an imprecise one.
  const range = lower.match(/between\s+(\d+)\s*(?:and|to|-)\s*(\d+)\s*(?:bed|bedroom|bhk)/);
  if (range) return Number(range[1]);

  // Covers the bare figure plus every real lower-bound phrasing
  // ("minimum 4 bedrooms", "at least 4 bedrooms", "more than 5
  // bedrooms") without needing a separate pattern for each - the number
  // immediately preceding bed/bedroom/bhk is always the intended floor
  // once the upper-bound-only case above has been ruled out.
  const match = text.match(/(\d+)\s*[- ]?(?:bed|bedroom|bhk)/i);
  return match ? Number(match[1]) : undefined;
}

function extractBathrooms(text) {
  const match = text.match(/(\d+)\s*[- ]?bath(?:room)?/i);
  return match ? Number(match[1]) : undefined;
}

function extractArea(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/i);
  return match ? Number(match[1]) : undefined;
}

const MARLA_PER_KANAL = 20;

// search_properties' real `area`/`areaUnit` fields (marla or sqft only -
// kanal isn't a stored unit, see property.model.js) now have a real
// filter behind them - this used to be flagged as entirely unsupported
// (detectUnsupportedFilters below), which meant "3 marla housing"
// silently returned the whole unfiltered catalog with a disclaimer
// instead of ever actually narrowing by size, and a genuine range like
// "marla between 2 and 4" had no way to apply at all. Kanal is converted
// to marla (1 kanal = 20 marla, a fixed real-world constant, not an
// invented one) and filtered against areaUnit: 'marla' - a property
// listed in sqft is correctly excluded rather than wrongly compared
// against a marla figure, since this app never converts between the two
// on the data side (agents pick one unit at listing time).
// Lifted to module scope (was a local closure inside extractAreaRange
// only) so extractListingArea below can reuse the exact same kanal->
// marla conversion instead of duplicating it - one real-world constant
// (MARLA_PER_KANAL), one place it's applied.
function toMarla(num, unit) {
  return unit === 'kanal' ? num * MARLA_PER_KANAL : num;
}
function dbUnit(unit) {
  return unit === 'kanal' ? 'marla' : unit;
}

function extractAreaRange(text) {
  const lower = text.toLowerCase();

  const range = lower.match(/between\s+(\d+(?:\.\d+)?)\s*(?:and|to|-|–)\s*(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/);
  if (range) {
    const unit = range[3];
    return { minArea: toMarla(Number(range[1]), unit), maxArea: toMarla(Number(range[2]), unit), areaUnit: dbUnit(unit) };
  }

  const under = lower.match(/(?:under|below|less than|up to|maximum|max)\s+(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/);
  if (under) {
    const unit = under[2];
    return { maxArea: toMarla(Number(under[1]), unit), areaUnit: dbUnit(unit) };
  }

  const over = lower.match(/(?:over|above|more than|at least|minimum|min)\s+(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/);
  if (over) {
    const unit = over[2];
    return { minArea: toMarla(Number(over[1]), unit), areaUnit: dbUnit(unit) };
  }

  // A bare figure ("3 marla housing", "5 marla houses") - treated as an
  // approximate target with a tolerance band, same precedent as
  // extractPriceRange's "around X" handling. Unlike bedrooms (where a
  // bare number is an established $gte floor elsewhere in this file),
  // marla/kanal sizes are standard, well-known colloquial categories in
  // this market - "5 marla house" means a house of roughly that size,
  // not "5 marla or bigger".
  const bare = text.match(/(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/i);
  if (bare) {
    const unit = bare[2].toLowerCase();
    const target = toMarla(Number(bare[1]), unit);
    const tolerance = Math.max(target * 0.15, unit === 'sqft' ? 50 : 1);
    return { minArea: Math.max(0, target - tolerance), maxArea: target + tolerance, areaUnit: dbUnit(unit) };
  }

  return {};
}

// Phase 3 (Listing AI) - a SINGLE absolute figure for a listing's own
// asking price, distinct from extractPriceRange above (which produces a
// min/max *search filter*, never a single value). Reuses the exact same
// parseMoneyToken crore/lakh conversion - no second money parser.
// "asking"/"priced at"/"price is"/"for" are checked first since they're
// unambiguous; a bare "<number> crore/lakh" anywhere else in the text is
// the last-resort fallback, which is the right call for a short rough
// listing description (unlike search text, there's no other number in a
// "3 bed house in DHA Lahore, 2 kanal, asking 4.5 crore" that could be
// confused for the price once the area/bedroom patterns have already
// claimed their own numbers).
function extractListingPrice(text) {
  const lower = text.toLowerCase();
  const asking = lower.match(/(?:asking|priced at|price is|priced)\s+([\d.]+)\s*(crore|lakh|lac)/);
  if (asking) return parseMoneyToken(asking[1], asking[2]);
  const bare = lower.match(/([\d.]+)\s*(crore|lakh|lac)/);
  if (bare) return parseMoneyToken(bare[1], bare[2]);
  return undefined;
}

// Phase 3 (Listing AI) - a single {area, areaUnit} pair for a listing's
// own size, reusing the exact same toMarla/dbUnit conversion
// extractAreaRange already uses - not a second area parser, just a
// single-value shape instead of a min/max range.
function extractListingArea(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(marla|sqft|kanal)/i);
  if (!match) return undefined;
  const unit = match[2].toLowerCase();
  return { area: toMarla(Number(match[1]), unit), areaUnit: dbUnit(unit) };
}

// search_properties has no area parameter at all, and its bedrooms
// parameter is $gte-only (no maximum) - see extractBedrooms's own
// comment. Rather than silently dropping a constraint the tool can't
// represent (which reads as if it WAS applied), this reports it in
// plain English so the caller (toolIntents.js's search_properties
// intent, wired through localEngine/index.js) can tell the user
// honestly which part of their request wasn't filterable, while still
// applying whatever real filters were achievable.
// get_my_properties (an agent's own listings, every status) - detects
// which real filter/sort was asked for. "need attention"/"low views"/
// "underperforming" all map to the same real signal (ascending view
// count) rather than inventing a genuine "needs attention" score nothing
// in this app computes.
function extractMyListingsFilter(text) {
  const lower = text.toLowerCase();
  const result = {};
  if (/\bsold\b/.test(lower)) result.status = 'sold';
  else if (/\b(active|available)\b/.test(lower)) result.status = 'available';

  if (/\bfeatured\b/.test(lower)) result.featured = true;

  if (/\b(newest|recently added|recent|latest)\b/.test(lower)) result.sortBy = 'newest';
  else if (/\b(most viewed|most popular|top viewed|highest viewed|performing well|trending)\b/.test(lower)) result.sortBy = 'most_viewed';
  else if (/\b(low views|least viewed|need(s)? attention|underperform|not performing|no inquiries)\b/.test(lower)) result.sortBy = 'least_viewed';
  else if (/\b(most expensive|highest price|priciest)\b/.test(lower)) result.sortBy = 'most_expensive';
  else if (/\b(cheapest|lowest price)\b/.test(lower)) result.sortBy = 'cheapest';

  return result;
}

function detectUnsupportedFilters(text) {
  const lower = text.toLowerCase();
  const notes = [];

  // Area (marla/sqft/kanal) used to be unconditionally unsupported here
  // - search_properties now has a real area filter (see extractAreaRange
  // above), so it's intentionally no longer flagged.

  if (/(?:less than|fewer than|at most|maximum|max)\s+\d+\s*(?:bed|bedroom|bhk)/.test(lower)) {
    const capped = lower.match(/(\d+)\s*(?:bed|bedroom|bhk)/);
    notes.push(`the "fewer than ${capped ? capped[1] : 'that many'} bedrooms" limit`);
  } else {
    const bedroomRange = lower.match(/between\s+\d+\s*(?:and|to|-)\s*(\d+)\s*(?:bed|bedroom|bhk)/);
    if (bedroomRange) notes.push(`the ${bedroomRange[1]}-bedroom upper limit`);
  }

  // "luxury"/"premium" have no real tier or tag anywhere in this data
  // model - only relevant here when search_properties actually won
  // (i.e. a real price/bedroom/area signal was also present); a bare
  // "luxury homes" query is handled entirely differently, by routing to
  // get_property_analytics' real `featured` slice instead (see
  // toolIntents.js) - this function only runs once search_properties has
  // already been selected.
  if (/\b(luxury|premium)\b/.test(lower)) {
    notes.push('the "luxury/premium" tier');
  }

  return notes;
}

function extractObjectIds(text) {
  const matches = text.match(OBJECT_ID_RE);
  return matches ? [...new Set(matches)] : [];
}

function extractStage(text) {
  const lower = text.toLowerCase();
  for (const [phrase, canonical] of Object.entries(STAGE_SYNONYMS)) {
    if (lower.includes(phrase)) return canonical;
  }
  return undefined;
}

function extractTaskStatus(text) {
  const lower = text.toLowerCase();
  for (const [phrase, canonical] of Object.entries(TASK_STATUS_SYNONYMS)) {
    if (lower.includes(phrase)) return canonical;
  }
  return undefined;
}

function extractQuoted(text) {
  const match = text.match(/["“]([^"”]{2,200})["”]/);
  return match ? match[1] : undefined;
}

// Conversational company-identity questions ("Tell me about DreamHomes",
// "What kind of company is DreamHomes?", "Give me information about
// DreamHomes") - deliberately narrower than extractTitleAfter: only
// phrases that are a complete, self-contained pattern regardless of what
// follows are included here (unlike e.g. "what does X" or "who is X",
// which branch into many unrelated completions - "what does X cost",
// "who is the agent for this listing" - and are intentionally left for
// LLM escalation to disambiguate instead, see toolIntents.js's comment
// on the get_agency_details entry). The captured name must start with a
// capital letter, which doubles as a safety filter against swallowing a
// pronoun/generic reference ("tell me about it/this property").
const COMPANY_QUESTION_PHRASES = ['what kind of company is', 'what kind of company are', 'information about', 'tell me about'];

function extractCompanyName(text) {
  for (const phrase of COMPANY_QUESTION_PHRASES) {
    const idx = text.toLowerCase().indexOf(phrase);
    if (idx === -1) continue;
    const rest = text.slice(idx + phrase.length).trim().replace(/^the\s+/i, '');
    const match = rest.match(/^([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*)/);
    if (match) return match[1].trim();
  }
  return undefined;
}

// Very deliberately not a general date parser - covers the phrasing
// people actually type ("tomorrow", "next week", an explicit date) and
// leaves everything else undefined rather than guessing wrong.
function extractDate(text, now = new Date()) {
  const lower = text.toLowerCase();
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return new Date(isoMatch[1]);
  if (/\btomorrow\b/.test(lower)) return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (/\btoday\b/.test(lower)) return now;
  if (/\bnext week\b/.test(lower)) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inDays = lower.match(/in\s+(\d+)\s+days?/);
  if (inDays) return new Date(now.getTime() + Number(inDays[1]) * 24 * 60 * 60 * 1000);
  return undefined;
}

function extractNumber(text, keyword) {
  const match = text.match(new RegExp(`${keyword}\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : undefined;
}

// "task to call the customer" / "remind me to follow up" / a quoted
// string / falls back to the text with the trigger phrase stripped.
function extractTitleAfter(text, phrases) {
  const quoted = extractQuoted(text);
  if (quoted) return quoted;
  for (const phrase of phrases) {
    const idx = text.toLowerCase().indexOf(phrase);
    if (idx !== -1) {
      const rest = text.slice(idx + phrase.length).trim();
      if (rest) return rest.replace(/^(to|that|about)\s+/i, '').slice(0, 200);
    }
  }
  return undefined;
}

module.exports = {
  KNOWN_CITIES,
  extractCity,
  extractType,
  extractMyListingsFilter,
  extractSortIntent,
  extractPriceRange,
  extractBedrooms,
  extractBathrooms,
  extractArea,
  extractAreaRange,
  extractListingPrice,
  extractListingArea,
  detectUnsupportedFilters,
  extractObjectIds,
  extractStage,
  extractTaskStatus,
  extractQuoted,
  extractCompanyName,
  extractDate,
  extractNumber,
  extractTitleAfter,
};
