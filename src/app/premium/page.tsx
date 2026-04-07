'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

const FREE_FEATURES = [
  '270 سؤال',
  '3 جلسات يومياً',
  'تقرير أساسي',
  'طفل واحد',
  'تتبع التقدم',
  'نظام النقاط والمكافآت',
  '3 فئات عمرية',
];

const PREMIUM_FEATURES = [
  'كل مزايا المجاني',
  '1,000+ سؤال GAT',
  'جلسات غير محدودة',
  'تحدي يومي',
  'مسار ذكي',
  'شروحات تفاعلية',
  'تقارير احترافية',
  'اختبارات محاكاة',
  '5 أطفال',
  'تنبيهات أسبوعية',
  'شخصية بنّاء',
];

const INSTITUTION_FEATURES = [
  { text: 'كل مزايا بُنيان+', soon: false },
  { text: 'لوحة تحكم للمؤسسة', soon: true },
  { text: 'تقارير جماعية', soon: true },
  { text: 'دعم مخصص', soon: false },
];

const FAQ = [
  { q: 'كم سعر الاشتراك اليومي؟', a: 'أقل من ريال باليوم! 90 هللة فقط.' },
  { q: 'هل أقدر ألغي أي وقت؟', a: 'نعم، بدون أي التزام.' },
  { q: 'كم طفل أقدر أضيف؟', a: 'المجاني: طفل واحد. بُنيان+: حتى 5 أطفال.' },
  { q: 'هل فيه ضمان استرداد؟', a: 'نعم، 14 يوم ضمان استرداد كامل.' },
  { q: 'أنا مؤسسة تعليمية، كيف أسجّل؟', a: 'اضغط "تقدّم بطلب منحة" أو تواصل معنا مباشرة.' },
];

const WA_NUMBER = '966503979994';

