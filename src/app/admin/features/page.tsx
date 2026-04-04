'use client';
import { useState, useEffect, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  recentSessions: number;
  recentAccuracy: number;
}

interface ReviewStats {
  totalItems: number;
  masteredItems: number;
  pendingItems: number;
  uniqueUsers: number;
  masteryRate: number;
  avgTimesWrong: number;
  avgReviewsToMastery: number;
  recentMastered: number;
}

interface AgeGroupDepletion {
  ageGroup: string;
  total: number;
  retired: number;
  depletionPct: number;
}

interface RetirementStats {
  totalRetired: number;
  totalTracked: number;
  uniqueUsers: number;
  avgCorrectCount: number;
  totalQuestions: number;
  retirementRate: number;
  byAgeGroup: AgeGroupDepletion[];
}

interface FeatureStats {
  child_pdf_report: PdfStats;
  review_mode: ReviewStats;
  question_retirement: RetirementStats;
}

// ─── Metric types ────────────────────────────────────────────────────────────

type AccentColor = 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  accent: AccentColor;
  progress?: number; // 0-100 for progress bar
}

interface Readiness {
  level: 'ready' | 'caution' | 'not_ready';
  label: string;
  detail: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const ACCENT_COLORS: Record<AccentColor, string> = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  purple: 'text-purple-600',
  gray: 'text-gray-500',
};

const ACCENT_BG: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
};

const READINESS_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; dot: string }> = {
  ready: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✓', dot: 'bg-emerald-500' },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '!', dot: 'bg-amber-500' },
  not_ready: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '✕', dot: 'bg-red-500' },
};

const AGE_GROUP_LABELS: Record<string, string> = {
  '4-5': '٤-٥ سنوات',
  '6-9': '٦-٩ سنوات',
  '10-12': '١٠-١٢ سنة',
};

// ─── Metric builders ─────────────────────────────────────────────────────────

function buildMetrics(flagKey: string, stats: FeatureStats | null): Metric[] | null {
  if (!stats) return null;

  if (flagKey === 'child_pdf_report') {
    const s = stats.child_pdf_report;
    const coverage = s.totalChildren > 0
      ? Math.round((s.childrenWithSessions / s.totalChildren) * 100) : 0;
    return [
      { label: 'أطفال مسجّلين', value: s.totalChildren, accent: 'blue' },
      { label: 'لديهم جلسات', value: s.childrenWithSessions, sub: `${coverage}%`, accent: 'emerald', progress: coverage },
      { label: 'جلسات مكتملة', value: s.totalCompletedSessions, accent: 'purple' },
      { label: 'متوسط الدقة', value: `${s.avgAccuracy}%`, accent: s.avgAccuracy >= 70 ? 'emerald' : s.avgAccuracy >= 50 ? 'amber' : 'red', progress: s.avgAccuracy },
      { label: 'جلسات آخر ٧ أيام', value: s.recentSessions, accent: s.recentSessions > 0 ? 'blue' : 'gray' },
      { label: 'دقة آخر ٧ أيام', value: s.recentAccuracy ? `${s.recentAccuracy}%` : '—', accent: (s.recentAccuracy ?? 0) >= 70 ? 'emerald' : (s.recentAccuracy ?? 0) >= 50 ? 'amber' : 'gray' },
    ];
  }

  if (flagKey === 'review_mode') {
    const s = stats.review_mode;
    return [
      { label: 'مستخدمين نشطين', value: s.uniqueUsers, accent: 'purple' },
      { label: 'عناصر مراجعة', value: s.totalItems, accent: 'blue' },
      { label: 'تم إتقانها', value: s.masteredItems, sub: `${s.masteryRate}%`, accent: s.masteryRate >= 50 ? 'emerald' : 'amber', progress: s.masteryRate },
      { label: 'معلّقة الآن', value: s.pendingItems, accent: s.pendingItems > 50 ? 'red' : s.pendingItems > 0 ? 'amber' : 'gray' },
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
      { label: 'أسئلة مُقصاة', value: s.totalRetired, sub: `${s.retirementRate}%`, accent: 'emerald', progress: s.retirementRate },
      { label: 'متوسط الإجابات', value: s.avgCorrectCount, accent: 'purple' },
      { label: 'إجمالي الأسئلة', value: s.totalQuestions, accent: 'gray' },
      { label: 'نسبة الاستنزاف', value: `${depletionPct}%`, accent: depletionPct > 30 ? 'red' : depletionPct > 15 ? 'amber' : 'emerald', progress: depletionPct },
    ];
  }

  return null;
}

