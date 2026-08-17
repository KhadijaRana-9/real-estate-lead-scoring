const { matchIntent } = require('../../src/features/ai/localEngine/matcher');
const { buildReply } = require('../../src/features/ai/localEngine/templates');
const { TOOL_INTENTS } = require('../../src/features/ai/localEngine/toolIntents');

const ALL_TOOLS = TOOL_INTENTS.map((i) => i.tool);
function scoreOf(message) {
  return matchIntent(message, ALL_TOOLS);
}

describe('Phase 4 (Agency Admin AI) - new intents resolve deterministically', () => {
  it.each([
    ["how is my agency doing", 'get_agency_overview'],
    ['give me a business summary', 'get_agency_overview'],
    ["what's happening in my agency", 'get_agency_overview'],
    ["what should i focus on today", 'get_agency_priorities'],
    ["today's crm priorities", 'get_agency_priorities'],
    ['which leads need attention', 'get_priority_leads'],
    ['show me my hottest leads', 'get_priority_leads'],
    ['which leads are overdue', 'get_priority_leads'],
    ['how is my team doing', 'get_team_activity'],
    ['which agents have overdue tasks', 'get_team_activity'],
  ])('"%s" resolves to %s with a confident score', (message, expectedTool) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe(expectedTool);
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('"how is my agency" no longer collides with get_agency_performance (deliberately reassigned)', () => {
    expect(scoreOf('how is my agency').intent?.tool).toBe('get_agency_overview');
  });

  it('get_agency_performance keeps its other, more specific triggers unchanged', () => {
    expect(scoreOf('conversion rate').intent?.tool).toBe('get_agency_performance');
    expect(scoreOf('top agents').intent?.tool).toBe('get_agency_performance');
  });

  it('"show me hot leads in Lahore" routes to get_priority_leads (the filtered list), not get_lead_stats (bare totals), and extracts both filters', () => {
    const { intent } = scoreOf('show me hot leads in Lahore');
    expect(intent?.tool).toBe('get_priority_leads');
    expect(intent.extract('show me hot leads in Lahore')).toEqual({ status: 'hot', city: 'Lahore' });
  });

  it('bare "hot leads" (no extra phrasing) still routes to the existing get_lead_stats, unchanged', () => {
    expect(scoreOf('hot leads').intent?.tool).toBe('get_lead_stats');
  });

  it('get_priority_leads extracts a stale filter from natural phrasing', () => {
    const intent = TOOL_INTENTS.find((i) => i.tool === 'get_priority_leads');
    expect(intent.extract('which leads are overdue')).toEqual({ stale: true });
    expect(intent.extract('leads going cold')).toEqual({ stale: true });
  });

  it('all four new tools are agency_admin only', () => {
    const { TOOL_DEFINITIONS } = require('../../src/features/ai/ai.tools');
    for (const name of ['get_agency_overview', 'get_agency_priorities', 'get_priority_leads', 'get_team_activity']) {
      expect(TOOL_DEFINITIONS[name].roles).toEqual(['agency_admin']);
    }
  });
});

describe('Phase 4 - reply templates (pure formatting, no fabricated data)', () => {
  it('get_agency_overview reply uses only the real fields passed in', () => {
    const reply = buildReply('get_agency_overview', {
      totalProperties: 10, activeProperties: 8, totalInquiries: 25, hotLeads: 5, averageLeadScore: 62,
      leadStatusBreakdown: [{ status: 'hot', count: 5 }, { status: 'warm', count: 10 }, { status: 'cold', count: 10 }],
      appointmentsToday: 2, overdueTasks: 4, team: { totalAgents: 3, pendingApplications: 1 },
    });
    expect(reply).toMatch(/10 propert.*8 active.*25 leads.*5 hot, 10 warm, 10 cold.*62\/100/);
    expect(reply).toMatch(/2 appointments today/);
    expect(reply).toMatch(/4 overdue CRM tasks/);
    expect(reply).toMatch(/3 agents, 1 pending application/);
  });

  it('get_agency_priorities produces the HIGH PRIORITY / TODAY / ATTENTION structure only for sections with real data', () => {
    const reply = buildReply('get_agency_priorities', {
      hotLeadsNeedingFollowUp: [{ customer: 'Ahmed Khan', score: 82, ageDays: 2 }],
      appointmentsToday: [{ title: 'Viewing' }],
      overdueTasks: [{ title: 'Call back' }, { title: 'Send docs' }],
    });
    expect(reply).toMatch(/^HIGH PRIORITY/);
    expect(reply).toMatch(/Ahmed Khan \(2 days old, score 82, no open follow-up\)/);
    expect(reply).toMatch(/TODAY\n- 1 appointment scheduled/);
    expect(reply).toMatch(/ATTENTION\n- 2 overdue tasks/);
  });

  it('get_agency_priorities never fabricates a section when there is nothing real to report', () => {
    const reply = buildReply('get_agency_priorities', { hotLeadsNeedingFollowUp: [], appointmentsToday: [], overdueTasks: [] });
    expect(reply).toMatch(/nothing urgent right now/i);
    expect(reply).not.toMatch(/HIGH PRIORITY|TODAY|ATTENTION/);
  });

  it('get_priority_leads explains each lead using only its own real fields', () => {
    const reply = buildReply('get_priority_leads', {
      count: 1,
      leads: [{ customer: 'Sara', city: 'Karachi', score: 91, status: 'hot', pipelineStage: 'contacted', ageDays: 1 }],
    });
    expect(reply).toBe('1 lead matches that:\n- Sara in Karachi: score 91 (hot), contacted, 1 day old.');
  });

  it('get_priority_leads is honest when nothing matches, never invents a lead', () => {
    expect(buildReply('get_priority_leads', { count: 0, leads: [] })).toMatch(/no leads match/i);
  });

  it('get_team_activity lists real per-agent counts only, no invented score', () => {
    const reply = buildReply('get_team_activity', {
      agents: [{ name: 'Bilal', propertyCount: 5, activeLeads: 3, overdueTasks: 2 }, { name: 'Zara', propertyCount: 2, activeLeads: 0, overdueTasks: 0 }],
    });
    expect(reply).toMatch(/Bilal: 5 properties, 3 active leads - 2 overdue tasks/);
    expect(reply).toMatch(/Zara: 2 properties, 0 active leads$/m);
  });

  it('get_property_analytics reply now surfaces the real mostInquired/mostFavorited data instead of a bare count', () => {
    const reply = buildReply('get_property_analytics', {
      totalAvailable: 12,
      mostInquired: [{ title: 'DHA Villa', inquiryCount: 7 }],
      mostFavorited: [{ title: 'Clifton Flat', favoriteCount: 4 }],
    });
    expect(reply).toBe('You have 12 available listings. Most inquiries: "DHA Villa" (7 inquiries). Most saved by customers: "Clifton Flat" (4 favorites).');
  });

  it('get_property_analytics reply degrades gracefully with no invented data when those slices are empty', () => {
    expect(buildReply('get_property_analytics', { totalAvailable: 0, mostInquired: [], mostFavorited: [] })).toBe('You have 0 available listings.');
  });
});
