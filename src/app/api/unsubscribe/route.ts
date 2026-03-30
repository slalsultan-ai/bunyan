import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET shows confirmation page — does NOT perform the unsubscribe (prevents prefetch unsubscriptions)
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
    return new Response(unsubPage('رابط إلغاء الاشتراك غير صحيح أو منتهي الصلاحية.', 'error', token), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!parent.weeklyEmailEnabled) {
    return new Response(unsubPage('أنت بالفعل غير مشترك في البريد الأسبوعي.', 'already', token), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(unsubPage('هل تريد إلغاء اشتراكك في البريد الأسبوعي؟', 'confirm', token), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST performs the actual unsubscribe
export async function POST(req: NextRequest) {
  let body: { token?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const token = body.token;
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const db = getDb();
  const [parent] = await db
    .select()
    .from(parents)
    .where(eq(parents.unsubscribeToken, token))
    .limit(1);

  if (!parent) {
    return Response.json({ error: 'Invalid token' }, { status: 404 });
  }

  await db
    .update(parents)
    .set({ weeklyEmailEnabled: false })
    .where(eq(parents.id, parent.id));

  return Response.json({ success: true });
}

function unsubPage(message: string, state: 'confirm' | 'already' | 'error', token: string): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';
  const icon = state === 'error' ? '❌' : state === 'already' ? '✅' : '📧';
  const title = state === 'error' ? 'خطأ' : state === 'already' ? 'تم بالفعل' : 'إلغاء الاشتراك';

  const confirmButton = state === 'confirm' ? `
    <form id="unsub-form" style="margin-bottom: 16px;">
      <button type="submit" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer;">
        تأكيد إلغاء الاشتراك
      </button>
    </form>
    <p id="result" style="color: #059669; font-weight: 700; display: none; margin-bottom: 16px;"></p>
    <script>
      document.getElementById('unsub-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var btn = this.querySelector('button');
        btn.disabled = true;
        btn.textContent = '...';
        fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: '${token}' })
        }).then(function(r) {
          if (r.ok) {
            document.getElementById('unsub-form').style.display = 'none';
            var res = document.getElementById('result');
            res.textContent = 'تم إلغاء اشتراكك بنجاح. يمكنك إعادة تفعيله من لوحتك.';
            res.style.display = 'block';
          } else {
            btn.textContent = 'حدث خطأ، حاول مرة أخرى';
            btn.disabled = false;
          }
        }).catch(function() {
          btn.textContent = 'حدث خطأ، حاول مرة أخرى';
          btn.disabled = false;
        });
      });
    </script>` : '';

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
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${confirmButton}
    <a href="${APP_URL}">العودة لبُنيان</a>
  </div>
</body>
</html>`;
}
