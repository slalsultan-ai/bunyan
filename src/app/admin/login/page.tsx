'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'otp';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    setLoading(false);
    // Always advance to OTP step (don't reveal if email is correct)
    setStep('otp');
    setCountdown(60);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: otp.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'خطأ في التحقق');
      if (data.error?.includes('انتهت') || data.error?.includes('تجاوزت')) {
        // Force back to email step
        setTimeout(() => { setStep('email'); setOtp(''); setError(''); }, 2500);
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setOtp('');
    await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    setCountdown(60);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold mx-auto mb-4">ب</div>
          <h1 className="text-xl font-bold text-gray-900">لوحة تحكم بُنيان</h1>
          <p className="text-gray-500 text-sm mt-1">للمسؤولين فقط</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-emerald-500 focus:outline-none transition-colors"
                autoFocus
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رمز الدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 text-center">
              تم إرسال رمز مكوّن من 6 أرقام إلى بريدك الإلكتروني
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">رمز التحقق</label>
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-center text-2xl font-bold tracking-[0.5em] focus:border-emerald-500 focus:outline-none transition-colors"
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'جاري التحقق...' : 'تحقق'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                className="text-gray-500 hover:text-gray-700"
              >
                تغيير البريد
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                className="text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {countdown > 0 ? `إعادة الإرسال بعد ${countdown}ث` : 'إعادة إرسال الرمز'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
