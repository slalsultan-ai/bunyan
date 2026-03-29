'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<{ success: boolean; childName?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setLoggedIn(!!data.parent))
      .catch(() => setLoggedIn(false));
  }, []);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch('/api/children/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, childName: data.childName });
      } else {
        setResult({ success: false, error: data.error || 'حدث خطأ' });
      }
    } catch {
      setResult({ success: false, error: 'حدث خطأ في الاتصال' });
    } finally {
      setJoining(false);
    }
  }

  if (loggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <Logo size="sm" />
        <h1 className="text-xl font-bold text-gray-900">تمت دعوتك لمتابعة طفل على بُنيان</h1>

        {result ? (
          result.success ? (
            <div className="space-y-4">
              <div className="text-4xl">🎉</div>
              <p className="text-emerald-700 font-semibold">تمت إضافة {result.childName} بنجاح!</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                الذهاب للوحة التحكم
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">{result.error}</p>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                حاول مرة أخرى
              </button>
            </div>
          )
        ) : loggedIn ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {joining ? 'جاري القبول...' : 'قبول الدعوة'}
          </button>
        ) : (
          <Link
            href={`/auth?redirect=/join/${token}`}
            className="block w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-center"
          >
            سجل دخولك أولاً
          </Link>
        )}
      </div>
    </div>
  );
}
