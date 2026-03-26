'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, SkillArea } from '@/types';
import { getSkillAreaLabel, getSkillAreaIcon, getAgeGroupLabel } from '@/lib/utils';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

const AGE_GROUPS: { value: AgeGroup; emoji: string; desc: string }[] = [
  { value: '4-5', emoji: '🌱', desc: 'أسئلة مصورة وأشكال وألوان' },
  { value: '6-9', emoji: '📚', desc: 'أسئلة متنوعة نص وصور' },
  { value: '10-12', emoji: '🚀', desc: 'تمارين متقدمة على مستوى القدرات' },
];

const SKILLS: { value: SkillArea; desc: string }[] = [
  { value: 'quantitative', desc: 'أعداد، عمليات حسابية، مسائل' },
  { value: 'verbal', desc: 'مفردات، تناظر، فهم مقروء' },
  { value: 'logical_patterns', desc: 'أنماط، سلاسل، استنتاج' },
  { value: 'mixed', desc: 'مزيج من كل المهارات' },
];

export default function PracticePage() {
  const router = useRouter();
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillArea>('mixed');

  const handleStart = () => {
    if (!selectedAge) return;
    router.push(`/practice/session?age=${selectedAge}&skill=${selectedSkill}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">الرئيسية</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ابدأ جلسة تدريب</h1>
          <p className="text-gray-600">اختر الفئة العمرية والمهارة للبدء</p>
        </div>

        {/* Age Group */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>👶</span> الفئة العمرية
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {AGE_GROUPS.map(ag => (
              <button
                key={ag.value}
                onClick={() => setSelectedAge(ag.value)}
                className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer
                  ${selectedAge === ag.value
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
              >
                <div className="text-3xl mb-2">{ag.emoji}</div>
                <div className="font-bold text-gray-900 text-sm">{ag.value} سنوات</div>
                <div className="text-xs text-gray-500 mt-1 leading-tight">{ag.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Skill Area */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>🎯</span> المهارة
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SKILLS.map(sk => (
              <button
                key={sk.value}
                onClick={() => setSelectedSkill(sk.value)}
                className={`p-4 rounded-2xl border-2 text-right transition-all duration-200 cursor-pointer
                  ${selectedSkill === sk.value
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
              >
                <div className="text-2xl mb-1.5">{getSkillAreaIcon(sk.value)}</div>
                <div className="font-bold text-gray-900 text-sm">{getSkillAreaLabel(sk.value)}</div>
                <div className="text-xs text-gray-500 mt-1">{sk.desc}</div>
                {sk.value === 'mixed' && (
                  <span className="inline-block mt-1.5 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">موصى به</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!selectedAge}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200
            ${selectedAge
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          {selectedAge ? '🚀 ابدأ الجلسة (10 أسئلة)' : 'اختر الفئة العمرية أولاً'}
        </button>

        {!selectedAge && (
          <p className="text-center text-gray-500 text-sm mt-3">اختر فئة عمرية للمتابعة</p>
        )}
      </div>
    </div>
  );
}