function getReadiness(flagKey: string, stats: FeatureStats | null): Readiness | null {
  if (!stats) return null;

  if (flagKey === 'child_pdf_report') {
    const s = stats.child_pdf_report;
    if (s.childrenWithSessions >= 5 && s.avgAccuracy > 0 && s.recentSessions >= 3) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `بيانات كافية: ${s.childrenWithSessions} طفل بجلسات، نشاط حديث مستمر` };
    }
    if (s.childrenWithSessions >= 2) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.childrenWithSessions} أطفال فقط جرّبوا النظام — يُفضّل ≥ ٥ قبل الإطلاق` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد بيانات كافية — فعّل لمختبرين أولاً' };
  }

  if (flagKey === 'review_mode') {
    const s = stats.review_mode;
    if (s.uniqueUsers >= 3 && s.masteryRate >= 30 && s.avgReviewsToMastery > 0) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueUsers} مستخدمين، نسبة إتقان ${s.masteryRate}%، النظام يعمل بفعالية` };
    }
    if (s.uniqueUsers >= 1 && s.totalItems >= 5) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `نسبة الإتقان ${s.masteryRate}% — راقب تقدم المستخدمين الحاليين` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'بيانات غير كافية — أضف مختبرين لجمع بيانات المراجعة' };
  }

  if (flagKey === 'question_retirement') {
    const s = stats.question_retirement;
    const maxDepletion = Math.max(...(s.byAgeGroup.map((a) => a.depletionPct) || [0]), 0);
    if (s.uniqueUsers >= 3 && maxDepletion <= 15) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `استنزاف منخفض (أعلى فئة ${maxDepletion}%) — بنك الأسئلة يتحمّل` };
    }
    if (maxDepletion <= 30) {
      return { level: 'caution', label: 'تحتاج مراقبة', detail: `استنزاف ${maxDepletion}% في بعض الفئات — راقب بنك الأسئلة` };
    }
    return { level: 'not_ready', label: 'خطر استنزاف', detail: `استنزاف ${maxDepletion}% — أضف أسئلة جديدة قبل الإطلاق` };
  }

  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ value, accent }: { value: number; accent: AccentColor }) {
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${ACCENT_BG[accent]}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function MetricCard({ m }: { m: Metric }) {
  return (
    <div className="bg-gray-50/80 rounded-xl px-3 py-2.5 border border-gray-100">
      <div className={`text-lg font-bold leading-tight ${ACCENT_COLORS[m.accent]}`}>
        {m.value}
        {m.sub && (
          <span className="text-[11px] font-semibold text-gray-400 mr-1">{m.sub}</span>
        )}
      </div>
      <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{m.label}</div>
      {m.progress != null && <ProgressBar value={m.progress} accent={m.accent} />}
    </div>
  );
}

function ReadinessBar({ readiness }: { readiness: Readiness }) {
  const style = READINESS_STYLES[readiness.level];
  return (
    <div className={`mx-5 mb-3 ${style.bg} border ${style.border} rounded-xl px-4 py-3 flex items-center gap-3`}>
      <span className={`w-6 h-6 ${style.dot} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {style.icon}
      </span>
      <div className="min-w-0">
        <span className={`text-sm font-bold ${style.text}`}>{readiness.label}</span>
        <p className={`text-xs ${style.text} opacity-80 mt-0.5 leading-relaxed`}>{readiness.detail}</p>
      </div>
    </div>
  );
}

function AgeGroupTable({ data }: { data: AgeGroupDepletion[] }) {
  if (data.length === 0) return null;
  return (
    <div className="mx-5 mb-3">
      <div className="text-[11px] font-semibold text-gray-500 mb-2">استنزاف حسب الفئة العمرية</div>
      <div className="grid gap-2">
        {data.map((ag) => {
          const barColor = ag.depletionPct > 30 ? 'bg-red-500' : ag.depletionPct > 15 ? 'bg-amber-500' : 'bg-emerald-500';
          const textColor = ag.depletionPct > 30 ? 'text-red-600' : ag.depletionPct > 15 ? 'text-amber-600' : 'text-emerald-600';
          return (
            <div key={ag.ageGroup} className="bg-gray-50/80 rounded-lg px-3 py-2 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {AGE_GROUP_LABELS[ag.ageGroup] || ag.ageGroup}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">{ag.retired}/{ag.total} سؤال</span>
                  <span className={`font-bold ${textColor}`}>{ag.depletionPct}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(ag.depletionPct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

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
  const [statsLoading, setStatsLoading] = useState(true);

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
    // Fetch flags first (critical), stats in parallel (non-blocking)
    const flagsPromise = fetch('/api/admin/features')
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
      });

    const statsPromise = fetch('/api/admin/features/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .finally(() => setStatsLoading(false));

    Promise.all([flagsPromise, statsPromise])
      .catch(() => setError('فشل تحميل الخصائص'))
      .finally(() => setLoading(false));
  }, []);

  function toggleFlag(flagKey: string) {
    setLocalState((prev) => {
      const current = prev[flagKey];
      if (!current) return prev;
      if (!current.enabled) {
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
    return raw.split(',').map((e) => e.trim()).filter(Boolean);
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
        <p className="text-sm text-gray-500 mt-1">تحكم في الخصائص وقيّم جاهزيتها قبل الإطلاق</p>
      </div>

      {/* Summary bar */}
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
          <div className="text-2xl font-bold text-gray-400">{flags.length - activeCount}</div>
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
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">
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
        <div className="space-y-5">
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
            const readiness = getReadiness(flag.flagKey, stats);
            const ageGroupData = flag.flagKey === 'question_retirement'
              ? (stats?.question_retirement?.byAgeGroup ?? [])
              : [];

            return (
              <div
                key={flag.flagKey}
                className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 ${
                  isDirty
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center text-xl shrink-0`}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-gray-900 text-base leading-tight">{flag.title}</h2>
                        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          state.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {state.enabled ? 'مفعّلة' : 'معطّلة'}
                        </span>
                        {isDirty && (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            غير محفوظ
                          </span>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{flag.description}</p>
                      )}
                      <span className="inline-block text-[11px] text-gray-400 font-mono mt-1.5 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        {flag.flagKey}
                      </span>
                    </div>
                  </div>

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
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        state.enabled ? 'translate-x-1.5' : 'translate-x-5.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* ── Readiness indicator ── */}
                {readiness && !statsLoading && <ReadinessBar readiness={readiness} />}

                {/* ── Metrics grid ── */}
                {metrics && metrics.length > 0 && !statsLoading && (
                  <div className="mx-5 mb-3">
                    <div className="text-[11px] font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      مقاييس الجودة
                    </div>
                    <div className={`grid gap-2 ${metrics.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {metrics.map((m, i) => <MetricCard key={i} m={m} />)}
                    </div>
                  </div>
                )}

                {/* ── Stats skeleton while loading ── */}
                {statsLoading && (
                  <div className="mx-5 mb-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-50 rounded-xl px-3 py-3 border border-gray-100 animate-pulse">
                          <div className="h-5 w-12 bg-gray-200 rounded mb-1.5" />
                          <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Age group depletion table ── */}
                {ageGroupData.length > 0 && !statsLoading && (
                  <AgeGroupTable data={ageGroupData} />
                )}

                {/* ── Confirm global enable ── */}
                {confirmGlobal === flag.flagKey && (
                  <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-lg shrink-0">⚠</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">تفعيل للجميع؟</p>
                        <p className="text-sm text-amber-600 mt-0.5">هذا سيُظهر الخاصية لكل المستخدمين بدون استثناء</p>
                        {readiness && readiness.level !== 'ready' && (
                          <p className="text-xs text-red-600 font-semibold mt-1">
                            تنبيه: هذه الخاصية {readiness.level === 'not_ready' ? 'غير جاهزة' : 'تحتاج مراقبة'} حسب المقاييس
                          </p>
                        )}
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

                {/* ── Allowed emails section ── */}
                <div className="px-5 pb-4 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : flag.flagKey)}
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
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 animate-[fadeIn_0.15s_ease-out]">
                      {emails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3" dir="ltr">
                          {emails.map((email, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg border border-gray-200">
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

                {/* ── Quick-save when dirty and collapsed ── */}
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
