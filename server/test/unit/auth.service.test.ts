import { describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '../../src/services/auth.service';

// 测试用密钥（仅测试环境使用）
const TEST_SECRET = 'test-secret-key-for-unit-tests-only';

// 合法的 UUID v4 格式（Zod v4 严格要求版本位和变体位）
const TEST_UUIDS = {
  u1: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  u2: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  u3: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  u4: '6ba7b811-9dad-41d1-80b4-00c04fd430c8',
  u5: '6ba7b812-9dad-41d1-80b4-00c04fd430c8',
  u6: '6ba7b813-9dad-41d1-80b4-00c04fd430c8',
};

describe('AuthService JWT 功能', () => {
  describe('signJwt', () => {
    it('应该生成有效的 JWT 格式（三段 Base64URL）', async () => {
      const token = await signJwt({ sub: TEST_UUIDS.u1, email: 'test@test.com', plan: 'free' }, TEST_SECRET);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0].length).toBeGreaterThan(0); // header
      expect(parts[1].length).toBeGreaterThan(0); // payload
      expect(parts[2].length).toBeGreaterThan(0); // signature
    });

    it('生成的 JWT payload 应包含正确的 sub、email、plan 字段', async () => {
      const token = await signJwt({ sub: TEST_UUIDS.u2, email: 'user@test.com', plan: 'pro' }, TEST_SECRET);
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      expect(payload.sub).toBe(TEST_UUIDS.u2);
      expect(payload.email).toBe('user@test.com');
      expect(payload.plan).toBe('pro');
    });

    it('生成的 JWT 应包含 iat 和 exp（exp = iat + 900秒）', async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await signJwt({ sub: TEST_UUIDS.u3, email: 'e@test.com', plan: 'free' }, TEST_SECRET);
      const after = Math.floor(Date.now() / 1000);
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect(payload.iat).toBeLessThanOrEqual(after);
      expect(payload.exp).toBe(payload.iat + 900); // 15分钟
    });
  });

  describe('verifyJwt', () => {
    it('应该成功验证合法的 JWT', async () => {
      const token = await signJwt({ sub: TEST_UUIDS.u4, email: 'test@test.com', plan: 'free' }, TEST_SECRET);
      const result = await verifyJwt(token, TEST_SECRET);
      expect(result).not.toBeNull();
      expect(result?.sub).toBe(TEST_UUIDS.u4);
      expect(result?.plan).toBe('free');
    });

    it('错误密钥应导致验证失败', async () => {
      const token = await signJwt({ sub: TEST_UUIDS.u5, email: 'test@test.com', plan: 'free' }, TEST_SECRET);
      const result = await verifyJwt(token, 'wrong-secret');
      expect(result).toBeNull();
    });

    it('格式错误的 token 应返回 null', async () => {
      expect(await verifyJwt('not.a.jwt', TEST_SECRET)).toBeNull();
      expect(await verifyJwt('', TEST_SECRET)).toBeNull();
      expect(await verifyJwt('only-one-part', TEST_SECRET)).toBeNull();
    });

    it('篡改 payload 后应验证失败（签名不匹配）', async () => {
      const token = await signJwt({ sub: TEST_UUIDS.u6, email: 'test@test.com', plan: 'free' }, TEST_SECRET);
      const [header, , sig] = token.split('.');
      const tamperedPayload = btoa(JSON.stringify({ sub: 'hacker', email: 'hacker@evil.com', plan: 'pro', iat: 0, exp: 9999999999 }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
      const result = await verifyJwt(tamperedToken, TEST_SECRET);
      expect(result).toBeNull();
    });
  });
});
