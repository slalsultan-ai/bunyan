import { describe, it, expect } from 'vitest';
import { encodeShareToken, decodeShareToken } from '@/lib/share-token';

describe('share-token', () => {
  it('round-trips a valid payload', () => {
    const token = encodeShareToken({ n: 'عبدالله', s: 8, t: 10, sk: 'quantitative', a: '6-9' });
    const decoded = decodeShareToken(token);
    expect(decoded).toMatchObject({ n: 'عبدالله', s: 8, t: 10, sk: 'quantitative', a: '6-9' });
  });

  it('rejects tokens with tampered payload', () => {
    const token = encodeShareToken({ s: 5, t: 10, sk: 'verbal', a: '4-5' });
    const [body, sig] = token.split('.');
    // Tamper with body → valid JSON but signature mismatch
    const forged = Buffer.from(JSON.stringify({ s: 10, t: 10, sk: 'verbal', a: '4-5' }), 'utf-8')
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeShareToken(`${forged}.${sig}`)).toBeNull();
    void body;
  });

  it('rejects tokens with tampered signature', () => {
    const token = encodeShareToken({ s: 5, t: 10, sk: 'verbal', a: '4-5' });
    const [body] = token.split('.');
    expect(decodeShareToken(`${body}.AAAAAAAAAAAAAAA`)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(decodeShareToken('')).toBeNull();
    expect(decodeShareToken('no-dot')).toBeNull();
    expect(decodeShareToken('too.many.dots')).toBeNull();
    expect(decodeShareToken('valid.badsig')).toBeNull();
  });

  it('clamps score/total within safe bounds', () => {
    const token = encodeShareToken({ s: 999, t: 999, sk: 'mixed', a: '10-12' });
    const decoded = decodeShareToken(token);
    expect(decoded?.s).toBeLessThanOrEqual(100);
    expect(decoded?.t).toBeLessThanOrEqual(100);
  });

  it('truncates long names', () => {
    const longName = 'ا'.repeat(200);
    const token = encodeShareToken({ n: longName, s: 5, t: 10, sk: 'verbal', a: '4-5' });
    const decoded = decodeShareToken(token);
    expect(decoded?.n?.length).toBeLessThanOrEqual(40);
  });
});
