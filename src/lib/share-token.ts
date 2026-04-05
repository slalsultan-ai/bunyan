import crypto from 'node:crypto';

// Stateless, HMAC-signed share tokens for session achievement cards.
// Payload → base64url(JSON).base64url(hmac[0..9])
// The signature prevents casual tampering (inflating scores) but the data is
// not confidential — anyone with the URL can read it.

export interface SharePayload {
  n?: string;         // child name (optional, may be empty)
  s: number;          // score
  t: number;          // total
  sk: string;         // skill area code
  a: string;          // age group
}

function getSecret(): string {
  return (
    process.env.SHARE_TOKEN_SECRET ||
    process.env.PARENT_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    'bunyan-share-dev-secret'
  );
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function sign(data: string): string {
  const mac = crypto.createHmac('sha256', getSecret()).update(data).digest();
  return b64urlEncode(mac.subarray(0, 10));
}

export function encodeShareToken(payload: SharePayload): string {
  const safe: SharePayload = {
    n: payload.n ? payload.n.slice(0, 40) : undefined,
    s: Math.max(0, Math.min(100, Math.floor(payload.s))),
    t: Math.max(1, Math.min(100, Math.floor(payload.t))),
    sk: String(payload.sk).slice(0, 32),
    a: String(payload.a).slice(0, 8),
  };
  const json = JSON.stringify(safe);
  const body = b64urlEncode(Buffer.from(json, 'utf-8'));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function decodeShareToken(token: string): SharePayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = sign(body);
  // Constant-time compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const parsed = JSON.parse(b64urlDecode(body).toString('utf-8'));
    if (
      typeof parsed !== 'object' ||
      typeof parsed.s !== 'number' ||
      typeof parsed.t !== 'number' ||
      typeof parsed.sk !== 'string' ||
      typeof parsed.a !== 'string'
    ) return null;
    return parsed as SharePayload;
  } catch {
    return null;
  }
}
