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

interface PdfStats {
  totalChildren: number;
  childrenWithSessions: number;
  totalCompletedSessions: number;
  avgAccuracy: number;
}

interface ReviewStats {
  totalItems: number;
  masteredItems: number;
  pendingItems: number;
  uniqueUsers: number;
  masteryRate: number;
  avgTimesWrong: number;
  avgReviewsToMastery: number;
}

interface RetirementStats {
  totalRetired: number;
  totalTracked: number;
  uniqueUsers: number;
  avgCorrectCount: number;
  totalQuestions: number;
  retirementRate: number;
}

interface FeatureStats {
  child_pdf_report: PdfStats;
  review_mode: ReviewStats;
  question_retirement: RetirementStats;
}

// Metric card config
interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
}

// Optional cosmetic overrides — flags not listed here still render fine from DB values
const FLAG_META: Record<string, { icon: string; color: string }> = {
  child_pdf_report: { icon: '📄', color: 'blue' },
  review_mode: { icon: '📝', color: 'purple' },
  question_retirement: { icon: '🎯', color: 'amber' },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
};

function buildMetrics(flagKey: string, stats: FeatureStats | null): Metric[] | null {
  if (!stats) return null;

  if (flagKey === 'child_pdf_report') {
    const s = stats.child_pdf_report;
    return [
      { label: 'أطفال مسجّلين', value: s.totalChildren, accent: 'blue' },
      { label: 'أطفال بجلسات', value: s.childrenWithSessions, accent: 'emerald' },
      { label: 'جلسات مكتملة', value: s.totalCompletedSessions, accent: 'purple' },
      { label: 'متوسط الدقة', value: `${s.avgAccuracy}%`, accent: s.avgAccuracy >= 70 ? 'emerald' : s.avgAccuracy >= 50 ? 'amber' : 'red' },
    ];
  }

  if (flagKey === 'review_mode') {
    const s = stats.review_mode;
    return [
      { label: 'مستخدمين', value: s.uniqueUsers, accent: 'purple' },
      { label: 'عناصر مراجعة', value: s.totalItems, accent: 'blue' },
      { label: 'تم إتقانها', value: s.masteredItems, sub: `${s.masteryRate}%`, accent: s.masteryRate >= 50 ? 'emerald' : 'amber' },
      { label: 'معلّقة الآن', value: s.pendingItems, accent: s.pendingItems > 50 ? 'red' : 'gray' },
      { label: 'متوسط الأخطاء', value: s.avgTimesWrong, accent: 'amber' },
      { label: 'مراجعات للإتقان', value: s.avgReviewsToMastery || '—', accent: 'emerald' },
    ];
  }

  if (flagKey === 'question_retirement') {
    const s = stats.question_retirement;
    const depletionPct = s.totalQuestions > 0 ? Math.round((s.totalRetired / s.totalQuestions) * 100) : 0;
    return [
      { label: 'مستخدمين', value: s.uniqueUsers, accent: 'amber' },
      { label: 'أسئلة مُتتبّعة', value: s.totalTracked, accent: 'blue' },
      { label: 'أسئلة مُقصاة', value: s.totalRetired, sub: `${s.retirementRate}%`, accent: 'emerald' },
      { label: 'متوسط الإجابات', value: s.avgCorrectCount, accent: 'purple' },
      { label: 'إجمالي الأسئلة', value: s.totalQuestions, accent: 'gray' },
      { label: 'نسبة الاستنزاف', value: `${depletionPct}%`, accent: depletionPct > 30 ? 'red' : depletionPct > 15 ? 'amber' : 'emerald' },
    ];
  }

  return null;
}