export default function PremiumPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeResult, setCodeResult] = useState<{
    type: 'success' | 'error' | 'needLogin';
    message: string;
    institutionName?: string;
    expiresAt?: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<{
    isPremium: boolean;
    source?: string;
    expiresAt?: string;
    daysRemaining?: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/premium/status')
      .then(r => {
        if (r.status === 401) { setIsLoggedIn(false); return null; }
        setIsLoggedIn(true);
        return r.json();
      })
      .then(data => { if (data) setPremiumStatus(data); })
      .catch(() => {});
  }, []);

  const plan = isYearly ? 'سنوي 270 ر.س' : 'شهري 27 ر.س';
  const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`أرغب بالاشتراك في بُنيان+ (${plan})`)}`;

  const handleActivateCode = async () => {
    if (!code.trim()) return;
    setCodeLoading(true);
    setCodeResult(null);

    try {
      const validateRes = await fetch('/api/premium/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const validateData = await validateRes.json();

      if (!validateData.valid) {
        setCodeResult({ type: 'error', message: validateData.errorMessage || 'الكود غير صحيح' });
        setCodeLoading(false);
        return;
      }

      if (!isLoggedIn) {
        setCodeResult({
          type: 'needLogin',
          message: 'سجّل حسابك أولاً ثم أدخل الكود',
          institutionName: validateData.institutionName,
        });
        setCodeLoading(false);
        return;
      }

      const activateRes = await fetch('/api/premium/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const activateData = await activateRes.json();

      if (!activateData.success) {
        setCodeResult({ type: 'error', message: activateData.error || 'خطأ في التفعيل' });
      } else {
        setCodeResult({
          type: 'success',
          message: 'تم تفعيل الكود بنجاح!',
          institutionName: activateData.institutionName,
          expiresAt: activateData.expiresAt,
        });
        const statusRes = await fetch('/api/premium/status');
        if (statusRes.ok) setPremiumStatus(await statusRes.json());
      }
    } catch {
      setCodeResult({ type: 'error', message: 'حدث خطأ، حاول مرة أخرى' });
    }
    setCodeLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            الرئيسية
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">خطط الاشتراك</h1>
          <p className="text-gray-600">اختر الخطة المناسبة لطفلك</p>
        </div>

        {/* Cards - items-stretch for equal height */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch mb-12">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-1">مجاني</h2>
            <p className="text-3xl font-bold text-gray-900 mb-4">0 <span className="text-base font-normal text-gray-500">ر.س</span></p>
            <ul className="space-y-3 flex-1 mb-6">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              {isLoggedIn ? (
                <Link
                  href="/practice"
                  className="block w-full text-center py-3 rounded-xl border-2 border-[#0D9255] text-[#0D9255] font-bold hover:bg-emerald-50 transition-colors"
                >
                  استمر بالتدريب
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="block w-full text-center py-3 rounded-xl bg-[#0D9255] text-white font-bold hover:bg-emerald-700 transition-colors"
                >
                  ابدأ مجاناً
                </Link>
              )}
            </div>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 flex flex-col relative shadow-lg shadow-emerald-100">
            <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
              الأكثر شيوعاً
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">بُنيان+</h2>

            {/* Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 mb-4">
              <button
                onClick={() => setIsYearly(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${!isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                شهري
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${isYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                سنوي
              </button>
            </div>

            <div className="mb-4">
              {isYearly ? (
                <>
                  <p className="text-3xl font-bold text-gray-900">270 <span className="text-base font-normal text-gray-500">ر.س/سنة</span></p>
                  <p className="text-emerald-600 text-sm font-medium mt-1">وفّر 54 ر.س — شهرين مجاناً!</p>
                </>
              ) : (
                <p className="text-3xl font-bold text-gray-900">27 <span className="text-base font-normal text-gray-500">ر.س/شهر</span></p>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              {premiumStatus?.isPremium && premiumStatus.source === 'subscription' ? (
                <div className="text-center bg-emerald-50 text-emerald-700 py-3 rounded-xl font-medium text-sm">
                  مشترك ✓ — متبقي {premiumStatus.daysRemaining} يوم
                </div>
              ) : (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-[#0D9255] text-white font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  تواصل معنا
                </a>
              )}
            </div>
          </div>

          {/* Institution */}
          <div className="bg-gray-50 rounded-2xl border border-emerald-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-1">المؤسسات</h2>
            <p className="text-gray-600 text-sm mb-4">مدارس ومراكز وجمعيات — أكواد مخصصة لطلابكم</p>

            <ul className="space-y-3 flex-1 mb-6">
              {INSTITUTION_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>{f.text}{f.soon && <span className="text-gray-400 text-xs mr-1">(قريباً)</span>}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-2">
              <Link
                href="/premium/grant"
                className="block w-full text-center py-3 rounded-xl bg-[#0D9255] text-white font-bold hover:bg-emerald-700 transition-colors"
              >
                تقدّم بطلب منحة
              </Link>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('نحن مؤسسة تعليمية ونرغب بتسجيل طلابنا في بُنيان')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl border-2 border-[#0D9255] text-[#0D9255] font-bold hover:bg-emerald-50 transition-colors"
              >
                تواصل معنا
              </a>
            </div>
          </div>
        </div>

        {/* Code Activation */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">عندك كود مؤسسة؟</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeResult(null); }}
                placeholder="أدخل الكود"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-wider"
                dir="ltr"
              />
              <button
                onClick={handleActivateCode}
                disabled={codeLoading || !code.trim()}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {codeLoading ? '...' : 'تفعيل'}
              </button>
            </div>

            {codeResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm ${
                codeResult.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : codeResult.type === 'needLogin'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {codeResult.type === 'success' && (
                  <div className="text-center space-y-2">
                    <p className="font-bold text-lg">تم تفعيل الكود بنجاح!</p>
                    {codeResult.institutionName && <p>المؤسسة: {codeResult.institutionName}</p>}
                    <p>الباقة: بُنيان+ (كامل)</p>
                    {codeResult.expiresAt && (
                      <p>صالح حتى: {new Date(codeResult.expiresAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                    <Link href="/dashboard" className="inline-block mt-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700">
                      ابدأ التدريب
                    </Link>
                  </div>
                )}
                {codeResult.type === 'needLogin' && (
                  <div className="text-center space-y-2">
                    <p className="font-bold">كود صالح!</p>
                    {codeResult.institutionName && <p>{codeResult.institutionName}</p>}
                    <p>{codeResult.message}</p>
                    <Link href="/auth" className="inline-block mt-2 bg-[#0D9255] text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700">
                      سجّل الآن
                    </Link>
                  </div>
                )}
                {codeResult.type === 'error' && <p className="text-center">{codeResult.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">أسئلة شائعة</h3>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 py-3 text-right flex items-center justify-between text-gray-900 font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  <span>{item.q}</span>
                  <span className="text-gray-400 shrink-0 mr-2">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-gray-600 text-sm">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
