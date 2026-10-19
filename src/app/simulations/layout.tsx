import type { Metadata } from 'next';

// Simulations are unlisted: anyone with the direct link (/simulations) can
// play, while the ENABLE_SIMULATIONS flag only controls the entry points
// shown in the app (e.g. the banner on /practice).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SimulationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
