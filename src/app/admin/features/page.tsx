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

interface FeatureStats {
  child_pdf_report: {
    totalChildren: number;
    childrenWithSessions: number;
    totalCompletedSessions: number;
    avgAccuracy: number | null;
    recentSessions: number;
    recentAccuracy: number | null;
  } | null;
  review_mode: {
    totalItems: number;
    masteredItems: number;
    pendingItems: number;
    uniqueChildren: number;
    allowedUsers: number;
    masteryRate: number;
    avgTimesWrong: number | null;
    avgReviewsToMastery: number | null;
  } | null;
  question_retirement: {
    enabledChildren: number;
    benefitingChildren: number;
    retiredQuestions: number;
    avgCorrectCount: number | null;
    totalQuestions: number;
    depletionPct: number;
    byAgeGroup: { ageGroup: string; total: number; retired: number; depletionPct: number }[];
  } | null;
  daily_challenge: {
    totalDays: number;
    uniqueChildren: number;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number | null;
    maxCurrentStreak: number;
    longestStreak: number;
    totalStars: number;
    totalBadges: number;
    activeStreakers: number;
    recentChildren: number;
  } | null;
  session_limit: {
    sessionsToday: number;
    uniqueUsersToday: number;
    maxSessionsByOneUser: number;
    usersHittingLimit: number;
    avgSessionsPerUser: number;
  } | null;
  adaptive_path: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    uniqueChildren: number;
    avgAccuracy: number | null;
    maxSessionNumber: number;
  } | null;
  weekly_digest: {
    totalSent: number;
    uniqueParents: number;
    lastSentAt: string | null;
    sentThisWeek: number;
    unsubscribed: number;
    totalParents: number;
    subscribedParents: number;
  } | null;
  parent_dashboard_pro: {
    totalGoals: number;
    activeGoals: number;
    achievedGoals: number;
    abandonedGoals: number;
    achievementRate: number;
    uniqueChildren: number;
  } | null;
  gat_extended_bank: {
    totalQuestions: number;
    freeQuestions: number;
    premiumQuestions: number;
    sources: Record<string, number>;
  } | null;
  mock_tests: {
    totalTests: number;
    activeTests: number;
    totalAttempts: number;
    completed: number;
    timedOut: number;
    completionRate: number;
    uniqueChildren: number;
    avgAccuracy: number | null;
    avgTimeMinutes: number | null;
  } | null;
  mascot_bunaa: { note: string } | null;
  answer_explanations: { note: string } | null;
  _premium: {
    activeSubscriptions: number;
    activeCodeActivations: number;
    totalParents: number;
  } | null;
}

// ─── Metric types ────────────────────────────────────────────────────────────

type AccentColor = 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

