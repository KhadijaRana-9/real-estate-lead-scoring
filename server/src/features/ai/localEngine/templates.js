const { getPersona } = require('../llm/personas');

function money(amount) {
  if (amount == null) return 'an unknown amount';
  if (amount >= 1e7) return `PKR ${(amount / 1e7).toFixed(2)} Crore`;
  if (amount >= 1e5) return `PKR ${(amount / 1e5).toFixed(2)} Lakh`;
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

const REPLIERS = {
  // `count` is the real total (see ai.tools.js's executor - a genuine
  // countDocuments, not the display page size), `shown` is how many
  // cards are actually attached below. Only mentions "top N" when the
  // real total exceeds what's shown, so a search with exactly 8 matches
  // still reads naturally instead of "found 8, here are the top 8".
  search_properties: (r) => {
    if (!r.count) return "I didn't find any properties matching that - try widening the city, price, or bedroom filters.";
    const noun = `propert${r.count === 1 ? 'y' : 'ies'}`;
    return r.shown < r.count ? `Found ${r.count} ${noun} matching that - here are the top ${r.shown}.` : `Found ${r.count} ${noun} matching that.`;
  },
  get_my_properties: (r) => {
    if (!r.totalUnfiltered) return "You don't have any properties listed yet.";
    if (!r.count) return "None of your properties match that filter - try a different status or sort.";
    const noun = `propert${r.count === 1 ? 'y' : 'ies'}`;
    return r.shown < r.count ? `You have ${r.count} matching ${noun} - here are the top ${r.shown}.` : `You have ${r.count} matching ${noun}.`;
  },
  // Formats every real field the enriched property object now carries
  // (see ai.tools.js's get_property_details executor - reuses the same
  // agent/agency/rating enrichment the real property page shows) so a
  // customer's "tell me about this property" gets a real, complete
  // answer even with zero LLM configured, not just a bare title.
  get_property_details: (r) => {
    const p = r.properties?.[0];
    if (!p) return "I couldn't find that property.";
    const lines = [`${p.title} - ${money(p.price)}`, `${p.city}${p.locality ? `, ${p.locality}` : ''} - ${p.type}`];
    const specs = [];
    if (p.area) specs.push(`${p.area} ${p.areaUnit || 'marla'}`);
    if (p.bedrooms) specs.push(`${p.bedrooms} bed${p.bedrooms === 1 ? '' : 's'}`);
    if (p.bathrooms) specs.push(`${p.bathrooms} bath${p.bathrooms === 1 ? '' : 's'}`);
    if (specs.length) lines.push(specs.join(' - '));
    if (p.rating?.count) lines.push(`Rated ${p.rating.average}/5 from ${p.rating.count} review${p.rating.count === 1 ? '' : 's'}.`);
    if (p.agent?.name) lines.push(`Listing agent: ${p.agent.name}`);
    if (p.amenities?.length) lines.push(`Amenities: ${p.amenities.join(', ')}`);
    if (p.description) lines.push('', p.description);
    // Same real number the page's own "AI Price Insight" card shows
    // (see ai.tools.js's executor) - included so this one answer covers
    // the market-estimate question too, not just the listed price.
    if (r.priceInsight?.estimate) lines.push('', `Market estimate: ${money(r.priceInsight.estimate)} (based on city rate, area, bedrooms and bathrooms - not a formal appraisal).`);
    // Nearby places and financing are genuinely interactive, user-driven
    // features (a map, an adjustable mortgage calculator) with no single
    // canonical number or place list to state - pointing to them here is
    // accurate; inventing a specific rate or a specific nearby school
    // would not be.
    lines.push('', 'See the property page for nearby places on the map and an interactive mortgage/financing calculator.');
    return lines.join('\n');
  },
  compare_properties: (r) => `Comparing ${r.properties.length} properties side by side.`,
  // Phase 3 (Property intelligence) - states the REAL matching criteria
  // property.service.js's recommendProperties already applies (same
  // city, same type, ranked by closest price) rather than a bare count -
  // every recommended result already shares city/type with the
  // reference property by construction of that query, so reading it off
  // the first result is accurate, not a new/invented signal.
  recommend_properties: (r) => {
    if (!r.count) return 'No similar properties found nearby.';
    const sample = r.properties[0];
    const criteria = sample?.city ? ` in ${sample.city} (same type, closest in price)` : '';
    return `Found ${r.count} similar propert${r.count === 1 ? 'y' : 'ies'}${criteria}.`;
  },
  get_favorite_properties: (r) => (r.count ? `You have ${r.count} saved propert${r.count === 1 ? 'y' : 'ies'}.` : "You haven't saved any properties yet."),
  add_favorite_property: () => 'Saved to your favorites.',
  remove_favorite_property: () => 'Removed from your favorites.',
  submit_inquiry: (r) => `Your inquiry has been sent to the agent (lead score ${r.score}/100).`,
  // Phase 5 (Business Reasoning Layer): still a fixed template - no new
  // "reasoning" logic, no data beyond what estimatePrice() already
  // computes (shared/utils/priceEstimate.js) - just presenting the real
  // breakdown it already returns instead of only the final number. This
  // is why it's safe with zero LLM configured: it can't invent anything,
  // it only formats fields already on `r.breakdown`.
  estimate_property_price: (r) => {
    const b = r.breakdown || {};
    const lines = [`Estimated price: ${money(r.estimatedPrice ?? r.estimate)}`, '', 'Based on:'];
    if (b.ratePerMarla != null && b.area != null) {
      lines.push(`- ${b.city && b.city !== 'default' ? b.city[0].toUpperCase() + b.city.slice(1) : 'Base'} rate: ${money(b.ratePerMarla)} per marla x ${b.area} marla = ${money(b.baseAmount)}`);
    }
    if (b.bedroomAmount) lines.push(`- ${b.bedrooms} bedroom${b.bedrooms === 1 ? '' : 's'}: +${money(b.bedroomAmount)}`);
    if (b.bathroomAmount) lines.push(`- ${b.bathrooms} bathroom${b.bathrooms === 1 ? '' : 's'}: +${money(b.bathroomAmount)}`);
    return lines.join('\n');
  },
  // Phase 4 (Property performance intelligence) - mostInquired/
  // mostFavorited were already being computed by this tool's executor
  // (inquiryService.getMostInquiredProperties/favoriteService.
  // getMostFavoritedProperties) but never actually mentioned in the
  // reply text - this surfaces the real top result from each real
  // metric instead of a bare count, without fetching anything new.
  get_property_analytics: (r) => {
    const lines = [`You have ${r.totalAvailable} available listing${r.totalAvailable === 1 ? '' : 's'}.`];
    if (r.mostInquired?.[0]) {
      const top = r.mostInquired[0];
      lines.push(`Most inquiries: "${top.title}" (${top.inquiryCount} inquir${top.inquiryCount === 1 ? 'y' : 'ies'}).`);
    }
    if (r.mostFavorited?.[0]) {
      const top = r.mostFavorited[0];
      lines.push(`Most saved by customers: "${top.title}" (${top.favoriteCount} favorite${top.favoriteCount === 1 ? '' : 's'}).`);
    }
    return lines.join(' ');
  },
  get_lead_stats: (r) => `${r.totalInquiries} total leads, ${r.hotLeads} hot, averaging a score of ${r.averageLeadScore}/100.`,
  // Same discipline as estimate_property_price above - purely formats
  // the real breakdown calculateLeadScore() already computes
  // (shared/utils/leadScoring.js: budgetMatch/urgency/interest/
  // popularity). No new factor is invented here or anywhere else in
  // this app - there is no tracked "WhatsApp engagement" or per-customer
  // visit count, so this deliberately never claims one.
  explain_lead_score: (r) => {
    const b = r.breakdown || {};
    const lines = [
      `${r.customer} scored ${r.score}/100 (${r.status}).`,
      '',
      'Based on:',
      `- Budget match: ${b.budgetMatch} points`,
      `- Urgency: ${b.urgency} points${r.moveTimeline ? ` (${r.moveTimeline})` : ''}`,
      `- Interest signals: ${b.interest} points`,
      `- Property popularity: ${b.popularity} points`,
    ];
    // Phase 3 (Agent/Agency Admin AI) - a real, rule-based suggestion
    // (see leadActions.js), not new score data - appended only when the
    // executor computed one.
    if (r.suggestedAction) lines.push('', `Suggested next step: ${r.suggestedAction}`);
    return lines.join('\n');
  },
  get_lead_pipeline: (r) => `${r.total} leads across the pipeline. Here's the stage breakdown.`,
  move_lead_stage: (r) => `Moved the lead to "${r.newStage.replace(/_/g, ' ')}".`,
  get_dashboard_summary: (r) => `${r.cards.totalProperties} properties, ${r.cards.totalInquiries} inquiries, ${r.cards.hotLeads} hot leads, average score ${r.cards.averageLeadScore}.`,
  // Phase 5 (Platform overview) - subscriptionBreakdown/trialAgencies/
  // pendingAgencies/totalUsers/hotLeads were already computed by
  // platformDashboardService.getPlatformSummary but never mentioned in
  // the reply text (same "computed but silent" gap Phase 4 fixed for
  // get_property_analytics). "Paid" is a plain derived count (total
  // minus trial), not a new fabricated metric.
  get_platform_stats: (r) => {
    const c = r.cards;
    const paidAgencies = c.totalAgencies - (r.subscriptionBreakdown?.find((p) => p.plan === 'trial')?.count || 0);
    const lines = [`DreamHomes currently has ${c.totalAgencies} agenc${c.totalAgencies === 1 ? 'y' : 'ies'}:`];
    for (const { plan, count } of r.subscriptionBreakdown || []) {
      lines.push(`- ${count} ${plan}`);
    }
    lines.push('', `${c.activeAgencies} active, ${c.trialAgencies} on trial, ${paidAgencies} paid, ${c.suspendedAgencies} suspended, ${c.pendingAgencies} pending approval.`);
    lines.push(`${c.totalProperties} properties, ${c.totalLeads} leads (${c.hotLeads} hot), ${c.totalUsers} platform users.`);
    return lines.join('\n');
  },
  get_agency_performance: (r) => `${r.totalProperties} properties, ${r.totalAgents} agents, ${r.totalLeads} leads, ${r.conversionRate}% conversion rate.`,
  // Phase 4 (Agency business overview) - every figure here is already
  // real data from dashboardService.getSummary or a direct tenant-scoped
  // count (see the executor) - this is purely sentence assembly.
  get_agency_overview: (r) => {
    const hot = r.leadStatusBreakdown?.find((s) => s.status === 'hot')?.count ?? r.hotLeads;
    const warm = r.leadStatusBreakdown?.find((s) => s.status === 'warm')?.count ?? 0;
    const cold = r.leadStatusBreakdown?.find((s) => s.status === 'cold')?.count ?? 0;
    const lines = [
      `Your agency has ${r.totalProperties} propert${r.totalProperties === 1 ? 'y' : 'ies'} (${r.activeProperties} active) and ${r.totalInquiries} lead${r.totalInquiries === 1 ? '' : 's'} (${hot} hot, ${warm} warm, ${cold} cold), averaging a score of ${r.averageLeadScore}/100.`,
    ];
    if (r.appointmentsToday) lines.push(`${r.appointmentsToday} appointment${r.appointmentsToday === 1 ? '' : 's'} today.`);
    if (r.overdueTasks) lines.push(`${r.overdueTasks} overdue CRM task${r.overdueTasks === 1 ? '' : 's'}.`);
    if (r.team) {
      lines.push(`Team: ${r.team.totalAgents} agent${r.team.totalAgents === 1 ? '' : 's'}${r.team.pendingApplications ? `, ${r.team.pendingApplications} pending application${r.team.pendingApplications === 1 ? '' : 's'}` : ''}.`);
    }
    return lines.join(' ');
  },
  // Phase 4 (Daily priorities) - HIGH PRIORITY / TODAY / ATTENTION,
  // exactly as specified - only a section appears when the underlying
  // real data actually supports it, never a fabricated "0 items" section.
  get_agency_priorities: (r) => {
    const sections = [];
    if (r.hotLeadsNeedingFollowUp?.length) {
      const first = r.hotLeadsNeedingFollowUp[0];
      sections.push(
        [
          'HIGH PRIORITY',
          `- ${r.hotLeadsNeedingFollowUp.length} hot lead${r.hotLeadsNeedingFollowUp.length === 1 ? '' : 's'} need${r.hotLeadsNeedingFollowUp.length === 1 ? 's' : ''} follow-up, including ${first.customer} (${first.ageDays} day${first.ageDays === 1 ? '' : 's'} old, score ${first.score}, no open follow-up).`,
        ].join('\n')
      );
    }
    if (r.appointmentsToday?.length) {
      sections.push(['TODAY', `- ${r.appointmentsToday.length} appointment${r.appointmentsToday.length === 1 ? '' : 's'} scheduled.`].join('\n'));
    }
    if (r.overdueTasks?.length) {
      sections.push(['ATTENTION', `- ${r.overdueTasks.length} overdue task${r.overdueTasks.length === 1 ? '' : 's'}.`].join('\n'));
    }
    if (!sections.length) return "Nothing urgent right now - no hot leads waiting on follow-up, no appointments today, no overdue tasks.";
    return sections.join('\n\n');
  },
  // Phase 4 (Lead pipeline intelligence) - explains WHY each lead is in
  // the list using only its own real, already-stored fields (score,
  // status, pipeline stage, age, city) - never a new ranking signal.
  get_priority_leads: (r) => {
    if (!r.count) return "No leads match that - try a different status, city, or drop the filter.";
    const lines = [`${r.count} lead${r.count === 1 ? '' : 's'} match${r.count === 1 ? 'es' : ''} that:`];
    for (const lead of r.leads) {
      const cityPart = lead.city ? ` in ${lead.city}` : '';
      lines.push(`- ${lead.customer}${cityPart}: score ${lead.score} (${lead.status}), ${lead.pipelineStage.replace(/_/g, ' ')}, ${lead.ageDays} day${lead.ageDays === 1 ? '' : 's'} old.`);
    }
    if (r.count > r.leads.length) lines.push(`...and ${r.count - r.leads.length} more.`);
    return lines.join('\n');
  },
  // Phase 4 (Team/agent performance intelligence) - real counts only, no
  // invented engagement score.
  get_team_activity: (r) => {
    if (!r.agents.length) return 'No agents on your team yet.';
    const lines = ['Team activity:'];
    for (const a of r.agents) {
      const flags = [];
      if (a.overdueTasks) flags.push(`${a.overdueTasks} overdue task${a.overdueTasks === 1 ? '' : 's'}`);
      const flagText = flags.length ? ` - ${flags.join(', ')}` : '';
      lines.push(`- ${a.name}: ${a.propertyCount} propert${a.propertyCount === 1 ? 'y' : 'ies'}, ${a.activeLeads} active lead${a.activeLeads === 1 ? '' : 's'}${flagText}`);
    }
    return lines.join('\n');
  },
  get_agency_branding: (r) => `${r.companyName}'s brand colors are ${r.primaryColor} / ${r.secondaryColor}.`,
  list_platform_agencies: (r) => {
    const total = r.pagination?.total ?? r.items.length;
    if (!total) return 'No agencies match that.';
    const names = r.items.slice(0, 5).map((a) => a.companyName).join(', ');
    return `${total} agenc${total === 1 ? 'y' : 'ies'} found${names ? `: ${names}${total > 5 ? ', ...' : ''}` : ''}.`;
  },
  // Phase 5 (Agency health / platform priorities / rankings) - every
  // number below is either passed straight through from a real count
  // (get_platform_agency_health's executor) or is the exact reason
  // string that executor already built from real fields - no new
  // judgment happens in this formatting layer.
  get_platform_agency_health: (r) => {
    if (!r.count) return 'No agencies are currently flagged - nothing unusual in the real data right now.';
    const lines = [`${r.count} agenc${r.count === 1 ? 'y needs' : 'ies need'} a look:`];
    for (const a of r.agencies) {
      lines.push(`- ${a.companyName}: ${a.flags.join('; ')}.`);
    }
    return lines.join('\n');
  },
  get_platform_priorities: (r) => {
    const sections = [];
    if (r.pendingTotal) {
      const names = r.pendingAgencies.map((a) => a.companyName).join(', ');
      sections.push(['HIGH PRIORITY', `- ${r.pendingTotal} agenc${r.pendingTotal === 1 ? 'y' : 'ies'} awaiting approval${names ? `: ${names}` : ''}.`].join('\n'));
    }
    if (r.flaggedAgencies?.length) {
      sections.push(['ATTENTION', `- ${r.flaggedAgencies.length} agenc${r.flaggedAgencies.length === 1 ? 'y needs' : 'ies need'} a look (agents with no listings, or approaching a plan limit).`].join('\n'));
    }
    if (!sections.length) return 'Nothing urgent right now - no agencies pending approval, none flagged.';
    return sections.join('\n\n');
  },
  get_platform_rankings: (r) => {
    if (!r.agencies.length) return "That information isn't currently available in the platform data.";
    const noun = { properties: 'properties', inquiries: 'inquiries', favorites: 'favorited properties', agents: 'agents' }[r.metric];
    const lines = [`Agencies ranked by ${noun}:`];
    r.agencies.forEach((a, i) => lines.push(`${i + 1}. ${a.companyName}: ${a.count}`));
    return lines.join('\n');
  },
  // Phase 2 (Customer AI) - the executor already returns the final,
  // fixed answer text (see ai.tools.js/localEngine/faq.js), so this is
  // a pure pass-through, same pattern as submit_inquiry/add_favorite_
  // property above where there's nothing left to format.
  get_faq_answer: (r) => r.answer,
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

// `unsupportedNotes` (optional) - filters the user asked for that the
// matched tool has no real parameter for (see toolIntents.js's
// `detectUnsupported`, currently only search_properties). Appended
// honestly rather than silently dropped, so a partial match never reads
// as a full one - see localEngine/index.js for where this is computed.
function buildReply(tool, result, unsupportedNotes = []) {
  if (result?.error) return result.error;
  const replier = REPLIERS[tool];
  const base = replier
    ? (() => {
        try {
          return replier(result);
        } catch {
          return 'Here you go.';
        }
      })()
    : 'Here you go.';

  if (!unsupportedNotes.length) return base;
  const list = unsupportedNotes.length === 1 ? unsupportedNotes[0] : `${unsupportedNotes.slice(0, -1).join(', ')} and ${unsupportedNotes.at(-1)}`;
  return `${base} I couldn't apply ${list} because that filter isn't currently supported.`;
}

// Genuinely derived from the tool registry (each tool's own description),
// not a hardcoded marketing blurb - if a tool is added/removed/reworded
// in ai.tools.js, this list updates itself. `toolsForRole` is already
// RBAC-filtered (getToolsForRole(role)), so the example list itself can
// never mention a capability this role doesn't have - only the
// intro/closing lines are persona text, sourced from the same
// llm/personas.js the LLM path reads, so a role never gets a different
// personality depending on which path answered.
// `asked: true` - the user directly asked "help"/"what can you do"/"who
// are you" (see index.js's HELP_INTENT_RE), as opposed to this being the
// fallback for a message the engine couldn't parse at all. Same content
// either way; only the opening line changes (persona.helpAskedIntro vs
// helpIntro) - "I didn't catch a specific request" is the right framing
// for genuine confusion, but wrong when the user's request WAS "tell me
// what you can do".
function buildHelpMessage(role, toolsForRole, { asked = false } = {}) {
  if (toolsForRole.length === 0) {
    return "I don't have any tools available for your role yet.";
  }
  const persona = getPersona(role);
  const examples = toolsForRole.slice(0, 8).map((t) => `- ${t.description}`);
  const intro = asked ? persona.helpAskedIntro : persona.helpIntro;
  return [intro, ...examples, '', persona.helpExample].join('\n');
}

module.exports = { buildReply, buildHelpMessage, buildConfirmationPrompt, money };
