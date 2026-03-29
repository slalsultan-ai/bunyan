import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new Response('رابط غير صحيح', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const db = getDb();
  const [parent] = await db
    .select()
    .from(parents)
    .where(eq(parents.unsubscribeToken, token))
    .limit(1);

  if (!parent) {
    return new Response(unsubPage('رابط إلغاء الاشتراك غير صحيح أو منتهي الصلاحية.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  await db
    .update(parents)
    .set({ weeklyEmailEnabled: false })
    .where(eq(parents.id, parent.id));

  return new Response(unsubPage('تم إلغاء اشتراكك في البريد الأسبوعي بنجاح.', true), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function unsubPage(message: string, success: boolean): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>بُنيان — إلغاء الاشتراك</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .box { max-width: 400px; background: #fff; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #111827; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${success ? 'تم بنجاح' : 'خطأ'}</h1>
    <p>${message}${success ? ' يمكنك إعادة تفعيله في أي وقت من لوحتك.' : ''}</p>
    <a href="${APP_URL}">العودة لبُنيان</a>
  </div>
</body>
</html>`;
}
