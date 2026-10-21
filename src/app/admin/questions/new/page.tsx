import QuestionForm from '../_form';
import { ADMIN_AGE_GROUP_VALUES, ADMIN_SKILL_AREA_VALUES } from '@/lib/question-taxonomy';

/** Short skill names accepted in links (e.g. ?skill=logical from the coverage page). */
const SKILL_ALIASES: Record<string, string> = { logical: 'logical_patterns', math: 'quantitative', science: 'scientific' };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ age?: string; skill?: string }> }) {
  const { age, skill: rawSkill } = await searchParams;
  const skill = rawSkill ? (SKILL_ALIASES[rawSkill] ?? rawSkill) : undefined;
  const initial = {
    ...(age && ADMIN_AGE_GROUP_VALUES.has(age) ? { ageGroup: age } : {}),
    ...(skill && ADMIN_SKILL_AREA_VALUES.has(skill) && skill !== 'mixed' ? { skillArea: skill } : {}),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إضافة سؤال جديد</h1>
        <p className="text-gray-500 text-sm mt-0.5">أملأ الحقول أدناه لإضافة سؤال جديد</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <QuestionForm initial={Object.keys(initial).length > 0 ? initial : undefined} />
      </div>
    </div>
  );
}
