const { PERSONAS, getPersona } = require('../../src/features/ai/llm/personas');

const KNOWN_ROLES = ['customer', 'agent', 'agency_admin', 'super_admin'];

describe('llm personas', () => {
  it('defines exactly the four known roles', () => {
    expect(Object.keys(PERSONAS).sort()).toEqual([...KNOWN_ROLES].sort());
  });

  it.each(KNOWN_ROLES)('returns a non-empty, distinct persona for role "%s"', (role) => {
    const persona = getPersona(role);
    expect(typeof persona.guidance).toBe('string');
    expect(persona.guidance.length).toBeGreaterThan(0);
  });

  it('every persona is textually distinct from every other persona', () => {
    const texts = KNOWN_ROLES.map((role) => getPersona(role).guidance);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('falls back to the customer persona for an unrecognized role, rather than throwing', () => {
    expect(getPersona('some_future_role')).toBe(PERSONAS.customer);
    expect(getPersona(undefined)).toBe(PERSONAS.customer);
  });

  it('never mentions tool names or permission/authorization language - personas are tone/wording only, never a second permission system', () => {
    const toolNameFragments = ['search_properties', 'move_lead_stage', 'executeTool', 'TOOL_DEFINITIONS', 'getToolsForRole'];
    const permissionWords = /\b(allowed to use|authorized|permission|access to)\b/i;
    for (const role of KNOWN_ROLES) {
      const { guidance } = getPersona(role);
      for (const fragment of toolNameFragments) expect(guidance).not.toContain(fragment);
      expect(guidance).not.toMatch(permissionWords);
    }
  });

  it.each([
    ['customer', /propert/i],
    ['agent', /lead/i],
    ['agency_admin', /business|performance|pipeline/i],
    ['super_admin', /platform/i],
  ])('the %s persona is actually about its stated focus area', (role, expectedPattern) => {
    expect(getPersona(role).guidance).toMatch(expectedPattern);
  });

  // helpIntro/helpExample/greetingHint (fallback/help + greeting) are the
  // deterministic engine's share of this same persona object - both
  // engines must read from one source, never two independently-drifting
  // definitions of "how does this role get talked to".
  describe('deterministic-engine fields (helpIntro / helpExample / greetingHint)', () => {
    it.each(KNOWN_ROLES)('role "%s" has all three non-empty', (role) => {
      const persona = getPersona(role);
      for (const field of ['helpIntro', 'helpExample', 'greetingHint']) {
        expect(typeof persona[field]).toBe('string');
        expect(persona[field].length).toBeGreaterThan(0);
      }
    });

    it.each(['helpIntro', 'helpExample', 'greetingHint'])('%s is textually distinct across all four roles', (field) => {
      const texts = KNOWN_ROLES.map((role) => getPersona(role)[field]);
      expect(new Set(texts).size).toBe(texts.length);
    });

    // Directly tests "never suggest actions the current role cannot
    // perform": each role's own help/greeting text must never reference
    // vocabulary that belongs to a *different* role's world.
    const ROLE_EXCLUSIVE_VOCAB = {
      customer: [/\blead/i, /\bCRM\b/i, /\btenant management\b/i, /\bplatform-wide\b/i, /\brevenue\b/i],
      agent: [/\btenant management\b/i, /\bplatform statistics\b/i, /\bbilling\b/i, /\ball agencies\b/i],
      agency_admin: [/\btenant management\b/i, /\bplatform statistics\b/i, /\bsystem health\b/i],
      super_admin: [/\bschedule a visit\b/i, /\bfollow-up task\b/i],
    };
    it.each(KNOWN_ROLES)('role "%s" help/greeting text never mentions another role\'s exclusive vocabulary', (role) => {
      const persona = getPersona(role);
      const text = `${persona.helpIntro} ${persona.helpExample} ${persona.greetingHint}`;
      for (const forbidden of ROLE_EXCLUSIVE_VOCAB[role]) {
        expect(text).not.toMatch(forbidden);
      }
    });
  });
});
