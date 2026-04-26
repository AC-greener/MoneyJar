import { beforeAll, describe, expect, it, vi } from 'vitest';
import { VoiceTransactionService } from '../../src/services/voice-transaction.service';
import {
  seedUser,
  setupIntegrationDb,
  workerEnv,
} from '../helpers/integration';

function createServiceWithAi(run: Ai['run']) {
  return new VoiceTransactionService(workerEnv({
    WORKERS_AI_ENABLED: 'true',
    AI: { run } as Ai,
  }));
}

describe('VoiceTransactionService AI parsing', () => {
  beforeAll(async () => {
    await setupIntegrationDb('voice-transaction-service-unit-setup');
  });

  it('uses deterministic heuristic fallback when Workers AI is disabled', async () => {
    const user = await seedUser();
    const service = new VoiceTransactionService(workerEnv({ WORKERS_AI_ENABLED: 'false' }));

    const result = await service.submit(
      { text: '今天午饭50元', source: 'manual' },
      user.id,
      user.plan
    );

    expect(result.status).toBe('ready_to_commit');
    expect(result.aiMeta.model).toBe('heuristic-fallback');
    expect(result.drafts[0]).toMatchObject({
      amount: 50,
      type: 'expense',
      category: '餐饮',
    });
  });

  it('normalizes and commits a valid mocked Workers AI response', async () => {
    const user = await seedUser();
    const run = vi.fn(async () => ({
      response: JSON.stringify({
        drafts: [
          {
            type: 'expense',
            amount: 42,
            category: '交通',
            note: '打车去机场',
            confidence: 0.934,
            missingFields: [],
          },
        ],
      }),
    })) as Ai['run'];
    const service = createServiceWithAi(run);

    const result = await service.submit(
      { text: '帮我记一笔', source: 'voice' },
      user.id,
      user.plan
    );

    expect(run).toHaveBeenCalledOnce();
    expect(result.status).toBe('ready_to_commit');
    expect(result.aiMeta.model).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(result.drafts[0]).toMatchObject({
      amount: 42,
      type: 'expense',
      category: '交通',
      confidence: 0.93,
    });
    expect(result.drafts[0].note).toBe('打车去机场');
  });

  it.each([
    {
      name: 'invalid JSON',
      run: vi.fn(async () => ({ response: 'not-json' })) as Ai['run'],
    },
    {
      name: 'empty response',
      run: vi.fn(async () => ({ response: ' ' })) as Ai['run'],
    },
    {
      name: 'rejected AI call',
      run: vi.fn(async () => {
        throw new Error('AI unavailable');
      }) as Ai['run'],
    },
  ])('falls back to heuristics after $name', async ({ run }) => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = await seedUser();
    const service = createServiceWithAi(run);

    const result = await service.submit(
      { text: '今天午饭50元', source: 'voice' },
      user.id,
      user.plan
    );

    expect(result.status).toBe('ready_to_commit');
    expect(result.aiMeta.model).toBe('heuristic-fallback');
    expect(result.drafts[0]).toMatchObject({
      amount: 50,
      category: '餐饮',
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
