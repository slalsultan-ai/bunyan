import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, getIp } from '@/lib/rate-limit';

// Rate limiter uses an in-memory Map. Since the module is shared between
// test cases in the same file, use unique keys per test.

let keyCounter = 0;
function uniqueKey() { return `test-key-${++keyCounter}`; }

describe('rateLimit', () => {
  it('allows first request', () => {
    const { allowed } = rateLimit(uniqueKey(), 3, 60_000);
    expect(allowed).toBe(true);
  });

  it('allows up to max requests', () => {
    const key = uniqueKey();
    rateLimit(key, 3, 60_000); // 1
    rateLimit(key, 3, 60_000); // 2
    const { allowed } = rateLimit(key, 3, 60_000); // 3
    expect(allowed).toBe(true);
  });

  it('blocks when limit exceeded', () => {
    const key = uniqueKey();
    rateLimit(key, 2, 60_000); // 1
    rateLimit(key, 2, 60_000); // 2
    const { allowed, retryAfter } = rateLimit(key, 2, 60_000); // 3 — over limit
    expect(allowed).toBe(false);
    expect(retryAfter).toBeGreaterThan(0);
  });

  it('resets after window expires', () => {
    const key = uniqueKey();
    // Window of 1ms — already expired on next check
    rateLimit(key, 1, 1);
    // Sleep briefly to ensure window expires
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    const { allowed } = rateLimit(key, 1, 60_000);
    expect(allowed).toBe(true);
  });

  it('different keys are independent', () => {
    const k1 = uniqueKey();
    const k2 = uniqueKey();
    rateLimit(k1, 1, 60_000);
    rateLimit(k1, 1, 60_000); // k1 over limit
    const { allowed } = rateLimit(k2, 1, 60_000); // k2 first use
    expect(allowed).toBe(true);
  });
});

describe('getIp', () => {
  it('returns first IP from x-forwarded-for', () => {
    const req = { headers: { get: (k: string) => k === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null } };
    expect(getIp(req)).toBe('1.2.3.4');
  });

  it('returns unknown when no header', () => {
    const req = { headers: { get: () => null } };
    expect(getIp(req)).toBe('unknown');
  });

  it('trims whitespace from IP', () => {
    const req = { headers: { get: () => '  9.9.9.9  , 8.8.8.8' } };
    expect(getIp(req)).toBe('9.9.9.9');
  });
});
