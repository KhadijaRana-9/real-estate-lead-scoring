// Deterministic FAQ answers for common "how do I..." questions from a
// property shopper - Phase 2 (Customer AI). Each topic's trigger phrases
// are reused by toolIntents.js's get_faq_answer intent (so the matcher
// and the answer content can never drift out of sync with each other),
// and its answer text is reused by ai.tools.js's executor. No LLM, no
// external call - every answer is fixed, reviewed copy describing real,
// existing DreamHomes behavior (favorites, inquiries, viewings), same
// discipline as smallTalk.js.
const FAQ_TOPICS = {
  contact_agent: {
    triggers: [
      'how do i contact an agent', 'how can i contact an agent', 'how do i reach an agent',
      'how do i get in touch with an agent', 'how do i talk to an agent', 'how do i speak to an agent',
    ],
    question: 'How do I contact an agent?',
    answer: 'Open any property you\'re interested in and submit an inquiry - it goes straight to that property\'s listing agent, who can reach you back by phone or email. You can also just ask me to "contact the agent about" a specific property and I\'ll submit it for you.',
  },
  favorites: {
    triggers: ['how do favorites work', 'how do favourites work', 'what are favorites', 'what are favourites'],
    question: 'How do favorites work?',
    answer: 'Tap the heart icon on any property (or ask me to "save this property") to add it to your favorites. You can see everything you\'ve saved anytime by asking me for your favorites, or from the Favorites page.',
  },
  inquiries: {
    triggers: ['how do inquiries work', 'how does an inquiry work', 'what is an inquiry', 'what happens after i submit an inquiry'],
    question: 'How do inquiries work?',
    answer: 'An inquiry is a message to a property\'s listing agent saying you\'re interested. Once submitted, the agent can see your contact details and message, and will follow up directly. You can submit one from any property page, or just ask me.',
  },
  buy_property: {
    triggers: ['how do i buy a property', 'how can i buy a property', 'how do i purchase a property', 'steps to buy a property'],
    question: 'How do I buy a property?',
    answer: 'Browse or search listings, save the ones you like, and submit an inquiry on any property to connect directly with its listing agent - they\'ll guide you through viewing, negotiation, and next steps from there. DreamHomes itself doesn\'t process the purchase.',
  },
  account_required: {
    triggers: [
      'do i need an account to browse', 'do i need to sign up to browse', 'do i need to register to browse',
      'can i browse without an account', 'can i browse without signing up',
    ],
    question: 'Do I need an account to browse?',
    answer: 'No - browsing and searching properties is open to everyone. You\'ll only need a free account to save favorites, submit inquiries, or chat with me here.',
  },
  schedule_viewing: {
    triggers: [
      'how do i schedule a viewing', 'how do i schedule a visit', 'how do i book a viewing',
      'how do i arrange a viewing', 'how do i book a visit',
    ],
    question: 'How do I schedule a viewing?',
    answer: 'Submit an inquiry on the property you want to see and mention you\'d like to arrange a viewing, or just ask me to "book a viewing" for that property - the listing agent will follow up to confirm a time.',
  },
};

// First trigger phrase that appears anywhere in the message wins - the
// caller (toolIntents.js) only reaches this after matchIntent has already
// selected get_faq_answer via one of these exact same trigger lists, so
// in practice this is a genuine substring hit, not a guess.
function matchFaqTopic(text) {
  const lower = text.toLowerCase();
  for (const [key, entry] of Object.entries(FAQ_TOPICS)) {
    if (entry.triggers.some((t) => lower.includes(t))) return key;
  }
  return undefined;
}

module.exports = { FAQ_TOPICS, matchFaqTopic };
