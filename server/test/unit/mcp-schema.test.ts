import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MCP_LIST_LIMIT,
  MAX_MCP_LIST_LIMIT,
  McpListTransactionsSchema,
} from '../../src/types/mcp';

describe('MCP schema', () => {
  it('should apply the default list limit when period is omitted', () => {
    const parsed = McpListTransactionsSchema.parse({});

    expect(parsed.limit).toBe(DEFAULT_MCP_LIST_LIMIT);
    expect(parsed.period).toBeUndefined();
  });

  it('should reject list limit values greater than the max cap', () => {
    const parsed = McpListTransactionsSchema.safeParse({
      limit: MAX_MCP_LIST_LIMIT + 1,
    });

    expect(parsed.success).toBe(false);
  });
});