interface Metric {
  label: string;
  value: string | number;
  sub?: string;
  accent: AccentColor;
  progress?: number;
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
  daily_challenge: { icon: '⭐', color: 'amber' },
  session_limit: { icon: '🔒', color: 'red' },
  answer_explanations: { icon: '💡', color: 'blue' },
  adaptive_path: { icon: '🧠', color: 'purple' },
  weekly_digest: { icon: '📧', color: 'blue' },
  parent_dashboard_pro: { icon: '📊', color: 'purple' },
  gat_extended_bank: { icon: '📚', color: 'amber' },
  mock_tests: { icon: '📋', color: 'red' },
  mascot_bunaa: { icon: '🐝', color: 'amber' },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
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
    if (!s) return null;
    const coverage = s.totalChildren > 0 ? Math.round((s.childrenWithSessions / s.totalChildren) * 100) : 0;
    return [
      { label: 'أطفال مسجّلين', value: s.totalChildren, accent: 'blue' },
      { label: 'لديهم جلسات', value: s.childrenWithSessions, sub: `${coverage}%`, accent: 'emerald', progress: coverage },
      { label: 'جلسات مكتملة', value: s.totalCompletedSessions, accent: 'purple' },
      { label: 'متوسط الدقة', value: s.avgAccuracy != null ? `${s.avgAccuracy}%` : '—', accent: s.avgAccuracy != null ? (s.avgAccuracy >= 70 ? 'emerald' : s.avgAccuracy >= 50 ? 'amber' : 'red') : 'gray', progress: s.avgAccuracy ?? undefined },
      { label: 'جلسات آخر ٧ أيام', value: s.recentSessions, accent: s.recentSessions > 0 ? 'blue' : 'gray' },
      { label: 'دقة آخر ٧ أيام', value: s.recentAccuracy != null ? `${s.recentAccuracy}%` : '—', accent: s.recentAccuracy != null ? (s.recentAccuracy >= 70 ? 'emerald' : 'amber') : 'gray' },
    ];
  }

  if (flagKey === 'review_mode') {
    const s = stats.review_mode;
    if (!s) return null;
    return [
      { label: 'طلاب بمراجعات', value: s.uniqueChildren, accent: 'blue' },
      { label: 'إجمالي المراجعات', value: s.totalItems, accent: 'purple' },
      { label: 'تم إتقانها', value: s.masteredItems, sub: `${s.masteryRate}%`, accent: s.masteryRate >= 50 ? 'emerald' : 'amber', progress: s.masteryRate },
      { label: 'معلّقة الآن', value: s.pendingItems, accent: s.pendingItems > 50 ? 'red' : s.pendingItems > 0 ? 'amber' : 'gray' },
      { label: 'متوسط الأخطاء', value: s.avgTimesWrong ?? '—', accent: 'amber' },
      { label: 'مراجعات للإتقان', value: s.avgReviewsToMastery ?? '—', accent: 'emerald' },
    ];
  }

  if (flagKey === 'question_retirement') {
    const s = stats.question_retirement;
    if (!s) return null;
    return [
      { label: 'طلاب مفعّلة لهم', value: s.enabledChildren, accent: 'blue' },
      { label: 'طلاب مستفيدين', value: s.benefitingChildren, accent: s.benefitingChildren > 0 ? 'emerald' : 'gray' },
      { label: 'أسئلة أُقصيت فعلياً', value: s.retiredQuestions, accent: s.retiredQuestions > 0 ? 'purple' : 'gray' },
      { label: 'متوسط الإجابات الصحيحة', value: s.avgCorrectCount ?? '—', accent: 'amber' },
      { label: 'إجمالي بنك الأسئلة', value: s.totalQuestions, accent: 'gray' },
      { label: 'نسبة الاستنزاف', value: `${s.depletionPct}%`, accent: s.depletionPct > 30 ? 'red' : s.depletionPct > 15 ? 'amber' : 'emerald', progress: s.depletionPct },
    ];
  }

  if (flagKey === 'daily_challenge') {
    const s = stats.daily_challenge;
    if (!s) return null;
    return [
      { label: 'أيام تحدي', value: s.totalDays, accent: 'amber' },
      { label: 'أطفال مشاركين', value: s.uniqueChildren, accent: 'blue' },
      { label: 'إجابات صحيحة', value: s.correctAnswers, sub: s.accuracy != null ? `${s.accuracy}%` : undefined, accent: s.accuracy != null ? (s.accuracy >= 70 ? 'emerald' : 'amber') : 'gray', progress: s.accuracy ?? undefined },
      { label: 'أعلى سلسلة حالية', value: s.maxCurrentStreak, accent: s.maxCurrentStreak > 0 ? 'emerald' : 'gray' },
      { label: 'أطول سلسلة', value: s.longestStreak, accent: 'purple' },
      { label: 'نشطين آخر ٧ أيام', value: s.recentChildren, accent: s.recentChildren > 0 ? 'blue' : 'gray' },
    ];
  }

  if (flagKey === 'session_limit') {
    const s = stats.session_limit;
    if (!s) return null;
    return [
      { label: 'جلسات اليوم', value: s.sessionsToday, accent: 'blue' },
      { label: 'مستخدمين اليوم', value: s.uniqueUsersToday, accent: 'purple' },
      { label: 'أكثر مستخدم', value: `${s.maxSessionsByOneUser} جلسة`, accent: s.maxSessionsByOneUser >= 3 ? 'red' : 'gray' },
      { label: 'وصلوا الحد (≥٣)', value: s.usersHittingLimit, accent: s.usersHittingLimit > 0 ? 'amber' : 'gray' },
      { label: 'متوسط لكل مستخدم', value: s.avgSessionsPerUser || '—', accent: 'gray' },
    ];
  }

  if (flagKey === 'adaptive_path') {
    const s = stats.adaptive_path;
    if (!s) return null;
    return [
      { label: 'جلسات ذكية', value: s.totalSessions, accent: 'purple' },
      { label: 'مكتملة', value: s.completedSessions, sub: `${s.completionRate}%`, accent: s.completionRate >= 60 ? 'emerald' : 'amber', progress: s.completionRate },
      { label: 'أطفال مشاركين', value: s.uniqueChildren, accent: 'blue' },
      { label: 'متوسط الدقة', value: s.avgAccuracy != null ? `${s.avgAccuracy}%` : '—', accent: s.avgAccuracy != null ? (s.avgAccuracy >= 70 ? 'emerald' : 'amber') : 'gray', progress: s.avgAccuracy ?? undefined },
      { label: 'أعلى تسلسل', value: `جلسة #${s.maxSessionNumber}`, accent: 'gray' },
    ];
  }

  if (flagKey === 'weekly_digest') {
    const s = stats.weekly_digest;
    if (!s) return null;
    const subRate = s.totalParents > 0 ? Math.round((s.subscribedParents / s.totalParents) * 100) : 0;
    return [
      { label: 'إجمالي المرسل', value: s.totalSent, accent: 'blue' },
      { label: 'هذا الأسبوع', value: s.sentThisWeek, accent: s.sentThisWeek > 0 ? 'emerald' : 'gray' },
      { label: 'لم يلغوا التقرير', value: s.subscribedParents, sub: `${subRate}%`, accent: 'purple', progress: subRate },
      { label: 'ألغوا التقرير', value: s.unsubscribed, accent: s.unsubscribed > 0 ? 'amber' : 'gray' },
      { label: 'إجمالي الأولياء', value: s.totalParents, accent: 'gray' },
    ];
  }

  if (flagKey === 'parent_dashboard_pro') {
    const s = stats.parent_dashboard_pro;
    if (!s) return null;
    return [
      { label: 'أهداف نشطة', value: s.activeGoals, accent: 'blue' },
      { label: 'تم تحقيقها', value: s.achievedGoals, sub: s.totalGoals > 0 ? `${s.achievementRate}%` : undefined, accent: s.achievedGoals > 0 ? 'emerald' : 'gray', progress: s.achievementRate || undefined },
      { label: 'تم التخلي عنها', value: s.abandonedGoals, accent: s.abandonedGoals > 0 ? 'amber' : 'gray' },
      { label: 'إجمالي الأهداف', value: s.totalGoals, accent: 'purple' },
      { label: 'أطفال بأهداف', value: s.uniqueChildren, accent: 'blue' },
    ];
  }

  if (flagKey === 'gat_extended_bank') {
    const s = stats.gat_extended_bank;
    if (!s) return null;
    const premPct = s.totalQuestions > 0 ? Math.round((s.premiumQuestions / s.totalQuestions) * 100) : 0;
    return [
      { label: 'إجمالي الأسئلة', value: s.totalQuestions, accent: 'blue' },
      { label: 'مجانية', value: s.freeQuestions, accent: 'emerald' },
      { label: 'مدفوعة', value: s.premiumQuestions, sub: `${premPct}%`, accent: s.premiumQuestions > 0 ? 'purple' : 'gray', progress: premPct },
      ...Object.entries(s.sources).map(([src, cnt]) => ({
        label: src === 'original' ? 'أصلية' : src,
        value: cnt,
        accent: 'gray' as AccentColor,
      })),
    ];
  }

  if (flagKey === 'mock_tests') {
    const s = stats.mock_tests;
    if (!s) return null;
    return [
      { label: 'اختبارات متاحة', value: s.activeTests, sub: `من ${s.totalTests}`, accent: 'blue' },
      { label: 'محاولات', value: s.totalAttempts, accent: 'purple' },
      { label: 'مكتملة', value: s.completed, sub: `${s.completionRate}%`, accent: s.completionRate >= 60 ? 'emerald' : 'amber', progress: s.completionRate },
      { label: 'انتهى الوقت', value: s.timedOut, accent: s.timedOut > 0 ? 'red' : 'gray' },
      { label: 'أطفال مشاركين', value: s.uniqueChildren, accent: 'blue' },
      { label: 'متوسط الدقة', value: s.avgAccuracy != null ? `${s.avgAccuracy}%` : '—', accent: s.avgAccuracy != null ? (s.avgAccuracy >= 70 ? 'emerald' : 'amber') : 'gray', progress: s.avgAccuracy ?? undefined },
      { label: 'متوسط الوقت', value: s.avgTimeMinutes != null ? `${s.avgTimeMinutes} دقيقة` : '—', accent: 'gray' },
    ];
  }

  if (flagKey === 'mascot_bunaa' || flagKey === 'answer_explanations') {
    const data = flagKey === 'mascot_bunaa' ? stats.mascot_bunaa : stats.answer_explanations;
    return [
      { label: 'ملاحظة', value: data?.note ?? '—', accent: 'gray' },
    ];
  }

  return null;
}

