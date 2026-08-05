function money(amount) {
  if (amount == null) return 'an unknown amount';
  if (amount >= 1e7) return `PKR ${(amount / 1e7).toFixed(2)} Crore`;
  if (amount >= 1e5) return `PKR ${(amount / 1e5).toFixed(2)} Lakh`;
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

const REPLIERS = {
  search_properties: (r) => (r.count ? `Found ${r.count} propert${r.count === 1 ? 'y' : 'ies'} matching that.` : "I didn't find any properties matching that - try widening the city, price, or bedroom filters."),
  get_property_details: (r) => (r.properties?.[0] ? `Here's ${r.properties[0].title}.` : "I couldn't find that property."),
  compare_properties: (r) => `Comparing ${r.properties.length} properties side by side.`,
  recommend_properties: (r) => (r.count ? `Found ${r.count} similar propert${r.count === 1 ? 'y' : 'ies'}.` : 'No similar properties found nearby.'),
  estimate_property_price: (r) => `Estimated fair value: ${money(r.estimatedPrice ?? r.estimate)}.`,
  get_property_analytics: (r) => `You have ${r.totalAvailable} available listings. Here's the breakdown.`,
  get_lead_stats: (r) => `${r.totalInquiries} total leads, ${r.hotLeads} hot, averaging a score of ${r.averageLeadScore}/100.`,
  explain_lead_score: (r) => `${r.customer} scored ${r.score}/100 (${r.status}) - budget match ${r.breakdown?.budgetMatch}, urgency ${r.breakdown?.urgency}, interest ${r.breakdown?.interest}, popularity ${r.breakdown?.popularity}.`,
  get_lead_pipeline: (r) => `${r.total} leads across the pipeline. Here's the stage breakdown.`,
  move_lead_stage: (r) => `Moved the lead to "${r.newStage.replace(/_/g, ' ')}".`,
  get_dashboard_summary: (r) => `${r.cards.totalProperties} properties, ${r.cards.totalInquiries} inquiries, ${r.cards.hotLeads} hot leads, average score ${r.cards.averageLeadScore}.`,
  get_platform_stats: (r) => `${r.cards.totalAgencies} agencies on the platform (${r.cards.activeAgencies} active), ${r.cards.totalProperties} properties total.`,
  get_agency_performance: (r) => `${r.totalProperties} properties, ${r.totalAgents} agents, ${r.totalLeads} leads, ${r.conversionRate}% conversion rate.`,
  get_agency_branding: (r) => `${r.companyName}'s brand colors are ${r.primaryColor} / ${r.secondaryColor}.`,
  list_platform_agencies: (r) => `${r.pagination?.total ?? r.items.length} agencies found.`,
  get_current_user: (r) => `You're ${r.name}, signed in as ${r.role.replace(/_/g, ' ')}.`,
  get_my_sessions: (r) => `You have ${r.count} active session${r.count === 1 ? '' : 's'}.`,
  get_audit_log: (r) => (r.count ? `Here are the last ${r.count} activity log entries.` : 'No recent activity logged yet.'),
  get_subscription: (r) => `On the ${r.plan} plan (${r.status}) - ${money(r.priceMonthly)}/mo, using ${r.usage.properties}/${r.limits.maxProperties === Infinity ? '∞' : r.limits.maxProperties} properties.`,
  get_invoices: (r) => (r.count ? `${r.count} invoice${r.count === 1 ? '' : 's'} on file.` : 'No invoices generated yet.'),
  list_tasks: (r) => (r.count ? `You have ${r.count} task${r.count === 1 ? '' : 's'}.` : 'No tasks match that.'),
  create_task: (r) => `Created task "${r.tasks[0].title}"${r.tasks[0].dueDate ? ` due ${new Date(r.tasks[0].dueDate).toLocaleDateString()}` : ''}.`,
  list_appointments: (r) => (r.count ? `You have ${r.count} appointment${r.count === 1 ? '' : 's'}.` : 'No appointments scheduled.'),
  create_appointment: (r) => `Scheduled "${r.appointments[0].title}" for ${new Date(r.appointments[0].scheduledAt).toLocaleString()}.`,
  get_upcoming_reminders: (r) => `${r.overdueTasks.length} overdue, ${r.dueSoonTasks.length} due soon, ${r.upcomingAppointments.length} appointments in the next ${r.windowHours}h.`,
  search_agencies: (r) => (r.count ? `Found ${r.count} agenc${r.count === 1 ? 'y' : 'ies'}.` : "I didn't find any agencies matching that - try a different city or name."),
  get_agency_details: (r) => `${r.companyName} - Trust Score ${r.stats?.trustScore ?? 'n/a'}/100, ${r.stats?.activeListings ?? 0} active listings, ${r.stats?.reviewCount ? `rated ${r.stats.rating}/5 from ${r.stats.reviewCount} reviews` : 'no reviews yet'}.`,
  search_developers: (r) => (r.count ? `Found ${r.count} developer${r.count === 1 ? '' : 's'}.` : "I didn't find any developers matching that."),
  search_projects: (r) => (r.count ? `Found ${r.count} project${r.count === 1 ? '' : 's'}.` : "I didn't find any projects matching that."),
  get_market_insights: (r) =>
    r.city
      ? r.available
        ? `${r.city}: average price ${money(r.avgPrice)} across ${r.listingCount} listings.`
        : `Not enough listing data in ${r.city} yet for a reliable market read.`
      : `Market overview across ${r.byCity?.length ?? 0} cities - ${r.totals?.totalActiveListings ?? 0} active listings, average price ${money(r.totals?.avgPrice)}.`,
  search_blog_posts: (r) => (r.count ? `Found ${r.count} article${r.count === 1 ? '' : 's'}.` : "I didn't find any articles matching that."),
  get_marketplace_stats: (r) => `${r.totalAgencies} agencies, ${r.totalProperties} properties, ${r.totalAgents} agents, across ${r.totalCities} cities.`,
};

// Human-readable description of what a mutating tool is about to do,
// shown before it actually runs (see index.js's pendingAction gate).
// Deliberately shows raw IDs rather than doing an extra lookup to
// resolve a friendly name here - keeps this module a pure formatter with
// no DB access, matching the rest of this file. A future pass could
// have the caller resolve a name first and pass it in; not required for
// the safety mechanism itself to work correctly.
const CONFIRMATION_PROMPTS = {
  move_lead_stage: (args) => `I'll move lead ${args.inquiryId} to "${String(args.stage).replace(/_/g, ' ')}". Reply "yes" to confirm, or "no" to cancel.`,
  create_task: (args) => `I'll create a task: "${args.title}"${args.dueDate ? ` due ${new Date(args.dueDate).toLocaleDateString()}` : ''}. Reply "yes" to confirm, or "no" to cancel.`,
  create_appointment: (args) => `I'll schedule "${args.title}" for ${new Date(args.scheduledAt).toLocaleString()}${args.location ? ` at ${args.location}` : ''}. Reply "yes" to confirm, or "no" to cancel.`,
};

function buildConfirmationPrompt(tool, args) {
  const builder = CONFIRMATION_PROMPTS[tool];
  if (!builder) return 'Reply "yes" to confirm this action, or "no" to cancel.';
  try {
    return builder(args);
  } catch {
    return 'Reply "yes" to confirm this action, or "no" to cancel.';
  }
}

function buildReply(tool, result) {
  if (result?.error) return result.error;
  const replier = REPLIERS[tool];
  if (!replier) return 'Here you go.';
  try {
    return replier(result);
  } catch {
    return 'Here you go.';
  }
}

// Genuinely derived from the tool registry (each tool's own description),
// not a hardcoded marketing blurb - if a tool is added/removed/reworded
// in ai.tools.js, this list updates itself.
function buildHelpMessage(role, toolsForRole) {
  if (toolsForRole.length === 0) {
    return "I don't have any tools available for your role yet.";
  }
  const examples = toolsForRole.slice(0, 8).map((t) => `- ${t.description}`);
  return [
    "I didn't catch a specific request there. Here's what I can help with:",
    ...examples,
    '',
    'Try asking in plain terms, e.g. "show me houses in Lahore under 5 crore" or "what are my hot leads".',
  ].join('\n');
}

module.exports = { buildReply, buildHelpMessage, buildConfirmationPrompt, money };
