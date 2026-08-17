const { matchIntent } = require('../../src/features/ai/localEngine/matcher');
const { buildReply } = require('../../src/features/ai/localEngine/templates');
const { TOOL_INTENTS } = require('../../src/features/ai/localEngine/toolIntents');
const { TOOL_DEFINITIONS } = require('../../src/features/ai/ai.tools');

const ALL_TOOLS = TOOL_INTENTS.map((i) => i.tool);
function scoreOf(message) {
  return matchIntent(message, ALL_TOOLS);
}

describe('Phase 5 (Super Admin / Platform AI) - new intents resolve deterministically', () => {
  it.each([
    ['how is the platform doing?', 'get_platform_stats'],
    ['give me a summary of dreamhomes', 'get_platform_stats'],
    ["what's happening across the platform", 'get_platform_stats'],
    ['which agencies are active', 'list_platform_agencies'],
    ['which agencies are on professional', 'list_platform_agencies'],
    ['which agencies are on enterprise', 'list_platform_agencies'],
    ['which agencies need attention', 'get_platform_agency_health'],
    ["today's platform priorities", 'get_platform_priorities'],
    ['which agencies have the most properties', 'get_platform_rankings'],
    ['which agencies have the most inquiries', 'get_platform_rankings'],
    ['which agencies have the largest teams', 'get_platform_rankings'],
  ])('"%s" resolves to %s with a confident score', (message, expectedTool) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe(expectedTool);
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('all 5 Phase 5 tools (3 new + 2 extended) are super_admin only', () => {
    for (const name of ['get_platform_agency_health', 'get_platform_priorities', 'get_platform_rankings', 'get_platform_stats', 'list_platform_agencies']) {
      expect(TOOL_DEFINITIONS[name].roles).toEqual(['super_admin']);
    }
  });

  it('"which agencies are inactive" extracts an honest "not active" filter, not a fabricated status', () => {
    const intent = TOOL_INTENTS.find((i) => i.tool === 'list_platform_agencies');
    expect(intent.extract('which agencies are inactive')).toEqual({ inactiveOnly: true });
  });

  it('list_platform_agencies extracts a real plan filter from natural phrasing', () => {
    const intent = TOOL_INTENTS.find((i) => i.tool === 'list_platform_agencies');
    expect(intent.extract('which agencies are on enterprise')).toEqual({ status: undefined, plan: 'enterprise' });
  });

  it('get_platform_rankings extracts the correct metric from natural phrasing, defaulting to properties', () => {
    const intent = TOOL_INTENTS.find((i) => i.tool === 'get_platform_rankings');
    expect(intent.extract('which agencies have the most properties')).toEqual({ metric: 'properties' });
    expect(intent.extract('which agencies have the most inquiries')).toEqual({ metric: 'inquiries' });
    expect(intent.extract('most favorited properties')).toEqual({ metric: 'favorites' });
    expect(intent.extract('which agencies have the largest teams')).toEqual({ metric: 'agents' });
  });

  it('get_platform_stats keeps its pre-existing triggers unchanged (no regression)', () => {
    expect(scoreOf('platform stats').intent?.tool).toBe('get_platform_stats');
    expect(scoreOf('subscription breakdown').intent?.tool).toBe('get_platform_stats');
  });
});

describe('Phase 5 - reply templates (pure formatting, no fabricated data)', () => {
  it('get_platform_stats now surfaces the real plan breakdown and derived paid/trial/pending counts', () => {
    const reply = buildReply('get_platform_stats', {
      cards: { totalAgencies: 24, activeAgencies: 20, trialAgencies: 4, suspendedAgencies: 1, pendingAgencies: 2, totalProperties: 1284, totalLeads: 500, hotLeads: 60, totalUsers: 300 },
      subscriptionBreakdown: [{ plan: 'starter', count: 11 }, { plan: 'professional', count: 8 }, { plan: 'enterprise', count: 1 }, { plan: 'trial', count: 4 }],
    });
    expect(reply).toMatch(/DreamHomes currently has 24 agencies:/);
    expect(reply).toMatch(/- 11 starter/);
    expect(reply).toMatch(/- 8 professional/);
    expect(reply).toMatch(/- 1 enterprise/);
    expect(reply).toMatch(/- 4 trial/);
    expect(reply).toMatch(/20 active, 4 on trial, 20 paid, 1 suspended, 2 pending approval\./);
    expect(reply).toMatch(/1284 properties, 500 leads \(60 hot\), 300 platform users\./);
  });

  it('get_platform_agency_health lists real flags only, honest empty-state when nothing is flagged', () => {
    expect(buildReply('get_platform_agency_health', { count: 0, agencies: [] })).toMatch(/no agencies are currently flagged/i);
    const reply = buildReply('get_platform_agency_health', {
      count: 1,
      agencies: [{ companyName: 'Agency ABC', flags: ['12 agents but no property listings'] }],
    });
    expect(reply).toBe('1 agency needs a look:\n- Agency ABC: 12 agents but no property listings.');
  });

  it('get_platform_priorities produces HIGH PRIORITY / ATTENTION only when real data supports it', () => {
    const reply = buildReply('get_platform_priorities', {
      pendingTotal: 2, pendingAgencies: [{ companyName: 'New Co' }, { companyName: 'Fresh Agency' }],
      flaggedAgencies: [{ companyName: 'Agency ABC' }],
    });
    expect(reply).toMatch(/^HIGH PRIORITY/);
    expect(reply).toMatch(/2 agencies awaiting approval: New Co, Fresh Agency\./);
    expect(reply).toMatch(/ATTENTION\n- 1 agency needs a look/);
  });

  it('get_platform_priorities is honest when nothing needs attention', () => {
    const reply = buildReply('get_platform_priorities', { pendingTotal: 0, pendingAgencies: [], flaggedAgencies: [] });
    expect(reply).toMatch(/nothing urgent right now/i);
  });

  it('get_platform_rankings never invents revenue/views/ROI - only the real metric and count requested', () => {
    const reply = buildReply('get_platform_rankings', {
      metric: 'inquiries',
      agencies: [{ companyName: 'Agency ABC', count: 40 }, { companyName: 'Agency XYZ', count: 12 }],
    });
    expect(reply).toBe('Agencies ranked by inquiries:\n1. Agency ABC: 40\n2. Agency XYZ: 12');
  });

  it('get_platform_rankings is explicit when no data exists, never fabricates a ranking', () => {
    expect(buildReply('get_platform_rankings', { metric: 'agents', agencies: [] })).toMatch(/isn't currently available/i);
  });

  it('list_platform_agencies now names the real matching agencies instead of a bare count', () => {
    const reply = buildReply('list_platform_agencies', {
      pagination: { total: 2 },
      items: [{ companyName: 'Agency ABC' }, { companyName: 'Agency XYZ' }],
    });
    expect(reply).toBe('2 agencies found: Agency ABC, Agency XYZ.');
  });
});
