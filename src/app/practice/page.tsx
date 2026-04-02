'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, SkillArea } from '@/types';
import { getSkillAreaLabel, getSkillAreaIcon } from '@/lib/utils';
import { useSelectedChild, ChildData } from '@/hooks/useSelectedChild';
import { computeAgeGroupClient } from '@/lib/age-utils';
import Logo from '@/components/ui/Logo';
import ChildSwitcher from '@/components/ui/ChildSwitcher';
import Link from 'next/link';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useGuest } from '@/hooks/useGuest';

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

const AVATARS = ['👦', '👧', '🧒'];
function getAvatar(name: string) {
  return AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
}

export default function PracticePage() {
  const router = useRouter();
  const { children, selectedChild, setSelectedChildId, isLoggedIn, loading } = useSelectedChild();
  const { state } = useGuest();
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillArea>('mixed');
  const showReviewMode = useFeatureFlag('review_mode');
  const [reviewStats, setReviewStats] = useState<{ pending: number } | null>(null);

  // Show child picker step if logged in with multiple children and none selected yet via this flow
  const [childPicked, setChildPicked] = useState(false);
  const showChildPicker = isLoggedIn && children.length > 1 && !childPicked && !loading;

  // Auto-set age group when child is selected
  useEffect(() => {
    if (selectedChild) {
      setSelectedAge(computeAgeGroupClient(selectedChild.age));
    }
  }, [selectedChild]);

  function pickChild(child: ChildData) {
    setSelectedChildId(child.id);
    setChildPicked(true);
    setSelectedAge(computeAgeGroupClient(child.age));
  }

  // If single child, skip picker
  useEffect(() => {
    if (!loading && isLoggedIn && children.length === 1) {
      setChildPicked(true);
    }
  }, [loading, isLoggedIn, children]);

  // Fetch review stats
  useEffect(() => {
    if (!showReviewMode.enabled) return;
    const guestId = state?.guestId;
    const childId = selectedChild?.id;
    if (!guestId && !childId) return;

    const params = new URLSearchParams();
    if (childId) params.set('childId', childId);
    else if (guestId) params.set('guestId', guestId);

    fetch(`/api/review/stats?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setReviewStats(data); })
      .catch(() => {});
  }, [showReviewMode.enabled, state?.guestId, selectedChild?.id]);

  const handleStart = () => {
    if (!selectedAge) return;
    router.push(`/practice/session?age=${selectedAge}&skill=${selectedSkill}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <ChildSwitcher />
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">الرئيسية</Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Child selection step for multiple children */}
        {showChildPicker ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">من يتدرب اليوم؟</h1>
            <p className="text-gray-600 mb-8">اختر الطفل للبدء</p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => pickChild(child)}
                  className={`p-6 rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer ${
                    selectedChild?.id === child.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="text-4xl mb-3">{getAvatar(child.name)}</div>
                  <div className="font-bold text-gray-900 text-base">{child.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{child.age} سنوات</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Review banner */}
            {showReviewMode.enabled && reviewStats && reviewStats.pending > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-amber-800 font-medium text-sm">
                  📝 عندك {reviewStats.pending} {reviewStats.pending === 1 ? 'سؤال يحتاج' : 'أسئلة تحتاج'} مراجعة
                </span>
                <Link
                  href="/practice/review"
                  className="bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-600 transition-colors"
                >
                  ابدأ المراجعة
                </Link>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}
