import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AClient } from '../../../src/a2a/client/A2AClient.js';
import { AgentRegistry } from '../../../src/a2a/storage/AgentRegistry.js';
import type { TaskResult } from '../../../src/a2a/types/index.js';

describe('A2AClient - Task Result Query', () => {
  let client: A2AClient;
  let registry: AgentRegistry;
  const mockAgentId = 'test-agent-123';
  const mockTaskId = 'task-456';

  beforeEach(() => {
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
    registry = AgentRegistry.getInstance();
    registry.register({
      agentId: mockAgentId,
      baseUrl: 'http://localhost:3000',
      port: 3000,
      status: 'active',
      lastHeartbeat: new Date().toISOString(),
    });
    client = new A2AClient();
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
    vi.restoreAllMocks();
  });

  it('should fetch task result with success status', async () => {
    // Mock fetch response with ServiceResponse wrapper
    const mockTaskResult: TaskResult = {
      taskId: mockTaskId,
      state: 'COMPLETED',
      success: true,
      result: {
        answer: 4,
        calculation: '2 + 2 = 4',
        message: 'Task completed successfully',
      },
      executedAt: '2026-02-05T10:00:00.000Z',
      executedBy: mockAgentId,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        data: mockTaskResult,
      }),
    } as Response);

    const result = await client.getTaskResult(mockAgentId, mockTaskId);

    expect(result).toEqual(mockTaskResult);

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3000/a2a/tasks/${mockTaskId}/result`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer'),
        }),
      })
    );
  });

  it('should fetch task result with failure status', async () => {
    const mockTaskResult: TaskResult = {
      taskId: mockTaskId,
      state: 'FAILED',
      success: false,
      error: 'Division by zero error',
      executedAt: '2026-02-05T10:00:00.000Z',
      executedBy: mockAgentId,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        data: mockTaskResult,
      }),
    } as Response);

    const result = await client.getTaskResult(mockAgentId, mockTaskId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Division by zero error');
  });

  it('should throw error when task result not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: 'TASK_RESULT_NOT_FOUND',
          message: 'Task result not found',
        },
      }),
    } as Response);

    await expect(
      client.getTaskResult(mockAgentId, mockTaskId)
    ).rejects.toThrow('Task result not found');
  });
});
