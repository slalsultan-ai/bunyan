import { notFound } from 'next/navigation';
import { getParentSession } from '@/lib/parent-auth';
import { hasFeatureAccess } from '@/lib/feature-flags';

export default async function SimulationsLayout({ children }: { children: React.ReactNode }) {
  const session = await getParentSession();
  const enabled = await hasFeatureAccess('ENABLE_SIMULATIONS', session?.email, session?.parentId);

  // The flag protects direct routes as well as navigation entry points.
  if (!enabled) notFound();

  return children;
}
