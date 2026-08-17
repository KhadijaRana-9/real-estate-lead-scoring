const { buildSystemPrompt, REASONING_INSTRUCTIONS, INSIGHT_INSTRUCTIONS } = require('../../src/features/ai/llm/prompts');

describe('INSIGHT_INSTRUCTIONS (Phase 6)', () => {
  it('is present in every generated system prompt, regardless of role/persona/memory', () => {
    const prompt = buildSystemPrompt({ role: 'agent', memory: {}, persona: 'some persona text' });
    expect(prompt).toContain(INSIGHT_INSTRUCTIONS);
  });

  it('is present even with no persona or memory supplied', () => {
    const prompt = buildSystemPrompt({ role: 'agency_admin', memory: {} });
    expect(prompt).toContain(INSIGHT_INSTRUCTIONS);
  });

  it('never removes or shortens BASE_INSTRUCTIONS or REASONING_INSTRUCTIONS - purely additive', () => {
    const prompt = buildSystemPrompt({ role: 'customer', memory: {} });
    expect(prompt).toContain(REASONING_INSTRUCTIONS);
    // BASE_INSTRUCTIONS isn't exported directly by name in Phase 5, but a
    // stable substring from it proves the grounding rule wasn't dropped.
    expect(prompt).toContain('never invent property details, prices, IDs, or statistics');
  });

  it('names the real backend-computed priority/overdue signals, not invented ones', () => {
    for (const realField of ['status', 'overdueTasks', 'dueSoonTasks', 'createdAt/updatedAt', 'trust score']) {
      expect(INSIGHT_INSTRUCTIONS).toContain(realField);
    }
  });

  it('explicitly forbids fabricated metrics/rankings/calculations this app has never computed', () => {
    expect(INSIGHT_INSTRUCTIONS).toMatch(/ROI, rental yield, investment score, or appreciation/i);
    expect(INSIGHT_INSTRUCTIONS).toMatch(/fabricated numeric urgency or staleness score/i);
    expect(INSIGHT_INSTRUCTIONS).toMatch(/never invent a ranking/i);
    expect(INSIGHT_INSTRUCTIONS).toMatch(/lead volume, AI usage, or automation usage/i);
  });

  it('requires stating explicitly when insufficient information exists, rather than filling gaps', () => {
    expect(INSIGHT_INSTRUCTIONS).toMatch(/say so explicitly rather than filling the gap with a plausible-sounding guess/i);
  });

  it('permits multi-tool synthesis for broad summaries while keeping every statement traceable', () => {
    expect(INSIGHT_INSTRUCTIONS).toMatch(/call more than one relevant tool/i);
    expect(INSIGHT_INSTRUCTIONS).toMatch(/every statement in that summary must still be traceable/i);
  });
});
