const Conversation = require('./conversation.model');
const { resolveMessage } = require('./localEngine');

async function getOrCreateConversation(conversationId, requester, tenantId) {
  if (conversationId) {
    const existing = await Conversation.findOne({ _id: conversationId, user: requester.id });
    if (existing) return existing;
  }
  return Conversation.create({ agencyId: tenantId || null, user: requester.id, title: 'New conversation', messages: [], context: {} });
}

async function persistTurn(conversation, message, replyText, attachments, memory) {
  const isFirstTurn = conversation.messages.length === 0;
  conversation.messages.push({ role: 'user', content: message });
  conversation.messages.push({
    role: 'assistant',
    content: replyText,
    attachments: attachments && attachments.length ? attachments : undefined,
  });
  if (isFirstTurn) conversation.title = message.slice(0, 60);
  conversation.context = memory || conversation.context;
  await conversation.save();
}

async function sendMessage({ conversationId, message, requester, tenantId }) {
  const conversation = await getOrCreateConversation(conversationId, requester, tenantId);
  const ctx = { tenantId, requester };

  const { text, attachments, memory } = await resolveMessage(message, ctx, conversation.context);

  await persistTurn(conversation, message, text, attachments, memory);
  return { conversationId: conversation._id, reply: text, attachments };
}

const CHUNK_WORD_COUNT = 4;
const CHUNK_DELAY_MS = 25;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The local engine computes the full answer synchronously (a few
// milliseconds of DB queries, not a token stream) - this splits that
// already-known text into small word groups with a short delay purely
// as a UI affordance (the existing "typing" reveal), not to simulate
// reasoning that isn't happening. Attachments are emitted first, same
// event contract the frontend already expects.
async function* streamMessage({ conversationId, message, requester, tenantId }) {
  const conversation = await getOrCreateConversation(conversationId, requester, tenantId);
  const ctx = { tenantId, requester };

  const { text, attachments, memory } = await resolveMessage(message, ctx, conversation.context);

  if (attachments.length > 0) {
    yield { type: 'attachments', attachments, conversationId: conversation._id };
  }

  const words = text.split(' ');
  for (let i = 0; i < words.length; i += CHUNK_WORD_COUNT) {
    const piece = words.slice(i, i + CHUNK_WORD_COUNT).join(' ') + (i + CHUNK_WORD_COUNT < words.length ? ' ' : '');
    yield { type: 'chunk', chunk: piece, conversationId: conversation._id };
    await delay(CHUNK_DELAY_MS);
  }

  await persistTurn(conversation, message, text, attachments, memory);
}

async function listConversations(requester) {
  return Conversation.find({ user: requester.id }).sort({ pinned: -1, updatedAt: -1 }).select('title pinned updatedAt createdAt');
}

function notFound() {
  const err = new Error('Conversation not found');
  err.status = 404;
  return err;
}

async function getConversation(id, requester) {
  const conversation = await Conversation.findOne({ _id: id, user: requester.id });
  if (!conversation) throw notFound();
  return conversation;
}

async function deleteConversation(id, requester) {
  const res = await Conversation.deleteOne({ _id: id, user: requester.id });
  if (res.deletedCount === 0) throw notFound();
}

async function updateConversation(id, requester, data) {
  const conversation = await Conversation.findOne({ _id: id, user: requester.id });
  if (!conversation) throw notFound();
  if (data.title !== undefined) conversation.title = data.title;
  if (data.pinned !== undefined) conversation.pinned = data.pinned;
  await conversation.save();
  return conversation;
}

module.exports = {
  sendMessage,
  streamMessage,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversation,
};
