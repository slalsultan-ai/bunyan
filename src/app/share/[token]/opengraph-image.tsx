import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeShareToken } from '@/lib/share-token';

export const alt = 'إنجاز في بُنيان';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SKILL_LABEL: Record<string, string> = {
  quantitative: 'كمي',
  verbal: 'لفظي',
  logical_patterns: 'تفكير منطقي',
  mixed: 'مزيج',
};

interface Props {
  params: Promise<{ token: string }> | { token: string };
}

export default async function Image({ params }: Props) {
  const { token } = await Promise.resolve(params);
  const fontData = await readFile(join(process.cwd(), 'assets/IBMPlexSansArabic-Bold.ttf'));
  const payload = decodeShareToken(token);

  const name = payload?.n || 'الطفل';
  const score = payload?.s ?? 0;
  const total = payload?.t ?? 10;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const skillLabel = payload ? (SKILL_LABEL[payload.sk] ?? 'مهارة') : 'مهارة';
  const ageGroup = payload?.a ?? '';

  const isPerfect = pct === 100;
  const gradientFrom = pct >= 80 ? '#065f46' : pct >= 60 ? '#92400e' : '#991b1b';
  const gradientTo = pct >= 80 ? '#047857' : pct >= 60 ? '#d97706' : '#dc2626';
  const emoji = isPerfect ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: `linear-gradient(145deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'NotoArabic',
          position: 'relative', overflow: 'hidden',
          padding: 60,
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 360, height: 360, background: 'rgba(255,255,255,0.06)', borderRadius: '50%', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, background: 'rgba(255,255,255,0.06)', borderRadius: '50%', display: 'flex' }} />

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32, color: 'rgba(255,255,255,0.85)' }}>
          <div style={{
            width: 50, height: 50,
            background: 'rgba(255,255,255,0.20)',
            border: '2px solid rgba(255,255,255,0.35)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 900, color: 'white',
          }}>ب</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>بُنيان</div>
        </div>

        {/* Trophy */}
        <div style={{ fontSize: 110, marginBottom: 6, display: 'flex' }}>{emoji}</div>

        {/* Name */}
        <div style={{ fontSize: 48, fontWeight: 900, color: 'white', marginBottom: 8 }}>
          {name}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)', marginBottom: 28 }}>
          حقّق إنجازاً في بُنيان
        </div>

        {/* Big score */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          border: '3px solid rgba(255,255,255,0.3)',
          borderRadius: 32,
          padding: '24px 56px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {pct}%
          </div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
            {score} من {total} سؤال
          </div>
        </div>

        {/* Skill + age */}
        <div style={{
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 100,
          padding: '12px 32px',
          color: 'white',
          fontSize: 24,
          fontWeight: 700,
          display: 'flex',
        }}>
          {skillLabel}{ageGroup ? ` — ${ageGroup} سنوات` : ''}
        </div>

        {/* Bottom url */}
        <div style={{
          position: 'absolute', bottom: 32,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 22,
          display: 'flex',
        }}>
          bunyan.guru
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'NotoArabic', data: fontData, weight: 700, style: 'normal' }],
    }
  );
}
