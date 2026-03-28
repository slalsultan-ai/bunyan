import { getDb } from './db';
import { siteContent } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { sanitizeHeroContent, sanitizeFaqContent } from './content-sanitize';

export type HeroContent = {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  ctaPrimary: string;
};

export type FaqItem = { q: string; a: string };
export type FaqContent = FaqItem[];

export const DEFAULT_HERO: HeroContent = {
  badge: 'مجاني لفترة محدودة — سجّل الآن واستفد!',
  title: 'ابنِ قدرات طفلك',
  titleHighlight: 'من اليوم',
  subtitle: 'منصة تدريب تفاعلية تجهّز طفلك لاختبار القدرات العامة من عمر <strong>4 سنوات</strong> — بأسلوب ممتع يحبه الأطفال',
  ctaPrimary: 'ابدأ التدريب الآن — مجاناً 🚀',
};

export const DEFAULT_FAQ: FaqContent = [
  {
    q: 'هل هذا اختبار القدرات الفعلي؟',
    a: 'لا. بُنيان منصة تدريب تبني المهارات الأساسية التي يحتاجها طفلك للتفوق في اختبار القدرات مستقبلاً — التفكير النقدي والتحليلي والاستنتاج، لا الحفظ.',
  },
  {
    q: 'من أي عمر يبدأ طفلي؟',
    a: 'من عمر 4 سنوات! الأسئلة مصممة لكل فئة عمرية — الصغار يتعلمون بالصور والأشكال، والكبار يتدربون على أسئلة أقرب لاختبار القدرات الفعلي.',
  },
  {
    q: 'هل المنصة فعلاً مجانية؟',
    a: 'نعم، مجانية بالكامل حالياً. نخطط لإضافة باقات مدفوعة مستقبلاً مع ميزات إضافية — لكن التدريب الأساسي سيبقى مجانياً.',
  },
  {
    q: 'كم سؤال في كل جلسة؟',
    a: '10 أسئلة لكل جلسة تدريبية، مع شرح مفصل لكل إجابة يساعد الطفل على الفهم الحقيقي.',
  },
  {
    q: 'هل أقدر أطبع الأسئلة؟',
    a: 'نعم! يمكنك توليد أوراق عمل PDF مصممة وطباعتها لطفلك ليحلها بقلم وورق — تجربة تعليمية بدون شاشة.',
  },
  {
    q: 'هل يحتاج طفلي حساباً للتسجيل؟',
    a: 'لا! طفلك يبدأ التدريب فوراً بضغطة زر واحدة — لا بريد إلكتروني ولا كلمة مرور ولا أي بيانات شخصية.',
  },
];

async function fetchContent<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, key));
    return row ? (row.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function getHeroContent() {
  return fetchContent<unknown>('hero', DEFAULT_HERO).then(
    (value) => sanitizeHeroContent(value) ?? DEFAULT_HERO
  );
}

export function getFaqContent() {
  return fetchContent<unknown>('faq', DEFAULT_FAQ).then(
    (value) => sanitizeFaqContent(value) ?? DEFAULT_FAQ
  );
}

export async function setContent(key: string, value: unknown): Promise<void> {
  const db = getDb();
  await db
    .insert(siteContent)
    .values({ key, value: value as never })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value: value as never, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}
