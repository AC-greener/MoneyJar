import { describe, expect, it } from 'vitest';
import { sanitizeBody, truncateResponse } from '../../src/middlewares/logger';

describe('Logger Middleware', () => {
  describe('sanitizeBody', () => {
    it('should redact sensitive fields', () => {
      const body = { username: 'test', password: 'secret123', token: 'abc' };
      const result = sanitizeBody(body);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
      expect(result).not.toContain('abc');
    });

    it('should return null for null input', () => {
      expect(sanitizeBody(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(sanitizeBody(undefined)).toBeNull();
    });

    it('should redact apiKey field', () => {
      const body = { amount: 100, apiKey: 'sk-123456' };
      const result = sanitizeBody(body);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('sk-123456');
    });

    it('should redact Authorization header', () => {
      const body = { data: 'test', Authorization: 'Bearer token123' };
      const result = sanitizeBody(body);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('token123');
    });

    it('should handle string input', () => {
      const result = sanitizeBody('plain text');
      expect(result).toBe('plain text');
    });

    it('should truncate long bodies', () => {
      const body = { data: 'a'.repeat(3000) };
      const result = sanitizeBody(body);
      expect(result!.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('truncateResponse', () => {
    it('should return null for null input', () => {
      expect(truncateResponse(null)).toBeNull();
    });

    it('should return original string if within limit', () => {
      const text = 'short response';
      expect(truncateResponse(text, 100)).toBe(text);
    });

    it('should truncate long responses', () => {
      const long = 'a'.repeat(3000);
      const result = truncateResponse(long, 100);
      expect(result).toContain('...[truncated]');
      expect(result!.length).toBeLessThanOrEqual(100 + '...[truncated]'.length);
    });

    it('should use default max length of 1000', () => {
      const long = 'a'.repeat(2000);
      const result = truncateResponse(long);
      expect(result).toContain('...[truncated]');
    });
  });
});