// ─── Readiness evaluation ────────────────────────────────────────────────────

function getReadiness(flagKey: string, stats: FeatureStats | null): Readiness | null {
  if (!stats) return null;

  if (flagKey === 'child_pdf_report') {
    const s = stats.child_pdf_report;
    if (!s) return null;
    if (s.childrenWithSessions >= 5 && s.avgAccuracy != null && s.recentSessions >= 3) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `بيانات كافية: ${s.childrenWithSessions} طفل بجلسات، نشاط حديث مستمر` };
    }
    if (s.childrenWithSessions >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.childrenWithSessions} أطفال فقط جرّبوا النظام — يُفضّل ≥ ٥ قبل الإطلاق` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد بيانات كافية — فعّل لمختبرين أولاً' };
  }

  if (flagKey === 'review_mode') {
    const s = stats.review_mode;
    if (!s) return null;
    if (s.uniqueChildren >= 3 && s.masteryRate >= 30 && (s.avgReviewsToMastery ?? 0) > 0) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueChildren} طلاب بمراجعات، نسبة إتقان ${s.masteryRate}%` };
    }
    if (s.uniqueChildren >= 1 && s.totalItems >= 5) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.uniqueChildren} طالب فقط — نسبة الإتقان ${s.masteryRate}%` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'بيانات غير كافية — أضف مختبرين لجمع بيانات المراجعة' };
  }

  if (flagKey === 'question_retirement') {
    const s = stats.question_retirement;
    if (!s) return null;
    if (s.enabledChildren === 0) {
      return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا يوجد طلاب مفعّلة لهم — أضف إيميلات أو فعّل للمشتركين' };
    }
    const maxDepletion = Math.max(...s.byAgeGroup.map((a) => a.depletionPct), 0);
    if (s.benefitingChildren >= 1 && maxDepletion <= 15) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.benefitingChildren} طلاب مستفيدين، استنزاف منخفض (${maxDepletion}%)` };
    }
    if (maxDepletion <= 30) {
      return { level: 'caution', label: 'تحتاج مراقبة', detail: `استنزاف ${maxDepletion}% في بعض الفئات — راقب بنك الأسئلة` };
    }
    return { level: 'not_ready', label: 'خطر استنزاف', detail: `استنزاف ${maxDepletion}% — أضف أسئلة جديدة قبل الإطلاق` };
  }

  if (flagKey === 'daily_challenge') {
    const s = stats.daily_challenge;
    if (!s) return null;
    if (s.uniqueChildren >= 5 && s.totalDays >= 7 && s.accuracy != null && s.accuracy >= 50) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueChildren} طفل جرّبوا خلال ${s.totalDays} يوم، دقة ${s.accuracy}%` };
    }
    if (s.uniqueChildren >= 1 && s.totalDays >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.uniqueChildren} أطفال، ${s.totalDays} أيام — يُفضّل ≥ ٥ أطفال و ≥ ٧ أيام` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد بيانات — فعّل لمختبرين وانتظر أسبوع' };
  }

  if (flagKey === 'session_limit') {
    const s = stats.session_limit;
    if (!s) return null;
    if (s.uniqueUsersToday >= 3) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueUsersToday} مستخدم اليوم، النظام يعمل بشكل طبيعي` };
    }
    if (s.sessionsToday >= 1) {
      return { level: 'caution', label: 'تحتاج مراقبة', detail: `${s.sessionsToday} جلسة اليوم — راقب سلوك المستخدمين عند الحد` };
    }
    return { level: 'not_ready', label: 'لا بيانات اليوم', detail: 'لا توجد جلسات اليوم بعد — انتظر نشاط المستخدمين' };
  }

  if (flagKey === 'adaptive_path') {
    const s = stats.adaptive_path;
    if (!s) return null;
    if (s.uniqueChildren >= 3 && s.completionRate >= 50 && s.avgAccuracy != null) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueChildren} أطفال، إكمال ${s.completionRate}%، دقة ${s.avgAccuracy}%` };
    }
    if (s.uniqueChildren >= 1 && s.totalSessions >= 3) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.uniqueChildren} أطفال، ${s.totalSessions} جلسات — يُفضّل ≥ ٣ أطفال` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'بيانات غير كافية — فعّل لمختبرين أولاً' };
  }

  if (flagKey === 'weekly_digest') {
    const s = stats.weekly_digest;
    if (!s) return null;
    if (s.totalSent >= 5 && s.subscribedParents >= 3) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.totalSent} رسالة أُرسلت، ${s.subscribedParents} مشترك` };
    }
    if (s.totalSent >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.totalSent} رسالة أُرسلت — تأكد من المحتوى` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لم تُرسل أي رسائل بعد — اختبر بإرسال بريد تجريبي' };
  }

  if (flagKey === 'parent_dashboard_pro') {
    const s = stats.parent_dashboard_pro;
    if (!s) return null;
    if (s.uniqueChildren >= 3 && s.achievedGoals >= 1) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.uniqueChildren} أطفال بأهداف، ${s.achievedGoals} هدف تم تحقيقه` };
    }
    if (s.totalGoals >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.totalGoals} أهداف — جرّب مع مزيد من الأطفال` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد أهداف — فعّل لمختبرين لتجربة الأهداف' };
  }

  if (flagKey === 'gat_extended_bank') {
    const s = stats.gat_extended_bank;
    if (!s) return null;
    if (s.premiumQuestions >= 100) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.premiumQuestions} سؤال مدفوع، ${s.freeQuestions} مجاني — بنك كافي` };
    }
    if (s.premiumQuestions >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الأسئلة', detail: `${s.premiumQuestions} سؤال مدفوع فقط — يُفضّل ≥ ١٠٠` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد أسئلة مدفوعة — أضف أسئلة بـ tier = premium' };
  }

  if (flagKey === 'mock_tests') {
    const s = stats.mock_tests;
    if (!s) return null;
    if (s.activeTests >= 3 && s.uniqueChildren >= 3 && s.completionRate >= 50) {
      return { level: 'ready', label: 'جاهزة للإطلاق', detail: `${s.activeTests} اختبارات، ${s.uniqueChildren} أطفال، إكمال ${s.completionRate}%` };
    }
    if (s.activeTests >= 1 && s.totalAttempts >= 1) {
      return { level: 'caution', label: 'تحتاج مزيد من الاختبار', detail: `${s.activeTests} اختبارات، ${s.totalAttempts} محاولة — يُفضّل ≥ ٣ اختبارات و ≥ ٣ أطفال` };
    }
    if (s.activeTests >= 1) {
      return { level: 'caution', label: 'بحاجة لمختبرين', detail: `${s.activeTests} اختبارات جاهزة لكن بدون محاولات — فعّل لمختبرين` };
    }
    return { level: 'not_ready', label: 'غير جاهزة', detail: 'لا توجد اختبارات — أنشئ اختبارات محاكاة أولاً' };
  }

  if (flagKey === 'mascot_bunaa') {
    return { level: 'caution', label: 'خاصية تفاعلية', detail: 'شخصية بُنّاء — لا تحتاج بيانات، اختبرها يدوياً' };
  }

  if (flagKey === 'answer_explanations') {
    return { level: 'ready', label: 'جاهزة', detail: 'الشروحات تظهر مع كل سؤال — لا تحتاج بيانات منفصلة' };
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

function AgeGroupTable({ data }: { data: { ageGroup: string; total: number; retired: number; depletionPct: number }[] }) {
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
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(ag.depletionPct, 100)}%` }} />
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
      .then((r) => {
        if (!r.ok) { console.error('[features] stats API returned', r.status); return null; }
        return r.json();
      })
      .then((data) => { if (data) { console.log('[features] stats loaded', Object.keys(data)); setStats(data); } })
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
        <p className="text-sm text-gray-500 mt-1">تحكم في الخصائص واطّلع على إحصائيات كل واحدة</p>
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

      {/* Premium info banner */}
      {stats?._premium && (
        <div className="mb-6 bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-200 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-purple-700 mb-1">نظام الاشتراكات</div>
          <div className="flex gap-4 text-sm">
            <span className="text-purple-600"><strong>{stats._premium.activeSubscriptions}</strong> اشتراك نشط</span>
            <span className="text-blue-600"><strong>{stats._premium.activeCodeActivations}</strong> كود مفعّل</span>
            <span className="text-gray-500">من <strong>{stats._premium.totalParents}</strong> ولي أمر</span>
          </div>
          <p className="text-[11px] text-purple-500 mt-1">الخصائص المفعّلة تعمل فقط للمشتركين + الإيميلات المسموحة</p>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs shrink-0">!</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">
            &times;
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmGlobal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" dir="rtl">
            <h3 className="font-bold text-gray-900 mb-2">تفعيل للمشتركين؟</h3>
            <p className="text-sm text-gray-600 mb-4">
              هذه الخاصية ستكون متاحة فقط للمشتركين (مدفوع/كود/منحة) والإيميلات المسموحة.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmEnableGlobal(confirmGlobal)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                تفعيل
              </button>
              <button
                onClick={() => setConfirmGlobal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
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
                {/* Header */}
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

                {/* Readiness indicator */}
                {readiness && <ReadinessBar readiness={readiness} />}

                {/* Stats metrics */}
                {metrics && metrics.length > 0 && (
                  <div className="px-5 pb-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {metrics.map((m, i) => (
                        <MetricCard key={i} m={m} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Age group table for question_retirement */}
                {ageGroupData.length > 0 && <AgeGroupTable data={ageGroupData} />}

                {/* Stats loading */}
                {statsLoading && !metrics && (
                  <div className="px-5 pb-3">
                    <div className="text-xs text-gray-400 animate-pulse">جاري تحميل الإحصائيات...</div>
                  </div>
                )}

                {/* Expand/collapse */}
                <div className="px-5 pb-1">
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : flag.flagKey)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isExpanded ? 'إخفاء الإعدادات ▲' : 'إعدادات ▼'}
                  </button>
                </div>

                {/* Expanded settings */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-2 border-t border-gray-100 mt-2 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        إيميلات مسموحة {emails.length > 0 && <span className="text-gray-400 font-normal">({emails.length})</span>}
                      </label>
                      <textarea
                        value={state.allowedEmails}
                        onChange={(e) => updateEmails(flag.flagKey, e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none text-left"
                        dir="ltr"
                        rows={2}
                      />
                      {emails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {emails.map((e) => (
                            <span key={e} className="bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5 rounded-md border border-gray-200" dir="ltr">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => saveFlag(flag.flagKey)}
                        disabled={saving[flag.flagKey] || !isDirty}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                      >
                        {saving[flag.flagKey] ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                      {success[flag.flagKey] && (
                        <span className="text-emerald-600 text-sm font-medium">تم الحفظ</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom padding */}
                <div className="h-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
