import { getParentSession } from '@/lib/parent-auth';
import { checkPremiumStatus } from '@/lib/premium';

export async function GET() {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'غير مسجّل' }, { status: 401 });
  }

  const status = await checkPremiumStatus(session.parentId);
  return Response.json(status);
}
