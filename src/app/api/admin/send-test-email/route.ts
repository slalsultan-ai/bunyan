import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { sendWeeklyEmail } from '@/lib/email/weekly';
import { getWeeklyContent } from '@/lib/db/seed-weekly-content';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: string; weekNumber?: number; ageGroup?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'البريد الإلكتروني غير صحيح' }, { status: 400 });
  }

  const weekNumber = body.weekNumber != null ? Number(body.weekNumber) : 1;
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 8) {
    return NextResponse.json({ error: 'رقم الأسبوع يجب أن يكون بين 1 و 8' }, { status: 400 });
  }

  const ageGroup = (body.ageGroup || '6-9') as '4-5' | '6-9' | '10-12';
  if (!['4-5', '6-9', '10-12'].includes(ageGroup)) {
    return NextResponse.json({ error: 'الفئة العمرية غير صحيحة' }, { status: 400 });
  }

  const content = await getWeeklyContent(weekNumber, ageGroup);
  if (!content) {
    // Seed hasn't run yet — try seeding first
    const { seedWeeklyContent } = await import('@/lib/db/seed-weekly-content');
    await seedWeeklyContent();
    const seeded = await getWeeklyContent(weekNumber, ageGroup);
    if (!seeded) {
      return NextResponse.json({ error: 'لا يوجد محتوى لهذا الأسبوع والفئة العمرية' }, { status: 404 });
    }
  }

  const finalContent = content || (await getWeeklyContent(weekNumber, ageGroup));

  try {
    const emailId = await sendWeeklyEmail(
      email,
      weekNumber,
      [{ name: 'طفل تجريبي', age: ageGroup === '4-5' ? 5 : ageGroup === '6-9' ? 7 : 11, ageGroup, content: finalContent }],
      'test-unsubscribe-token',
    );
    return NextResponse.json({ success: true, emailId });
  } catch (err) {
    console.error('Test email failed:', err);
    return NextResponse.json({ error: 'فشل إرسال البريد. تحقق من إعدادات Resend.' }, { status: 500 });
  }
}
