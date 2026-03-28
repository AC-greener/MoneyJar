/// <reference path="../../worker-configuration.d.ts" />
import { describe, expect, it, vi } from 'vitest';
import { cleanupOldLogs } from '../../src/services/retention.service';

describe('Log Retention', () => {
  it('should delete logs older than 30 days', async () => {
    const mockEnv = {
      DB: {
        prepare: (sql: string) => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 5 } }),
          }),
        }),
      },
    } as unknown as CloudflareBindings;

    const result = await cleanupOldLogs(mockEnv, 30);
    expect(result.deleted).toBe(5);
  });

  it('should handle empty result', async () => {
    const mockEnv = {
      DB: {
        prepare: (sql: string) => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 0 } }),
          }),
        }),
      },
    } as unknown as CloudflareBindings;

    const result = await cleanupOldLogs(mockEnv, 30);
    expect(result.deleted).toBe(0);
  });
});
