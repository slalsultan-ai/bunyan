export interface HomeActivity {
  subSkill: string;
  ageGroup: string; // '4-5' | '6-9' | '10-12' | '*'
  activity: string;
  duration: string;
}

const activities: HomeActivity[] = [
  // ── كمي ──
  { subSkill: 'الطرح', ageGroup: '4-5', activity: 'العب مع طفلك لعبة "كم بقي؟" — ضع أمامه 7 مكعبات، خبّئ 3، واسأله كم بقي. كرّر بأعداد مختلفة.', duration: '10 دقائق' },
  { subSkill: 'الطرح', ageGroup: '6-9', activity: 'تمرين "المتجر": أعطه 50 ريالاً وهمياً واطلب منه "شراء" أغراض وحساب الباقي بنفسه.', duration: '15 دقيقة' },
  { subSkill: 'الطرح', ageGroup: '10-12', activity: 'تحدي الطرح السريع: اكتب 10 مسائل طرح بأعداد من 3 خانات وقِس وقت الحل. حاول التحسن كل يوم.', duration: '15 دقيقة' },
  { subSkill: 'comparison', ageGroup: '4-5', activity: 'لعبة "من الأكبر؟" بالبطاقات — كل لاعب يقلب بطاقة والأكبر يفوز. ابدأ بأعداد 1-10.', duration: '10 دقائق' },
  { subSkill: 'comparison', ageGroup: '6-9', activity: 'تحدي المقارنة السريعة: اكتب رقمين على ورقة واسأله أيهما أكبر. زد السرعة تدريجياً.', duration: '10 دقائق' },
  { subSkill: 'الأنماط', ageGroup: '4-5', activity: 'ارسم سلسلة ألوان (أحمر-أزرق-أحمر-أزرق-؟) واطلب منه إكمالها. ثم جرّب أشكال.', duration: '10 دقائق' },
  { subSkill: 'الأنماط', ageGroup: '6-9', activity: 'اكتب سلسلة أرقام (2، 4، 6، 8، ___) واطلب منه اكتشاف القاعدة. جرّب أنماط الضرب.', duration: '15 دقيقة' },
  { subSkill: 'number_patterns', ageGroup: '6-9', activity: 'اكتب سلسلة أرقام (2، 4، 6، 8، ___) واطلب منه اكتشاف القاعدة. جرّب أنماط الضرب.', duration: '15 دقيقة' },
  { subSkill: 'الجمع', ageGroup: '4-5', activity: 'لعبة "10 والصديق": كل رقم له صديق يكمّل 10 (3 وصديقه 7). اصنع بطاقات والعب memory match.', duration: '10 دقائق' },
  { subSkill: 'basic_operations', ageGroup: '4-5', activity: 'عدّ الأشياء في البيت: كم كرسي في الغرفة؟ كم ملعقة على الطاولة؟ اجعله يعد بصوت عالٍ.', duration: '10 دقائق' },
  { subSkill: 'الضرب', ageGroup: '6-9', activity: 'لعبة جدول الضرب: اكتب جدول الضرب من 1 إلى 5 على بطاقات وراجعها يومياً كلعبة.', duration: '10 دقائق' },
  { subSkill: 'القسمة', ageGroup: '6-9', activity: 'وزّع 12 حلوى بالتساوي على 3 أطباق. كم في كل طبق؟ جرّب أعداد مختلفة.', duration: '10 دقائق' },
  { subSkill: 'word_problems', ageGroup: '6-9', activity: 'اقرأ مسألة كلامية واسأله: ما المطلوب؟ ما المعطيات؟ ما العملية؟ درّبه على التحليل.', duration: '15 دقيقة' },
  { subSkill: 'geometry', ageGroup: '4-5', activity: 'ابحث عن الأشكال في البيت: أين المربع؟ أين الدائرة؟ اجعلها لعبة اكتشاف.', duration: '10 دقائق' },
  { subSkill: 'fractions', ageGroup: '6-9', activity: 'اقسم بيتزا أو كعكة إلى أجزاء متساوية. كم أخذنا؟ كم بقي؟ هذا هو الكسر!', duration: '10 دقائق' },

  // ── لفظي ──
  { subSkill: 'المتضادات', ageGroup: '*', activity: 'لعبة "العكس" على العشاء: قُل كلمة واطلب من الجميع قول عكسها. من يجيب أسرع يفوز!', duration: '10 دقائق' },
  { subSkill: 'المترادفات', ageGroup: '*', activity: 'اقرأ قصة قصيرة وتوقف عند كلمة واسأل: "هل تعرف كلمة ثانية بنفس المعنى؟"', duration: '15 دقيقة' },
  { subSkill: 'sentence_completion', ageGroup: '*', activity: 'لعبة "أكمل الجملة": ابدأ جملة واتركه يكملها. مثال: "الطائر يطير في ___".', duration: '10 دقائق' },
  { subSkill: 'verbal_analogy', ageGroup: '6-9', activity: 'لعبة "العلاقات": الشمس والنهار مثل القمر و___؟ ابدأ بعلاقات بسيطة وصعّبها تدريجياً.', duration: '10 دقائق' },
  { subSkill: 'reading_comprehension', ageGroup: '*', activity: 'اقرأ فقرة قصيرة واسأل 3 أسئلة: ماذا حدث؟ لماذا؟ ما رأيك؟', duration: '15 دقيقة' },

  // ── منطقي ──
  { subSkill: 'odd_one_out', ageGroup: '4-5', activity: 'اعرض 4 صور (3 فواكه + حيوان) واسأل: "أيها لا ينتمي للمجموعة؟ لماذا؟"', duration: '10 دقائق' },
  { subSkill: 'odd_one_out', ageGroup: '6-9', activity: 'اكتب 4 كلمات (3 مترابطة + مختلفة) واسأله أيها الشاذ. نوّع معايير التصنيف.', duration: '10 دقائق' },
  { subSkill: 'التسلسل', ageGroup: '*', activity: 'ارسم 4 صور لأحداث مبعثرة واطلب منه ترتيبها زمنياً. ناقش لماذا هذا الترتيب.', duration: '10 دقائق' },
  { subSkill: 'التصنيف', ageGroup: '4-5', activity: 'اجمع أغراض من البيت وصنّفها: حسب اللون، الحجم، النوع. اسأله عن سبب التصنيف.', duration: '10 دقائق' },

  // ── عامة ──
  { subSkill: '*', ageGroup: '4-5', activity: 'اقرأ مع طفلك قصة قصيرة واسأله 3 أسئلة عنها: ماذا حدث أولاً؟ لماذا فعل البطل كذا؟ ماذا تتوقع؟', duration: '15 دقيقة' },
  { subSkill: '*', ageGroup: '6-9', activity: 'لعبة "20 سؤال": فكّر بشيء وخلّ طفلك يسألك أسئلة نعم/لا عشان يكتشفه. يبني التفكير المنطقي.', duration: '15 دقيقة' },
  { subSkill: '*', ageGroup: '10-12', activity: 'حلّوا معاً 3 أسئلة قدرات وناقشوا استراتيجية الحل. كيف تستبعد الخيارات الخاطئة؟', duration: '20 دقيقة' },
];

