import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parents } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const parentId = req.nextUrl.searchParams.get('parentId');
  if (!parentId) {
    return new Response(renderPage('error', 'رابط غير صالح'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const db = getDb();

  // Check if already unsubscribed
  const [existing] = await db
    .select()
    .from(sql`digest_unsubscribe`)
    .where(sql`parent_id = ${parentId}`)
    .limit(1) as any[];

  if (existing) {
    return new Response(renderPage('already', ''), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // Show confirmation page
  return new Response(renderPage('confirm', parentId), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'Missing parentId' }, { status: 400 });
    }

    const db = getDb();

    // Verify parent exists
    const [parent] = await db.select({ id: parents.id }).from(parents).where(eq(parents.id, parentId)).limit(1);
    if (!parent) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Insert unsubscribe record
    await db.run(sql`INSERT OR IGNORE INTO digest_unsubscribe (parent_id) VALUES (${parentId})`);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[digest unsubscribe]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function renderPage(state: 'confirm' | 'already' | 'error', parentId: string): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bunyan.guru';

  if (state === 'already') {
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إلغاء الاشتراك</title></head>
<body style="margin:0;padding:40px 20px;background:#F3F4F6;font-family:system-ui,sans-serif;text-align:center;">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<p style="font-size:40px;margin:0 0 16px;">✅</p>
<h1 style="font-size:18px;color:#374151;margin:0 0 8px;">تم إلغاء الاشتراك مسبقاً</h1>
<p style="font-size:14px;color:#6B7280;">لن تصلك رسائل الملخص الأسبوعي.</p>
<a href="${APP_URL}" style="display:inline-block;margin-top:20px;color:#059669;font-size:14px;">الرجوع لبُنيان</a>
</div></body></html>`;
  }

  if (state === 'error') {
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>خطأ</title></head>
<body style="margin:0;padding:40px 20px;background:#F3F4F6;font-family:system-ui,sans-serif;text-align:center;">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
<p style="font-size:40px;margin:0 0 16px;">❌</p>
<h1 style="font-size:18px;color:#374151;">رابط غير صالح</h1>
</div></body></html>`;
  }

  // Confirmation page
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إلغاء الاشتراك</title></head>
<body style="margin:0;padding:40px 20px;background:#F3F4F6;font-family:system-ui,sans-serif;text-align:center;">
<div id="content" style="max-width:400px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<p style="font-size:40px;margin:0 0 16px;">📧</p>
<h1 style="font-size:18px;color:#374151;margin:0 0 8px;">إلغاء الاشتراك في الملخص الأسبوعي</h1>
<p style="font-size:14px;color:#6B7280;margin:0 0 24px;">لن تصلك رسائل الملخص الأسبوعي بعد الآن.</p>
<button id="btn" onclick="doUnsubscribe()" style="background:#DC2626;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
  تأكيد إلغاء الاشتراك
</button>
<br><a href="${APP_URL}" style="display:inline-block;margin-top:16px;color:#6B7280;font-size:13px;text-decoration:none;">إلغاء</a>
</div>
<script>
async function doUnsubscribe() {
  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'جاري الإلغاء...';
  try {
    const res = await fetch('/api/digest/unsubscribe', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({parentId:'${parentId}'})
    });
    if (res.ok) {
      document.getElementById('content').innerHTML = '<p style="font-size:40px;margin:0 0 16px;">✅</p><h1 style="font-size:18px;color:#374151;">تم إلغاء الاشتراك بنجاح</h1><p style="font-size:14px;color:#6B7280;">لن تصلك رسائل الملخص الأسبوعي.</p><a href="${APP_URL}" style="display:inline-block;margin-top:20px;color:#059669;font-size:14px;">الرجوع لبُنيان</a>';
    } else {
      btn.textContent = 'حدث خطأ — حاول مرة أخرى';
      btn.disabled = false;
    }
  } catch { btn.textContent = 'خطأ في الاتصال'; btn.disabled = false; }
}
</script>
</body></html>`;
}
