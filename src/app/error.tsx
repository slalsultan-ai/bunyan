'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-gray-600 mb-6">عذراً، حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.</p>
        <button
          onClick={() => unstable_retry()}
          className="bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