/**
 * Select a suitable home activity based on weakest sub-skill + age group.
 * Falls back to generic activity if no specific match.
 * Avoids repeating the same sub-skill as last week.
 */
export function selectActivity(
  weakestSubSkill: string | null,
  ageGroup: string,
  lastActivitySubSkill?: string
): HomeActivity {
  // Try exact match (subSkill + ageGroup)
  if (weakestSubSkill && weakestSubSkill !== lastActivitySubSkill) {
    const exact = activities.filter(
      (a) => a.subSkill === weakestSubSkill && (a.ageGroup === ageGroup || a.ageGroup === '*')
    );
    if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];
  }

  // Try any sub-skill for the age group (avoid last)
  if (weakestSubSkill) {
    const byAge = activities.filter(
      (a) => a.subSkill !== '*' && a.subSkill !== lastActivitySubSkill && (a.ageGroup === ageGroup || a.ageGroup === '*')
    );
    if (byAge.length > 0) return byAge[Math.floor(Math.random() * byAge.length)];
  }

  // Fallback: generic activity for age group
  const generic = activities.filter((a) => a.subSkill === '*' && (a.ageGroup === ageGroup || a.ageGroup === '*'));
  if (generic.length > 0) return generic[Math.floor(Math.random() * generic.length)];

  // Last resort
  return activities[activities.length - 1];
}

export { activities };
