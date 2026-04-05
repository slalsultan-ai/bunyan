import { NextRequest } from 'next/server';
import { encodeShareToken } from '@/lib/share-token';
import { checkRateLimit, getIp } from '@/lib/rate-limit-db';

const VALID_AGE = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);

/**
 * Mint a signed share token for an achievement card.
 * Rate-limited (30/min/IP) — no auth required (tokens are not confidential).
 */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`share-token:${getIp(req)}`, 30, 60);
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const score = typeof b.score === 'number' ? b.score : Number.NaN;
  const total = typeof b.total === 'number' ? b.total : Number.NaN;
  const skill = typeof b.skill === 'string' ? b.skill : '';
  const age = typeof b.age === 'string' ? b.age : '';
  const name = typeof b.name === 'string' ? b.name : undefined;

  if (!Number.isFinite(score) || !Number.isFinite(total) || total < 1 || score < 0 || score > total) {
    return Response.json({ error: 'Invalid score/total' }, { status: 400 });
  }
  if (!VALID_SKILL.has(skill) || !VALID_AGE.has(age)) {
    return Response.json({ error: 'Invalid skill/age' }, { status: 400 });
  }

  const token = encodeShareToken({ n: name, s: score, t: total, sk: skill, a: age });
  return Response.json({ token });
}
