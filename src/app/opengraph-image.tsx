import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'بُنيان — منصة تدريب القدرات للأطفال';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fontData = await readFile(
    join(process.cwd(), 'assets/NotoSansArabic-Bold.woff2')
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(145deg, #064e3b 0%, #065f46 60%, #047857 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'NotoArabic',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative circles background */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 40, left: 60, width: 120, height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: '50%', display: 'flex' }} />

        {/* Logo */}
        <div style={{
          width: 110, height: 110,
          background: 'rgba(255,255,255,0.18)',
          border: '3px solid rgba(255,255,255,0.35)',
          borderRadius: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 60, fontWeight: 900, color: 'white',
          marginBottom: 28,
        }}>
          ب
        </div>

        {/* Title */}
        <div style={{ fontSize: 80, fontWeight: 900, color: 'white', marginBottom: 12, letterSpacing: -1 }}>
          بُنيان
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.85)', marginBottom: 48, textAlign: 'center' }}>
          منصة تدريب القدرات للأطفال
        </div>

        {/* Age group badges */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: '4 — 5 سنوات', emoji: '🌱' },
            { label: '6 — 9 سنوات', emoji: '🌿' },
            { label: '10 — 12 سنة', emoji: '🌳' },
          ].map(({ label, emoji }) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '14px 28px',
                color: 'white',
                fontSize: 24,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute', bottom: 32,
          color: 'rgba(255,255,255,0.5)',
          fontSize: 20,
        }}>
          bunyan.app
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'NotoArabic', data: fontData, weight: 700, style: 'normal' }],
    }
  );
}
