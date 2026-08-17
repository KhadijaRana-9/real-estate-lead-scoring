// Greetings/thanks/farewells aren't tool calls - they don't touch the
// database or need a "here's what I can do" wall of text. Handled as a
// short-circuit before intent matching so a plain "hello" gets a real
// reply instead of the generic fallback (which is reserved for messages
// that look like a request the engine genuinely couldn't parse).
//
// Matched against a normalized (lowercased, spaces/dashes stripped)
// version of the message rather than one regex trying to enumerate every
// spacing variant of "assalam o alaikum" / "assalamu alaikum" /
// "as-salam alaikum" - stripping whitespace first turns all of those
// into the same "assalamalaikum" comparison.
const { getPersona } = require('../llm/personas');

function normalize(text) {
  return text.trim().toLowerCase().replace(/[\s\-!.,]+/g, '');
}

const GREETING_WORDS = ['hi', 'hello', 'hey', 'heyy', 'hii', 'hiii', 'yo', 'salam', 'howdy', 'goodmorning', 'goodafternoon', 'goodevening'];
const GREETING_RE = /^(a+s+a?lam.*alaikum|assalam.*alaikum)$/;
const THANKS_WORDS = ['thanks', 'thank', 'thankyou', 'thx', 'shukriya', 'great', 'awesome', 'nice', 'cool', 'ok', 'okay', 'gotit', 'perfect'];
const FAREWELL_WORDS = ['bye', 'goodbye', 'seeyou', 'goodnight', 'khudahafiz', 'allahhafiz'];

function firstName(name) {
  return name ? name.split(' ')[0] : null;
}

function matchSmallTalk(message, requester) {
  const trimmed = message.trim();
  const normalized = normalize(trimmed);
  const name = firstName(requester?.name);

  if (GREETING_WORDS.includes(normalized) || GREETING_RE.test(normalized)) {
    // Role-specific hint (llm/personas.js - same source the LLM path
    // reads) instead of a one-size-fits-all list that used to mention
    // "leads"/"your dashboard" to customers who can't access either.
    const { greetingHint } = getPersona(requester?.role);
    return name ? `Hi ${name}! How can I help you today? ${greetingHint}` : `Hello! How can I help you today? ${greetingHint}`;
  }

  if (THANKS_WORDS.includes(normalized)) {
    return "You're welcome! Anything else I can help with?";
  }

  if (FAREWELL_WORDS.includes(normalized)) {
    return name ? `Take care, ${name}!` : 'Take care!';
  }

  return null;
}

module.exports = { matchSmallTalk };
