'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Logo from '@/components/ui/Logo';
import OTPInput from '@/components/auth/OTPInput';
import Link from 'next/link';

type Step = 'email' | 'otp';

function AuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); return; }
      setStep('otp');
      setCountdown(60);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code: string) {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'حدث خطأ'); return; }
      if (data.isNewUser) {
        router.push('/auth/onboarding');
      } else {
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(val: string) {
    setOtp(val);
    if (val.length === 6) verifyOtp(val);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="md" className="justify-center mb-4" />
          <p className="text-gray-600 text-sm">
            {step === 'email' ? 'سجّل أو ادخل برقم بريدك الإلكتروني' : `أدخل الرمز المرسل إلى ${email}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          {step === 'email' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  dir="ltr"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </span>
                ) : 'إرسال رمز التحقق'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-center text-sm text-gray-600 mb-1">أدخل الرمز المكوّن من ٦ أرقام</p>
                <p className="text-center text-xs text-gray-400 mb-5">تحقق من صندوق الوارد أو البريد المزعج</p>
                <OTPInput value={otp} onChange={handleOtpChange} disabled={loading} />
              </div>

              {loading && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="text-center space-y-2">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-400">إعادة الإرسال بعد {countdown} ثانية</p>
                ) : (
                  <button
                    onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    أرسل رمزاً جديداً
                  </button>
                )}
                <button
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  className="block w-full text-xs text-gray-400 hover:text-gray-600"
                >
                  تغيير البريد الإلكتروني
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            العودة إلى الرئيسية
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          التسجيل مجاني تماماً • لا كلمة مرور • لا التزام
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
