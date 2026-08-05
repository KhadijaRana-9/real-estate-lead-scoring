// Yes/no matching for the write-tool confirmation gate (see index.js's
// pendingAction handling). Same normalize-then-match discipline as
// smallTalk.js: strip whitespace/punctuation so "yes please" / "yes,
// please" / "Yes!" all resolve the same way, rather than one regex
// trying to enumerate every phrasing.
function normalize(text) {
  return text.trim().toLowerCase().replace(/[\s\-!.,]+/g, '');
}

const AFFIRMATIVE_WORDS = ['yes', 'yeah', 'yep', 'yup', 'confirm', 'confirmed', 'doit', 'goahead', 'ok', 'okay', 'sure', 'proceed'];
const NEGATIVE_WORDS = ['no', 'nope', 'cancel', 'stop', 'dont', 'donot', "don't", 'nevermind', 'abort'];

function isAffirmative(text) {
  return AFFIRMATIVE_WORDS.includes(normalize(text));
}

function isNegative(text) {
  return NEGATIVE_WORDS.includes(normalize(text));
}

module.exports = { isAffirmative, isNegative };
