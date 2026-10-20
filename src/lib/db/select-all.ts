import { sql, type SQL } from 'drizzle-orm';
import type { getDb } from './index';

type Db = ReturnType<typeof getDb>;

/**
 * `SELECT * FROM <table>` for tables without a Drizzle schema.
 *
 * drizzle-orm 0.45 renders `db.select().from(sql\`table\`)` as
 * "select  from table" (an empty column list), which SQLite rejects — that
 * silently broke the daily challenge, mock tests, goals and digests.
 * Supports the same chain those call sites used: where / orderBy / limit.
 */
export function selectAllFrom(db: Db, table: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error(`Invalid table name: ${table}`);
  let where: SQL | undefined;
  let orderBy: SQL | undefined;
  let limit: number | undefined;

  const run = () => {
    const query = sql`SELECT * FROM ${sql.raw(table)}`;
    if (where) query.append(sql` WHERE `).append(where);
    if (orderBy) query.append(sql` ORDER BY `).append(orderBy);
    if (limit !== undefined) query.append(sql` LIMIT ${limit}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return db.all<any>(query);
  };

  const builder = {
    where(condition: SQL) { where = condition; return builder; },
    orderBy(order: SQL) { orderBy = order; return builder; },
    limit(n: number) { limit = n; return builder; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then<A = any[], B = never>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onFulfilled?: ((rows: any[]) => A | PromiseLike<A>) | null,
      onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return run().then(onFulfilled, onRejected);
    },
  };
  return builder;
}
