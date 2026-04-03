'use client';
import { useState, useEffect, useMemo } from 'react';

interface FeatureFlag {
  id: number;
  flagKey: string;
  title: string;
  description: string | null;
  enabled: boolean;
  allowedEmails: string;
}

// Optional cosmetic overrides — flags not listed here still render fine from DB values
const FLAG_META: Record<string, { icon: string }> = {
  child_pdf_report: { icon: '📄' },
  review_mode: { icon: '📝' },
  question_retirement: { icon: '🎯' },
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

  // Track which flags have unsaved changes
  const dirtyFlags = useMemo(() => {
    const dirty: Record<string, boolean> = {};
    for (const flag of flags) {
      const local = localState[flag.flagKey];
      if (!local) continue;
      dirty[flag.flagKey] =
        local.enabled !== flag.enabled ||
        local.allowedEmails !== flag.allowedEmails;
    }
    return dirty;
  }, [flags, localState]);

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
      // Update the "saved" baseline so dirty detection resets
      setFlags((prev) =>
        prev.map((f) =>
          f.flagKey === flagKey
            ? { ...f, enabled: state.enabled, allowedEmails: state.allowedEmails }
            : f
        )
      );
      setSuccess((prev) => ({ ...prev, [flagKey]: true }));
      setTimeout(() => setSuccess((prev) => ({ ...prev, [flagKey]: false })), 2500);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">
          إدارة الخصائص
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          تحكم في الخصائص المتاحة للمستخدمين — {flags.length} خاصية مسجلة
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="shrink-0">✕</span>
          <span>{error}</span>
        </div>
      )}

      {flags.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">لا توجد خصائص مسجلة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => {
            const state = localState[flag.flagKey];
            if (!state) return null;
            const meta = FLAG_META[flag.flagKey];
            const icon = meta?.icon || '🔧';
            const isDirty = dirtyFlags[flag.flagKey];

            return (
              <div
                key={flag.flagKey}
                className={`bg-white rounded-2xl border shadow-sm transition-all ${
                  isDirty
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Header row with toggle */}
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl leading-none mt-0.5 shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <h2 className="font-bold text-gray-900 text-base leading-tight">
                        {flag.title}
                      </h2>
                      {flag.description && (
                        <p className="text-sm text-gray-500 mt-1">{flag.description}</p>
                      )}
                      <span className="inline-block text-xs text-gray-400 font-mono mt-1 bg-gray-50 px-1.5 py-0.5 rounded">
                        {flag.flagKey}
                      </span>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleFlag(flag.flagKey)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors mt-1 ${
                      state.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={state.enabled}
                    aria-label={`تفعيل ${flag.title}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        state.enabled ? 'translate-x-1.5' : 'translate-x-5.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Confirm global enable */}
                {confirmGlobal === flag.flagKey && (
                  <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-amber-700">
                      هذا سيُظهر الخاصية لكل المستخدمين
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmGlobal(null)}
                        className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => confirmEnableGlobal(flag.flagKey)}
                        className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                      >
                        تأكيد التفعيل
                      </button>
                    </div>
                  </div>
                )}

                {/* Allowed emails + save */}
                <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    المستخدمون المسموحون
                    <span className="text-xs text-gray-400 font-normal mr-1">
                      (يشوفون الخاصية حتى لو معطّلة)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={state.allowedEmails}
                      onChange={(e) => updateEmails(flag.flagKey, e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                    />
                    <button
                      onClick={() => saveFlag(flag.flagKey)}
                      disabled={saving[flag.flagKey] || !isDirty}
                      className={`shrink-0 text-sm font-semibold px-5 py-2 rounded-xl transition-all ${
                        success[flag.flagKey]
                          ? 'bg-emerald-100 text-emerald-700'
                          : isDirty
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {saving[flag.flagKey]
                        ? 'جاري الحفظ...'
                        : success[flag.flagKey]
                          ? 'تم الحفظ'
                          : 'حفظ'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
