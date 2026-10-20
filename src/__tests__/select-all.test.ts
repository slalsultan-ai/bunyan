import { describe, it, expect, vi } from 'vitest';
import { sql, SQLiteSyncDialect } from './helpers/sqlite-dialect';
import { selectAllFrom } from '@/lib/db/select-all';

function fakeDb() {
  const all = vi.fn(async (_query: unknown) => [{ id: 1 }]);
  return { db: { all } as never, all };
}

const render = (q: unknown) => new SQLiteSyncDialect().sqlToQuery(q as never);

describe('selectAllFrom', () => {
  it('renders SELECT * with where / order / limit and bound params', async () => {
    const { db, all } = fakeDb();
    const rows = await selectAllFrom(db, 'daily_challenges')
      .where(sql`age_group = ${'6-9'}`)
      .orderBy(sql`challenge_date DESC`)
      .limit(1);
    expect(rows).toEqual([{ id: 1 }]);
    const { sql: text, params } = render(all.mock.calls[0][0]);
    expect(text).toBe('SELECT * FROM daily_challenges WHERE age_group = ? ORDER BY challenge_date DESC LIMIT ?');
    expect(params).toEqual(['6-9', 1]);
  });

  it('works without any clauses', async () => {
    const { db, all } = fakeDb();
    await selectAllFrom(db, 'mock_tests');
    expect(render(all.mock.calls[0][0]).sql).toBe('SELECT * FROM mock_tests');
  });

  it('rejects unsafe table names', () => {
    const { db } = fakeDb();
    expect(() => selectAllFrom(db, 'x; DROP TABLE y')).toThrow();
  });
});
