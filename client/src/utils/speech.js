// Real, browser-native text-to-speech (Web Speech API) - no API key, no
// external service. `speechSynthesisSupported` is a genuine capability
// check (most modern browsers implement it), not a credentials gate.
export const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text) {
  if (!speechSynthesisSupported || !text) return
  window.speechSynthesis.cancel() // one utterance at a time
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (speechSynthesisSupported) window.speechSynthesis.cancel()
}

export function isSpeaking() {
  return speechSynthesisSupported && window.speechSynthesis.speaking
}
