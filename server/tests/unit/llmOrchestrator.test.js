// Unit test of the LLM orchestration loop in isolation from real tool
// execution - this codebase's other tests are all real-integration (real
// Mongo, real supertest), with zero jest.mock usage anywhere; mocking
// ai.tools here is a deliberate, narrow exception so this file can
// assert the loop's own logic (iteration/confirmation/error handling)
// fast and without seeding real properties/leads. Full-stack proof
// (real executeTool, real DB, a fake HTTP LLM backend) is a separate
// integration test, not this file's job.
jest.mock('../../src/features/ai/ai.tools', () => ({
  executeTool: jest.fn(),
  TOOL_DEFINITIONS: {
    search_properties: { name: 'search_properties' },
    get_property_details: { name: 'get_property_details' },
    move_lead_stage: { name: 'move_lead_stage', mutates: true },
  },
}));

const { executeTool } = require('../../src/features/ai/ai.tools');
const { buildHelpMessage } = require('../../src/features/ai/localEngine/templates');
const { runLlmTurn, MAX_LLM_ITERATIONS, CAP_REACHED_MESSAGE } = require('../../src/features/ai/llm/orchestrator');

const ctx = { tenantId: null, requester: { id: '507f1f77bcf86cd799439011', name: 'Test Agent', role: 'agent' } };
const toolsForRole = [{ name: 'search_properties', description: 'Search listings', parameters: { type: 'object', properties: {} } }];

function chatResponse(overrides) {
  return { content: null, toolCalls: [], usage: {}, model: 'test-model', ...overrides };
}

describe('runLlmTurn', () => {
  beforeEach(() => {
    executeTool.mockReset();
  });

  it('returns the final answer immediately when the model needs no tools', async () => {
    const provider = { chat: jest.fn().mockResolvedValue(chatResponse({ content: 'Here are some general tips.' })) };

    const result = await runLlmTurn({ message: 'any general advice?', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(result.text).toBe('Here are some general tips.');
    expect(result.attachments).toEqual([]);
    expect(provider.chat).toHaveBeenCalledTimes(1);
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('executes one proposed read tool through the real executeTool gateway, then answers', async () => {
    executeTool.mockResolvedValueOnce({ renderAs: 'property_cards', count: 1, properties: [{ _id: 'p1', city: 'Lahore' }] });
    const provider = {
      chat: jest
        .fn()
        .mockResolvedValueOnce(chatResponse({ toolCalls: [{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }] }))
        .mockResolvedValueOnce(chatResponse({ content: 'Found a property in Lahore.' })),
    };

    const result = await runLlmTurn({ message: 'anything in Lahore?', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(executeTool).toHaveBeenCalledWith('search_properties', { city: 'Lahore' }, ctx);
    expect(result.text).toBe('Found a property in Lahore.');
    expect(result.attachments).toEqual([{ tool: 'search_properties', renderAs: 'property_cards', data: expect.objectContaining({ count: 1 }) }]);
    expect(result.matchedTool).toBe('search_properties');
    // Phase 2's real recordToolExecution ran - not a parallel implementation.
    expect(result.memory.recentToolResults).toHaveLength(1);
    expect(result.memory.entities.propertyId).toBe('p1');
  });

  it('supports a multi-step loop: tool call -> result -> another tool call -> final answer', async () => {
    executeTool
      .mockResolvedValueOnce({ renderAs: 'property_cards', count: 1, properties: [{ _id: 'p1', city: 'Lahore' }] })
      .mockResolvedValueOnce({ renderAs: 'market_insight', averagePrice: 12000000 });
    const provider = {
      chat: jest
        .fn()
        .mockResolvedValueOnce(chatResponse({ toolCalls: [{ id: 'call_1', name: 'search_properties', arguments: { city: 'Lahore' } }] }))
        .mockResolvedValueOnce(chatResponse({ toolCalls: [{ id: 'call_2', name: 'get_property_details', arguments: { propertyId: 'p1' } }] }))
        .mockResolvedValueOnce(chatResponse({ content: 'Here is the property and the market context.' })),
    };

    const result = await runLlmTurn({ message: 'find one in Lahore and tell me about the market', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(result.attachments).toHaveLength(2);
    expect(result.text).toBe('Here is the property and the market context.');
    expect(provider.chat).toHaveBeenCalledTimes(3);
  });

  it('stages a mutating tool call as a pending confirmation instead of executing it', async () => {
    const provider = {
      chat: jest.fn().mockResolvedValue(chatResponse({ toolCalls: [{ id: 'call_1', name: 'move_lead_stage', arguments: { inquiryId: 'i1', stage: 'closed_won' } }] })),
    };

    const result = await runLlmTurn({ message: 'mark that lead as won', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(executeTool).not.toHaveBeenCalled();
    expect(result.memory.pendingAction).toEqual({ tool: 'move_lead_stage', args: { inquiryId: 'i1', stage: 'closed_won' } });
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('stops gracefully at MAX_LLM_ITERATIONS instead of looping forever', async () => {
    executeTool.mockResolvedValue({ renderAs: 'property_cards', count: 0, properties: [] });
    const provider = {
      chat: jest.fn().mockResolvedValue(chatResponse({ toolCalls: [{ id: 'call_x', name: 'search_properties', arguments: {} }] })),
    };

    const result = await runLlmTurn({ message: 'keep searching', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(provider.chat).toHaveBeenCalledTimes(MAX_LLM_ITERATIONS);
    expect(result.text).toBe(CAP_REACHED_MESSAGE);
  });

  it('falls back to the existing help message (never throws) when the provider call fails', async () => {
    const provider = { chat: jest.fn().mockRejectedValue(new Error('network unreachable')) };

    const result = await runLlmTurn({ message: 'houses in Multan', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(result.text).toBe(buildHelpMessage(ctx.requester.role, toolsForRole));
    expect(result.attachments).toEqual([]);
  });

  it('feeds a tool error result back into the loop instead of crashing the turn', async () => {
    executeTool.mockResolvedValueOnce({ error: 'Property not found.' });
    const provider = {
      chat: jest
        .fn()
        .mockResolvedValueOnce(chatResponse({ toolCalls: [{ id: 'call_1', name: 'get_property_details', arguments: { propertyId: 'bad-id' } }] }))
        .mockResolvedValueOnce(chatResponse({ content: 'That property could not be found.' })),
    };

    const result = await runLlmTurn({ message: 'tell me about property bad-id', ctx, memory: {}, recentMessages: [], toolsForRole, provider });

    expect(result.text).toBe('That property could not be found.');
    expect(result.attachments).toEqual([]);
    const secondCallMessages = provider.chat.mock.calls[1][0].messages;
    expect(secondCallMessages.some((m) => m.role === 'tool' && m.content.includes('Property not found.'))).toBe(true);
  });
});
