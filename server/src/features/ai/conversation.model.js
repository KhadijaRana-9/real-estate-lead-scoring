const mongoose = require('mongoose');

// Structured tool results the AI actually looked up while answering
// (renderAs tells the frontend which rich component to render, e.g.
// property_cards / dashboard_summary) - stored alongside the prose reply
// so reopening a saved conversation still shows the real cards/tables,
// not just text.
const attachmentSchema = new mongoose.Schema(
  { tool: String, renderAs: String, data: mongoose.Schema.Types.Mixed },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    attachments: { type: [attachmentSchema], default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    // null for a super_admin's conversations (they have no agency).
    // Ownership is still fully enforced via `user` below either way.
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, default: 'New conversation' },
    pinned: { type: Boolean, default: false },
    messages: { type: [messageSchema], default: [] },
    // Lightweight offline "memory" - e.g. the last city mentioned - so a
    // follow-up like "show me more options" can be resolved without an
    // LLM to hold conversational context. See localEngine/index.js.
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
