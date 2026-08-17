// Deterministic next-step suggestion for a lead - Phase 3 (Agent/Agency
// Admin AI). Same discipline as shared/utils/leadScoring.js and
// priceEstimate.js: a fixed rule table over real, already-stored fields
// only (pipelineStage, hot/warm/cold status, when the lead was created,
// whether a follow-up task/appointment already exists for it) - nothing
// invented, no engagement/activity signal this app doesn't actually
// track.
const STALE_NEW_LEAD_DAYS = 3;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

// `hasOpenTask`/`hasUpcomingAppointment` come from a real query against
// this lead's own linked Task/Appointment records (see ai.tools.js's
// explain_lead_score executor) - checked BEFORE suggesting a fresh
// follow-up so this never tells an agent to do something they've
// already scheduled.
function suggestLeadAction({ pipelineStage, status, createdAt, hasOpenTask, hasUpcomingAppointment }) {
  if (pipelineStage === 'closed_won') return 'This lead is closed (won) - no further action needed.';
  if (pipelineStage === 'closed_lost') return 'This lead is closed (lost) - no further action needed.';

  if (hasUpcomingAppointment) return 'A viewing is already scheduled for this lead - no new action needed right now.';
  if (hasOpenTask) return 'A follow-up task is already open for this lead - no new action needed right now.';

  if (pipelineStage === 'new') {
    const age = daysSince(createdAt);
    if (age >= STALE_NEW_LEAD_DAYS) {
      return `This lead has gone ${age} days without contact - reach out now before it goes cold.`;
    }
    if (status === 'hot') return "This is a hot lead and hasn't been contacted yet - reach out now.";
    return 'Reach out to this lead to gauge interest.';
  }
  if (pipelineStage === 'contacted') return 'Consider scheduling a viewing to move this lead forward.';
  if (pipelineStage === 'viewing_scheduled') return "Follow up after the viewing to check their interest in moving forward.";
  if (pipelineStage === 'negotiation') return "Continue the negotiation - check in if there's been no recent update.";

  return 'Review this lead and decide on next steps.';
}

module.exports = { suggestLeadAction, daysSince, STALE_NEW_LEAD_DAYS };
