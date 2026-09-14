import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedParent } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';
import { getDb } from '@/lib/db';
import { children } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const enabled = await hasFeatureAccess('parent_dashboard_pro', parent.email, parent.id);
    if (!enabled) return NextResponse.json({ enabled: false });

    const childId = req.nextUrl.searchParams.get('childId');
    if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

    // Verify child belongs to parent
    const [child] = await getDb().select({ id: children.id }).from(children)
      .where(and(eq(children.id, childId), eq(children.parentId, parent.id))).limit(1);
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const db = getDb();
    const goals = await db.select().from(sql`child_goals`)
      .where(sql`child_id = ${childId} AND status = 'active'`) as any[];

    return NextResponse.json({ goals });
  } catch (e) {
    console.error('[goals GET]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const enabled = await hasFeatureAccess('parent_dashboard_pro', parent.email, parent.id);
    if (!enabled) return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });

    const body = await req.json();
    const { childId, goalType, targetValue } = body;

    if (!childId || !goalType || !targetValue) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify child belongs to parent
    const db = getDb();
    const [child] = await db.select({ id: children.id }).from(children)
      .where(and(eq(children.id, childId), eq(children.parentId, parent.id))).limit(1);
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Abandon any existing active goal of same type
    await db.run(sql`UPDATE child_goals SET status = 'abandoned' WHERE child_id = ${childId} AND goal_type = ${goalType} AND status = 'active'`);

    // Create new goal
    const result = await db.run(
      sql`INSERT INTO child_goals (child_id, goal_type, target_value) VALUES (${childId}, ${goalType}, ${targetValue})`
    );

    return NextResponse.json({
      goal: {
        id: Number(result.lastInsertRowid),
        childId,
        goalType,
        targetValue,
        currentValue: null,
        status: 'active',
      },
    });
  } catch (e) {
    console.error('[goals POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const parent = await getAuthenticatedParent();
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const enabled = await hasFeatureAccess('parent_dashboard_pro', parent.email, parent.id);
    if (!enabled) return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });

    const body = await req.json();
    const { goalId, status } = body;

    if (!Number.isInteger(goalId) || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!['abandoned', 'achieved'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const db = getDb();

    // Ownership: the goal must belong to a child of the authenticated parent.
    // child_goals.id is sequential, so without this check any parent could
    // mutate another family's goals by iterating ids (IDOR).
    const owned = await db.all<Record<string, unknown>>(sql`
      SELECT g.id
      FROM child_goals g
      JOIN children c ON c.id = g.child_id
      WHERE g.id = ${goalId} AND c.parent_id = ${parent.id}
      LIMIT 1
    `);

    if (owned.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.run(sql`
      UPDATE child_goals SET status = ${status}
      WHERE id = ${goalId}
        AND child_id IN (SELECT id FROM children WHERE parent_id = ${parent.id})
    `);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[goals PUT]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
