import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { decodeShareToken } from '@/lib/share-token';
import { getSkillAreaLabel } from '@/lib/utils';
import type { SkillArea } from '@/types';

interface Props {
  params: Promise<{ token: string }>;
}

const SKILL_EMOJI: Record<string, string> = {
  quantitative: '🔢',
  verbal: '📚',
  logical_patterns: '🧩',
  mixed: '🎯',
};

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://bunyan.guru'
  ).replace(/\/$/, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const payload = decodeShareToken(token);
  if (!payload) return { title: 'بُنيان', robots: { index: false } };

  const pct = Math.round((payload.s / payload.t) * 100);
  const name = payload.n || 'طفلنا';
  const title = `${name} حقّق ${pct}% في بُنيان 🌟`;
  const description = `${payload.s} من ${payload.t} في اختبار ${getSkillAreaLabel(payload.sk as SkillArea)} — منصة تدريب القدرات للأطفال`;

  const url = `${getBaseUrl()}/share/${token}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'بُنيان', locale: 'ar' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const payload = decodeShareToken(token);
  if (!payload) notFound();

  const pct = Math.round((payload.s / payload.t) * 100);
  const name = payload.n || 'الطفل';
  const skillLabel = getSkillAreaLabel(payload.sk as SkillArea);
  const emoji = SKILL_EMOJI[payload.sk] ?? '🎯';

  const scoreColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = pct >= 80 ? 'from-emerald-500 to-emerald-700' : pct >= 60 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';
  const scoreEmoji = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';

  const shareText = `${name} حقّق ${pct}% في بُنيان ${scoreEmoji}\n\nجرّب بُنيان لطفلك: ${getBaseUrl()}/share/${token}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Achievement card */}
        <div className={`bg-gradient-to-br ${scoreBg} rounded-3xl p-8 text-white shadow-2xl mb-6`}>
          <div className="text-5xl text-center mb-2">{scoreEmoji}</div>
          <p className="text-white/90 text-center text-sm mb-2">إنجاز في بُنيان</p>
          <h1 className="text-2xl font-extrabold text-center mb-4">{name}</h1>

          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 mb-4">
            <div className="text-center">
              <div className="text-6xl font-black mb-1">{pct}%</div>
              <div className="text-white/90 text-sm">{payload.s} من {payload.t} سؤال</div>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span className="font-bold">اختبار {skillLabel}</span>
            <span className="text-white/70 text-sm">— {payload.a} سنوات</span>
          </div>
        </div>

        {/* Share buttons */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all mb-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488"/>
          </svg>
          <span>شارك عبر واتساب</span>
        </a>

        <Link
          href="/practice"
          className="block w-full text-center bg-white border-2 border-emerald-600 text-emerald-700 font-bold py-3 rounded-2xl hover:bg-emerald-50 transition-colors mb-6"
        >
          جرّب بُنيان لطفلك 🚀
        </Link>

        <p className="text-center text-gray-500 text-xs">
          {scoreColor && ''}
          <Link href="/" className="text-emerald-600 font-semibold">bunyan.guru</Link>
          {' — كل بُنيان يبدأ بلبنة'}
        </p>
      </div>
    </div>
  );
}
