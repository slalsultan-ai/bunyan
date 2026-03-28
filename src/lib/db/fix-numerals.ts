import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { questions } from './schema';

const MAP: Record<string, string> = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
  '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
};

function fix(text: string): string {
  return text.replace(/[٠-٩]/g, d => MAP[d] ?? d);
}

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });
  const db = drizzle(client, { schema: { questions } });

  const rows = await db.select().from(questions);
  let updated = 0;

  for (const q of rows) {
    const newText = fix(q.questionTextAr);
    const newExpl = fix(q.explanationAr);
    const newOpts = (q.options as Array<{ text: string; imageUrl?: string }>).map(o => ({
      ...o,
      text: fix(o.text),
    }));

    const changed =
      newText !== q.questionTextAr ||
      newExpl !== q.explanationAr ||
      JSON.stringify(newOpts) !== JSON.stringify(q.options);

    if (changed) {
      await db.update(questions)
        .set({ questionTextAr: newText, explanationAr: newExpl, options: newOpts })
        .where(eq(questions.id, q.id));
      updated++;
    }
  }

  console.log(`✓ checked ${rows.length} questions, fixed ${updated}`);
  process.exit(0);
}

run().catch(e => { console.error('✗', e.message); process.exit(1); });
