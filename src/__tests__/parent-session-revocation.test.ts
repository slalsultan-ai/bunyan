import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

// Capture the drizzle condition passed to `.where()` so we can assert which
// value is used in the lookup.
const whereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: whereMock }));

vi.mock('@/lib/db', () => ({ getDb: () => ({ delete: deleteMock }) }));

const { invalidateParentSession } = await import('@/lib/parent-auth');

/** Recursively collect bound parameter values from a drizzle SQL condition. */
function collectParams(node: unknown, out: unknown[] = []): unknown[] {
  if (!node || typeof node !== 'object') return out;
  const obj = node as Record<string, unknown>;
  if ('value' in obj) out.push(obj.value);
  const chunks = obj.queryChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) collectParams(chunk, out);
  }
  return out;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('invalidateParentSession', () => {
  beforeEach(() => {
    whereMock.mockReset();
    deleteMock.mockClear();
    whereMock.mockResolvedValue(undefined);
  });

  it('looks the session up by the SHA-256 hash of the raw token, never the raw value', async () => {
    await invalidateParentSession('raw-token-value');

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);

    const params = collectParams(whereMock.mock.calls[0][0]);
    expect(params).toContain(sha256('raw-token-value'));
    expect(params).not.toContain('raw-token-value');
  });
});
