import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, logAdminAction } from '@/lib/admin-auth';
import { setContent } from '@/lib/content';
import { DEFAULT_MASTERY_CONFIG, MASTERY_CONFIG_KEY, mergeMasteryConfig } from '@/lib/mastery/config';

/** Save threshold overrides. Only keys that differ from the defaults are stored. */
export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { config, rejected } = mergeMasteryConfig(body?.config);
  if (rejected.length > 0) {
    return NextResponse.json({ error: 'قيم غير صالحة', rejected }, { status: 400 });
  }

  const override: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    const def = DEFAULT_MASTERY_CONFIG[key as keyof typeof DEFAULT_MASTERY_CONFIG];
    if (JSON.stringify(value) !== JSON.stringify(def)) override[key] = value;
  }

  await setContent(MASTERY_CONFIG_KEY, override);
  await logAdminAction('admin', 'mastery_config_update', JSON.stringify(override));
  return NextResponse.json({ config, override });
}
