import HeroSection from '@/components/landing/HeroSection';
import ValueProps from '@/components/landing/ValueProps';
import HowItWorks from '@/components/landing/HowItWorks';
import AgeGroups from '@/components/landing/AgeGroups';
import StatsSection from '@/components/landing/StatsSection';
import FAQ from '@/components/landing/FAQ';
import FooterCTA from '@/components/landing/FooterCTA';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/progress" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              تقدمي
            </Link>
            <Link href="/worksheet" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              أوراق عمل
            </Link>
            <Link
              href="/practice"
              className="bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <HeroSection />
        <ValueProps />
        <HowItWorks />
        <AgeGroups />
        <StatsSection />
        <FAQ />
        <FooterCTA />
      </main>
    </div>
  );
}
