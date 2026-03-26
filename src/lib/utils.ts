import { AgeGroup, SkillArea } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPoints(points: number): string {
  if (points >= 1000) return `${(points / 1000).toFixed(1)}k`;
  return points.toString();
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds} ثانية`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} دقيقة`;
}

export function getAgeGroupLabel(ageGroup: AgeGroup): string {
  const labels: Record<AgeGroup, string> = {
    '4-5': '4 — 5 سنوات',
    '6-9': '6 — 9 سنوات',
    '10-12': '10 — 12 سنة',
  };
  return labels[ageGroup];
}

export function getSkillAreaLabel(skillArea: SkillArea): string {
  const labels: Record<SkillArea, string> = {
    quantitative: 'كمي',
    verbal: 'لفظي',
    logical_patterns: 'تفكير منطقي',
    mixed: 'مزيج',
  };
  return labels[skillArea];
}

export function getSkillAreaIcon(skillArea: SkillArea): string {
  const icons: Record<SkillArea, string> = {
    quantitative: '🔢',
    verbal: '📖',
    logical_patterns: '🧩',
    mixed: '🎯',
  };
  return icons[skillArea];
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function getScoreBg(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-100 text-emerald-700';
  if (percentage >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function generateGuestId(): string {
  return crypto.randomUUID();
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
