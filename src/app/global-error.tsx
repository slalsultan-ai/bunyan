'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>حدث خطأ غير متوقع</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.</p>
            <button
              onClick={() => unstable_retry()}
              style={{ background: '#059669', color: '#fff', fontWeight: 600, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
