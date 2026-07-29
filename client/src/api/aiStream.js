import { getAccessToken, refreshAccessToken } from './axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

function postStream(token, message, conversationId, signal) {
  return fetch(`${BASE}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
    signal,
  })
}

// Axios doesn't expose a raw ReadableStream, so the streaming chat call
// uses fetch directly - which means it bypasses axios's response
// interceptor that transparently refreshes an expired access token. Redo
// that same refresh-and-retry-once dance here so a stale 15-minute token
// doesn't surface as a hard "AI request failed" mid-conversation.
export async function streamChat({ message, conversationId, signal, onChunk, onMeta, onAttachments }) {
  let res = await postStream(getAccessToken(), message, conversationId, signal)

  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken()
      res = await postStream(newToken, message, conversationId, signal)
    } catch {
      throw new Error('Your session expired - please log in again')
    }
  }

  if (!res.ok || !res.body) {
    throw new Error('AI request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() || ''

    for (const frame of frames) {
      const eventMatch = frame.match(/^event: (.+)$/m)
      const dataMatch = frame.match(/^data: (.+)$/m)
      if (!eventMatch || !dataMatch) continue

      const event = eventMatch[1].trim()
      const data = JSON.parse(dataMatch[1]);

      if (event === 'meta') onMeta?.(data.conversationId)
      if (event === 'attachments') onAttachments?.(data.attachments)
      if (event === 'chunk') {
        fullText += data.text
        onChunk?.(data.text, fullText)
      }
      if (event === 'error') throw new Error(data.message || 'AI request failed')
    }
  }

  return fullText
}
