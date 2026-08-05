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
    // Structured conversation memory - deliberately Mixed rather than a
    // strict sub-schema, so new fields (see localEngine/memory.js) never
    // require a migration for old conversations to keep working; a
    // conversation saved before a field existed just has it undefined,
    // which every reader already treats as "nothing remembered yet".
    // Current shape (all optional):
    //   lastCity, lastType, lastTool - Phase 1, unchanged
    //   pendingAction: { tool, args } - Phase 1, unchanged (awaiting
    //     confirmation on a write tool - see localEngine/index.js)
    //   entities: { propertyId, inquiryId, agencySlug, developerSlug,
    //     projectSlug, blogSlug } - real IDs of whatever was most
    //     recently discussed, per kind
    //   lastFilters - the args object from the last search-family tool
    //     call, verbatim
    //   recentToolResults: [{ tool, executedAt, success, summary,
    //     identifiers }] - bounded to the last 5 (see
    //     memory.js's MAX_RECENT_TOOL_RESULTS), compact summaries only,
    //     never raw tool output
    //   turnCount, needsSummarization - see localEngine/summarization.js
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ user: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
