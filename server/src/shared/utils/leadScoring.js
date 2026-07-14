const URGENCY_SCORES = {
  immediate: 25,
  '1-3m': 15,
  '3-6m': 8,
  exploring: 3,
};

const MESSAGE_LENGTH_CAP = 200;
const PHONE_BONUS = 5;
const VIEWS_LOG_BASE = 20;

function scoreBudgetMatch(budget, price) {
  if (!budget || !price) return 0;
  const closeness = 1 - Math.abs(budget - price) / price;
  return Math.round(Math.max(0, closeness) * 30);
}

function scoreUrgency(moveTimeline) {
  return URGENCY_SCORES[moveTimeline] ?? 0;
}

function scoreInterest(message, phone) {
  const length = (message || '').trim().length;
  const lengthScore = Math.min(1, length / MESSAGE_LENGTH_CAP) * 20;
  const phoneScore = phone ? PHONE_BONUS : 0;
  return Math.round(Math.min(25, lengthScore + phoneScore));
}

function scorePopularity(views) {
  if (!views || views <= 0) return 0;
  const scaled = Math.log(views + 1) / Math.log(VIEWS_LOG_BASE);
  return Math.round(Math.min(1, scaled) * 20);
}

function deriveStatus(total) {
  if (total >= 70) return 'hot';
  if (total >= 40) return 'warm';
  return 'cold';
}

function calculateLeadScore({ budget, price, moveTimeline, message, phone, propertyViews }) {
  const budgetMatch = scoreBudgetMatch(budget, price);
  const urgency = scoreUrgency(moveTimeline);
  const interest = scoreInterest(message, phone);
  const popularity = scorePopularity(propertyViews);

  const total = Math.min(100, budgetMatch + urgency + interest + popularity);

  return {
    total,
    status: deriveStatus(total),
    breakdown: { budgetMatch, urgency, interest, popularity },
  };
}

module.exports = { calculateLeadScore };
