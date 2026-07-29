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

function extractCity(text) {
  const found = KNOWN_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(text));
  if (found) return found;
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
  if (/lak?h/i.test(unit)) return num * 1e5;
  return num;
}

function extractPriceRange(text) {
  const lower = text.toLowerCase();
  const between = lower.match(/between\s+([\d.]+)\s*(crore|lakh|lac)?\s+and\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (between) {
    return {
      minPrice: parseMoneyToken(between[1], between[2] || between[4] || ''),
      maxPrice: parseMoneyToken(between[3], between[4] || between[2] || ''),
    };
  }
  const under = lower.match(/(?:under|below|less than|up to)\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (under) return { maxPrice: parseMoneyToken(under[1], under[2] || '') };
  const over = lower.match(/(?:over|above|more than|greater than)\s+([\d.]+)\s*(crore|lakh|lac)?/);
  if (over) return { minPrice: parseMoneyToken(over[1], over[2] || '') };
  return {};
}

function extractBedrooms(text) {
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
  extractPriceRange,
  extractBedrooms,
  extractBathrooms,
  extractArea,
  extractObjectIds,
  extractStage,
  extractTaskStatus,
  extractQuoted,
  extractDate,
  extractNumber,
  extractTitleAfter,
};