const ACCENT_COLORS: Record<string, string> = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  gray: 'text-gray-500',
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [stats, setStats] = useState<FeatureStats | null>(null);

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

  const activeCount = useMemo(
    () => Object.values(localState).filter((s) => s.enabled).length,
    [localState]
  );

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/features').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      }),
      fetch('/api/admin/features/stats').then((r) => {
        if (!r.ok) return null;
        return r.json();
      }),
    ])
      .then(([flagsData, statsData]) => {
        setFlags(flagsData.flags);
        const state: Record<string, { enabled: boolean; allowedEmails: string }> = {};
        for (const f of flagsData.flags) {
          state[f.flagKey] = { enabled: f.enabled, allowedEmails: f.allowedEmails };
        }
        setLocalState(state);
        if (statsData) setStats(statsData);
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

  function parseEmails(raw: string): string[] {
    return raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">إدارة الخصائص</h1>
        <p className="text-sm text-gray-500 mt-1">
          تحكم في الخصائص المتاحة للمستخدمين
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{flags.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">إجمالي</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">مفعّلة</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {flags.length - activeCount}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">معطّلة</div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs shrink-0">!</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            &times;
          </button>
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
            const colorKey = meta?.color || 'gray';
            const colors = COLOR_MAP[colorKey] || COLOR_MAP.gray;
            const isDirty = dirtyFlags[flag.flagKey];
            const isExpanded = expandedCard === flag.flagKey;
            const emails = parseEmails(state.allowedEmails);
            const metrics = buildMetrics(flag.flagKey, stats);

            return (
              <div
                key={flag.flagKey}
                className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 ${
                  isDirty
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center text-xl shrink-0`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-gray-900 text-base leading-tight">
                          {flag.title}
                        </h2>
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            state.enabled
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {state.enabled ? 'مفعّلة' : 'معطّلة'}
                        </span>
                        {isDirty && (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            غير محفوظ
                          </span>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {flag.description}
                        </p>
                      )}
                      <span className="inline-block text-[11px] text-gray-400 font-mono mt-1.5 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {flag.flagKey}
                      </span>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
                    <button
                      onClick={() => toggleFlag(flag.flagKey)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                        state.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={state.enabled}
                      aria-label={`تفعيل ${flag.title}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                          state.enabled ? 'translate-x-1.5' : 'translate-x-5.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Feature-specific metrics */}
                {metrics && metrics.length > 0 && (
                  <div className="mx-5 mb-3">
                    <div className={`grid gap-2 ${metrics.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {metrics.map((m, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                        >
                          <div className={`text-lg font-bold ${ACCENT_COLORS[m.accent || 'gray']}`}>
                            {m.value}
                            {m.sub && (
                              <span className="text-xs font-medium text-gray-400 mr-1">
                                {m.sub}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm global enable */}
                {confirmGlobal === flag.flagKey && (
                  <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-lg shrink-0">
                        ⚠
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                          تفعيل للجميع؟
                        </p>
                        <p className="text-sm text-amber-600 mt-0.5">
                          هذا سيُظهر الخاصية لكل المستخدمين بدون استثناء
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => confirmEnableGlobal(flag.flagKey)}
                            className="text-sm bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                          >
                            نعم، فعّل للجميع
                          </button>
                          <button
                            onClick={() => setConfirmGlobal(null)}
                            className="text-sm text-gray-500 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emails summary / expand area */}
                <div className="px-5 pb-4 pt-2 border-t border-gray-100">
                  <button
                    onClick={() =>
                      setExpandedCard(isExpanded ? null : flag.flagKey)
                    }
                    className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">المستخدمون المسموحون</span>
                      {emails.length > 0 && (
                        <span className="bg-gray-100 text-gray-500 text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
                          {emails.length}
                        </span>
                      )}
                      {!isExpanded && emails.length > 0 && (
                        <span className="text-xs text-gray-400 font-normal truncate max-w-[200px]" dir="ltr">
                          {emails.slice(0, 2).join(', ')}
                          {emails.length > 2 && ` +${emails.length - 2}`}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 animate-[fadeIn_0.15s_ease-out]">
                      {/* Email chips preview */}
                      {emails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3" dir="ltr">
                          {emails.map((email, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg border border-gray-200"
                            >
                              <span className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                                {email[0]?.toUpperCase()}
                              </span>
                              {email}
                            </span>
                          ))}
                        </div>
                      )}
                      <label className="block text-xs text-gray-400 mb-1.5">
                        أضف الإيميلات مفصولة بفاصلة — يشوفون الخاصية حتى لو معطّلة
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={state.allowedEmails}
                          onChange={(e) => updateEmails(flag.flagKey, e.target.value)}
                          placeholder="email1@example.com, email2@example.com"
                          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow placeholder:text-gray-300"
                        />
                        <button
                          onClick={() => saveFlag(flag.flagKey)}
                          disabled={saving[flag.flagKey] || !isDirty}
                          className={`shrink-0 text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 ${
                            success[flag.flagKey]
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : isDirty
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {saving[flag.flagKey] ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              جاري الحفظ
                            </span>
                          ) : success[flag.flagKey] ? (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              تم الحفظ
                            </span>
                          ) : (
                            'حفظ'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick-save bar when dirty and collapsed */}
                {isDirty && !isExpanded && (
                  <div className="px-5 pb-4 -mt-1">
                    <button
                      onClick={() => saveFlag(flag.flagKey)}
                      disabled={saving[flag.flagKey]}
                      className="w-full text-sm font-semibold py-2 rounded-xl transition-all duration-200 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow"
                    >
                      {saving[flag.flagKey] ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          جاري الحفظ
                        </span>
                      ) : success[flag.flagKey] ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          تم الحفظ
                        </span>
                      ) : (
                        'حفظ التغييرات'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
