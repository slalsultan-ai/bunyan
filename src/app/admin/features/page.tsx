'use client';
import { useState, useEffect } from 'react';

interface FeatureFlag {
  id: number;
  flagKey: string;
  title: string;
  description: string | null;
  enabled: boolean;
  allowedEmails: string;
}

const FLAG_ICONS: Record<string, string> = {
  child_pdf_report: '📄',
  review_mode: '📝',
};

const FLAG_LABELS: Record<string, string> = {
  child_pdf_report: 'تقرير PDF لولي الأمر',
  review_mode: 'وضع المراجعة',
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  child_pdf_report: 'تحميل تقرير أداء الطفل كـ PDF',
  review_mode: 'مراجعة الأسئلة الخاطئة بترتيب ذكي',
};

export default function FeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [localState, setLocalState] = useState<
    Record<string, { enabled: boolean; allowedEmails: string }>
  >({});
  const [confirmGlobal, setConfirmGlobal] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/features')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then((data) => {
        setFlags(data.flags);
        const state: Record<string, { enabled: boolean; allowedEmails: string }> = {};
        for (const f of data.flags) {
          state[f.flagKey] = { enabled: f.enabled, allowedEmails: f.allowedEmails };
        }
        setLocalState(state);
      })
      .catch(() => setError('فشل تحميل الخصائص'))
      .finally(() => setLoading(false));
  }, []);

  function toggleFlag(flagKey: string) {
    setLocalState((prev) => {
      const current = prev[flagKey];
      if (!current) return prev;
      const newEnabled = !current.enabled;
      // If enabling globally, show confirmation
      if (newEnabled) {
        setConfirmGlobal(flagKey);
        return prev;
      }
      return { ...prev, [flagKey]: { ...current, enabled: false } };
    });
  }

  function confirmEnableGlobal(flagKey: string) {
    setLocalState((prev) => {
      const current = prev[flagKey];
      if (!current) return prev;
      return { ...prev, [flagKey]: { ...current, enabled: true } };
    });
    setConfirmGlobal(null);
  }

  function updateEmails(flagKey: string, value: string) {
    setLocalState((prev) => {
      const current = prev[flagKey];
      if (!current) return prev;
      return { ...prev, [flagKey]: { ...current, allowedEmails: value } };
    });
  }

  async function saveFlag(flagKey: string) {
    const state = localState[flagKey];
    if (!state) return;

    setSaving((prev) => ({ ...prev, [flagKey]: true }));
    setSuccess((prev) => ({ ...prev, [flagKey]: false }));

    try {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagKey,
          enabled: state.enabled,
          allowed_emails: state.allowedEmails,
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess((prev) => ({ ...prev, [flagKey]: true }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [flagKey]: false })), 3000);
    } catch {
      setError('فشل حفظ التغييرات');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving((prev) => ({ ...prev, [flagKey]: false }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-6">
        ⚙️ إدارة الخصائص (Feature Flags)
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {flags.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
          لا توجد خصائص مسجلة
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => {
            const state = localState[flag.flagKey];
            if (!state) return null;
            const icon = FLAG_ICONS[flag.flagKey] || '🔧';
            const label = FLAG_LABELS[flag.flagKey] || flag.title;
            const desc = FLAG_DESCRIPTIONS[flag.flagKey] || flag.description || '';

            return (
              <div
                key={flag.flagKey}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
              >
                {/* Header */}
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </h2>
                  {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">الحالة:</span>
                  <button
                    onClick={() => toggleFlag(flag.flagKey)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      state.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        state.enabled ? '-translate-x-1.5' : 'translate-x-7'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      state.enabled ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {state.enabled ? '🟢 مفعّل' : '🔴 معطل'}
                  </span>
                </div>

                {/* Confirm global enable */}
                {confirmGlobal === flag.flagKey && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-amber-700">
                      ⚠️ هذا سيُظهر الخاصية لكل المستخدمين
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmGlobal(null)}
                        className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => confirmEnableGlobal(flag.flagKey)}
                        className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600"
                      >
                        تأكيد
                      </button>
                    </div>
                  </div>
                )}

                {/* Allowed emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    المستخدمون المسموحون:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={state.allowedEmails}
                    onChange={(e) => updateEmails(flag.flagKey, e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    إيميلات مفصولة بفاصلة — هؤلاء يرون الخاصية حتى لو معطّلة للكل
                  </p>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveFlag(flag.flagKey)}
                    disabled={saving[flag.flagKey]}
                    className="bg-emerald-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {saving[flag.flagKey] ? 'جاري الحفظ...' : '💾 حفظ'}
                  </button>
                  {success[flag.flagKey] && (
                    <span className="text-sm text-emerald-600 font-medium">✅ تم الحفظ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
