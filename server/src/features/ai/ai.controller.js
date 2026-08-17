const aiService = require('./ai.service');
const propertyAssistService = require('./propertyAssist.service');

async function chat(req, res, next) {
  try {
    const { message, conversationId } = req.body;
    const result = await aiService.sendMessage({
      conversationId,
      message,
      requester: req.user,
      tenantId: req.tenant?._id || null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function chatStream(req, res, next) {
  const { message, conversationId } = req.body;
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let announcedConversationId = null;
    for await (const item of aiService.streamMessage({
      conversationId,
      message,
      requester: req.user,
      tenantId: req.tenant?._id || null,
    })) {
      if (!announcedConversationId) {
        announcedConversationId = item.conversationId;
        res.write(`event: meta\ndata: ${JSON.stringify({ conversationId: item.conversationId })}\n\n`);
      }
      if (item.type === 'attachments') {
        res.write(`event: attachments\ndata: ${JSON.stringify({ attachments: item.attachments })}\n\n`);
      } else {
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: item.chunk })}\n\n`);
      }
    }
    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch {
    // SSE headers are likely already flushed by this point, so a fresh
    // HTTP status can't be set - emit an error event on the stream
    // itself instead of calling next(err).
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'AI request failed' })}\n\n`);
    res.end();
  }
}

async function list(req, res, next) {
  try {
    const conversations = await aiService.listConversations(req.user);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const conversation = await aiService.getConversation(req.params.id, req.user);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const conversation = await aiService.updateConversation(req.params.id, req.user, req.body);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await aiService.deleteConversation(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function propertyAssist(req, res, next) {
  try {
    const { action, property } = req.body;
    const result = await propertyAssistService.assist(action, property);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Phase 3 (Listing AI) - synchronous/pure (no DB, no LLM), so no await
// needed, but kept in the same try/catch shape as every other handler
// here for consistency.
function extractListingFields(req, res, next) {
  try {
    const result = propertyAssistService.extractFields(req.body.text);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { chat, chatStream, list, getOne, update, remove, propertyAssist, extractListingFields };
