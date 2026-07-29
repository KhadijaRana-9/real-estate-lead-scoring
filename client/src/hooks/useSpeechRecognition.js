import { useEffect, useRef, useState } from 'react'

// Real, browser-native speech-to-text (Web Speech API) - no API key, no
// external service, works today in Chrome/Edge. Firefox/Safari don't
// implement SpeechRecognition, so `supported` is a genuine capability
// check, not a credentials gate - callers should hide the mic button
// entirely when it's false rather than showing a broken control.
const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export default function useSpeechRecognition({ onResult } = {}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!SpeechRecognitionImpl) return undefined

    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
      onResult?.(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    return () => recognition.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = () => {
    if (!recognitionRef.current || listening) return
    setListening(true)
    recognitionRef.current.start()
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return { supported: Boolean(SpeechRecognitionImpl), listening, start, stop }
}
