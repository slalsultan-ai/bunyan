import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'بُنيان — منصة تدريب اختبار القدرات للأطفال',
  description: 'منصة تدريب تفاعلية تجهّز طفلك لاختبار القدرات العامة من عمر ٤ سنوات — بأسلوب ممتع يحبه الأطفال',
  keywords: ['اختبار القدرات', 'GAT', 'تعليم أطفال', 'تدريب', 'قياس', 'Saudi education'],
  openGraph: {
    title: 'بُنيان — منصة تدريب اختبار القدرات للأطفال',
    description: 'ابنِ قدرات طفلك من اليوم — تدريب تفاعلي من عمر ٤ سنوات',
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
