import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const font = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://bunyan-nine.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'بُنيان — منصة تدريب اختبار القدرات للأطفال',
  description: 'جهّز طفلك لاختبار القدرات العامة من سن 4 سنوات — تدريب تفاعلي ممتع بأسئلة كمية ولفظية ومنطقية مصمّمة خصيصاً لكل فئة عمرية',
  keywords: ['اختبار القدرات', 'GAT', 'تعليم أطفال', 'تدريب أطفال', 'قياس', 'Saudi education', 'bunyan', 'بنيان'],
  openGraph: {
    title: 'بُنيان — منصة تدريب القدرات للأطفال',
    description: 'جهّز طفلك لاختبار القدرات من سن 4 سنوات — تدريب تفاعلي ممتع في الكمي واللفظي والمنطقي 🌱',
    locale: 'ar_SA',
    type: 'website',
    siteName: 'بُنيان',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'بُنيان — منصة تدريب القدرات للأطفال',
    description: 'جهّز طفلك لاختبار القدرات من سن 4 سنوات — تدريب تفاعلي ممتع 🌱',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`h-full ${font.variable} ${font.className}`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
