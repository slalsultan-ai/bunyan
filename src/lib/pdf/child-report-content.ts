// Content helpers for the child PDF report: challenges, exercises, descriptions,
// and parent-letter tip generation. Kept as data-only so it can be reused by
// both the API route (for pre-computation) and the PDF renderer (as fallback).

export type AgeGroup = '4-5' | '6-9' | '10-12' | string;

export interface ChallengeEntry {
  challenge: string;
  exercise: string;
}

// Dictionary keyed by sub-skill Arabic name (as stored in questions.subSkill).
// Includes several aliases for robustness.
const CHALLENGES: Record<string, ChallengeEntry> = {
  // ── كمي ──
  'الطرح': {
    challenge: 'يخلط بين الجمع والطرح في المسائل الكلامية',
    exercise: 'استخدم أصابع اليد أو المكعبات لتمثيل عملية "الأخذ من" بصرياً. مثال: "عندك 5 تفاحات، أكلت 2، كم بقي؟" واجعله يعدّ بيديه.',
  },
  'الجمع': {
    challenge: 'يعتمد على العد البطيء بدل الحساب الذهني',
    exercise: 'تمرين "10 والصديق": كل رقم له "صديق" يكمّل 10 (3+7، 4+6). العب معه حتى يحفظها.',
  },
  'المقارنة': {
    challenge: 'يصعب عليه تحديد "أكبر" و"أصغر" في الأعداد الكبيرة',
    exercise: 'العب معه لعبة "من الأكبر؟" بالبطاقات. كل لاعب يقلب بطاقة والأكبر يفوز. ابدأ بأعداد صغيرة ثم كبّرها.',
  },
  'comparison': {
    challenge: 'يصعب عليه تحديد "أكبر" و"أصغر" في الأعداد',
    exercise: 'العب معه لعبة "من الأكبر؟" بالبطاقات. كل لاعب يقلب بطاقة والأكبر يفوز.',
  },
  'الأنماط': {
    challenge: 'يتعرف على الأنماط البسيطة لكن يصعب عليه الأنماط المركبة',
    exercise: 'ارسم سلسلة ألوان أو أشكال واطلب منه إكمال النمط. ابدأ بنمط من عنصرين (أحمر-أزرق-أحمر-؟) ثم زد التعقيد.',
  },
  'أنماط الأرقام': {
    challenge: 'يصعب عليه اكتشاف العلاقة بين الأرقام المتتالية',
    exercise: 'اكتب سلسلة أرقام (2، 4، 6، ؟) واسأله عن التالي. ناقش معه "كم نزيد كل مرة؟".',
  },
  'التعرف على الأنماط': {
    challenge: 'يحتاج تدريباً على استخراج القاعدة من الأمثلة',
    exercise: 'أريه 3 أمثلة متسلسلة واطلب منه أن يخمّن القاعدة قبل إعطاء المثال الرابع.',
  },
  'العد': {
    challenge: 'يتخطى أرقاماً أثناء العد التنازلي',
    exercise: 'درّبه على العد التنازلي من 20 إلى 0 يومياً، ثم من أرقام مختلفة.',
  },
  'الضرب': {
    challenge: 'يحفظ الجداول دون فهم معناها',
    exercise: 'ارسم مصفوفة نقاط (3×4) واسأله "كم نقطة؟". يربط الضرب بالتجميع البصري.',
  },
  'القسمة': {
    challenge: 'يصعب عليه توزيع عدد على مجموعات متساوية',
    exercise: 'استخدم 12 حبة واطلب منه توزيعها على 3 أطباق بالتساوي. كرر بأعداد مختلفة.',
  },
  'المسائل الكلامية': {
    challenge: 'يتوه في تفاصيل القصة ولا يستخرج المعطيات',
    exercise: 'اقرأ المسألة ثم اسأله: "ماذا نعرف؟ ماذا نريد؟ كيف نحسب؟" قبل الحل.',
  },

  // ── لفظي ──
  'المتضادات': {
    challenge: 'يحتاج توسيع حصيلة المتضادات خارج الكلمات الشائعة',
    exercise: 'لعبة "العكس": قُل كلمة واطلب منه العكس. ابدأ بكلمات بسيطة (كبير/صغير) ثم أصعب (سريع/بطيء).',
  },
  'المترادفات': {
    challenge: 'لا يميّز بين الكلمات المتقاربة في المعنى',
    exercise: 'اقرأ معه قصة قصيرة واسأله: "هل يمكن أن نقول كلمة أخرى بدل هذه؟" مثل: جميل = حسن = رائع.',
  },
  'إكمال الجمل': {
    challenge: 'يختار الكلمة الأولى التي تخطر بباله بدل التفكير في السياق',
    exercise: 'اقرأ جملة وتوقف قبل الكلمة الأخيرة. اعطه 3 خيارات واسأله "أيها يكمل المعنى؟" ناقش لماذا.',
  },
  'sentence_completion': {
    challenge: 'يختار الكلمة الأولى التي تخطر بباله بدل التفكير في السياق',
    exercise: 'اقرأ جملة وتوقف قبل الكلمة الأخيرة. اعطه 3 خيارات واسأله "أيها يكمل المعنى؟".',
  },
  'المسائل اللفظية': {
    challenge: 'يصعب عليه تحويل اللغة إلى خطوات منطقية',
    exercise: 'اقرأ المسألة ببطء واطلب منه إعادة صياغتها بكلماته. ثم حل معه خطوة بخطوة.',
  },
  'أخطاء السياق': {
    challenge: 'يتعامل مع الكلمات منفصلة دون ربطها بالجملة كاملة',
    exercise: 'اقرأ جملة فيها خطأ واطلب منه اكتشافه. مثال: "الشمس تطلع من الغرب".',
  },
  'التشبيهات': {
    challenge: 'يفهم التشبيه المباشر لكن يصعب عليه التشبيه التجريدي',
    exercise: 'اسأله "هذا مثل ماذا؟" عن أشياء يومية. مثال: "القمر مثل صحن".',
  },
  'أعضاء الجسم': {
    challenge: 'يخلط بين الأعضاء الداخلية والخارجية',
    exercise: 'استخدم صورة جسم إنسان وأشِر بإصبعك، واسأله اسم العضو.',
  },
  'المفردات': {
    challenge: 'حصيلة المفردات محدودة لعمره',
    exercise: 'قدّم كلمة جديدة يومياً واستخدمها في 3 جمل مختلفة أمامه.',
  },

  // ── منطقي ──
  'odd_one_out': {
    challenge: 'يصنّف حسب اللون أو الشكل فقط ويتجاهل الوظيفة',
    exercise: 'اعرض 4 صور (3 فواكه + حيوان) واسأله "أيها لا ينتمي؟ لماذا؟" ثم غيّر معيار التصنيف.',
  },
  'الشاذ': {
    challenge: 'يصنّف حسب اللون أو الشكل فقط ويتجاهل الوظيفة',
    exercise: 'اعرض 4 صور (3 فواكه + حيوان) واسأله "أيها لا ينتمي؟ لماذا؟".',
  },
  'التصنيف': {
    challenge: 'يصنّف حسب معيار واحد ولا يرى معايير متعددة',
    exercise: 'أعطه مجموعة أشياء واطلب منه تصنيفها بطريقتين مختلفتين (مرة حسب اللون، مرة حسب الحجم).',
  },
  'التسلسل': {
    challenge: 'يصعب عليه ترتيب الأحداث زمنياً',
    exercise: 'ارسم 4 صور لأحداث يومية (استيقاظ، فطور، مدرسة، نوم) وخلّه يرتبها. ثم استخدم أحداث قصة.',
  },
  'العلاقات': {
    challenge: 'يرى العلاقة السطحية ولا يصل للعلاقة المنطقية',
    exercise: 'لعبة "هذا مثل ذاك": قُل "القلم للكتابة مثل الفرشاة لـ...؟" درّبه على التفكير بالوظائف.',
  },
  'الاستنتاج': {
    challenge: 'يحتاج أدلة كثيرة للوصول لاستنتاج',
    exercise: 'اقرأ قصة قصيرة واسأله "لماذا فعل كذا؟" دعه يستنتج من السياق.',
  },
  'المصفوفات': {
    challenge: 'يتابع بُعداً واحداً ويتجاهل البُعد الآخر',
    exercise: 'ارسم مصفوفة 3×3 من الأشكال واطلب منه ملء الفراغ. ابدأ ببُعد واحد ثم اثنين.',
  },
};

export function getChallengeFor(subSkill: string): ChallengeEntry {
  const normalized = subSkill.trim();
  if (CHALLENGES[normalized]) return CHALLENGES[normalized];
  // Case-insensitive lookup
  const lower = normalized.toLowerCase();
  for (const key of Object.keys(CHALLENGES)) {
    if (key.toLowerCase() === lower) return CHALLENGES[key];
  }
  return {
    challenge: `يحتاج مزيداً من التدريب على ${normalized}`,
    exercise: `خصّص 5 دقائق يومياً لأسئلة تتعلق بـ"${normalized}". راجع مع طفلك الإجابات الخاطئة وناقشوا كيف يتعامل معها في المرة القادمة.`,
  };
}

const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  'المتضادات': 'يفهم العلاقات العكسية بين الكلمات جيداً.',
  'المترادفات': 'يدرك الفروقات الدقيقة في المعاني.',
  'الجمع': 'أساس رياضي قوي للعمليات الحسابية المتقدمة.',
  'المسائل الكلامية': 'يستطيع تحويل المسائل اللفظية إلى عمليات حسابية بسهولة.',
  'أعضاء الجسم': 'معرفة ممتازة بالمفردات المتعلقة بالجسم.',
  'التصنيف': 'قدرة ممتازة على تنظيم المعلومات.',
  'التعرف على الأنماط': 'يكتشف القواعد والعلاقات بسرعة.',
  'أنماط الأرقام': 'فهم قوي للعلاقات العددية.',
  'إكمال الجمل': 'يتعامل مع السياق اللغوي بذكاء.',
  'المقارنة': 'يحلل الفروقات بدقة.',
};

export function getStrengthDescription(subSkill: string): string {
  return STRENGTH_DESCRIPTIONS[subSkill.trim()] ?? 'أداء متميز يدل على استيعاب جيد لهذه المهارة.';
}

// ─── Parent letter tips ──────────────────────────────────────────────────────

const AGE_VISUAL_TIP: Record<string, string> = {
  '4-5': 'استخدم المكعبات أو الأصابع. الأطفال في هذا العمر يتعلمون أفضل حين يرون ويلمسون.',
  '6-9': 'استخدم الورقة والقلم مع رسومات بسيطة. يمكنه الآن ربط المفاهيم بالكتابة.',
  '10-12': 'درّبه على أسئلة مشابهة لاختبار القدرات الفعلي. في هذا العمر يستوعب التدريب المباشر.',
};

const AGE_DURATION_TIP: Record<string, string> = {
  '4-5': '10 دقائق يومياً كافية تماماً. لا تطل المدة — الاستمرارية أهم من الكثافة في هذا العمر.',
  '6-9': '15 دقيقة يومياً مثالية. يمكنك تقسيمها إلى جلستين (صباح ومساء) لو يفقد التركيز.',
  '10-12': '20 دقيقة يومياً مع تمارين تحاكي الاختبار الفعلي. في هذا العمر يستفيد من التدريب المنظّم.',
};

export interface ParentLetterInput {
  ageGroup: AgeGroup;
  weakestSubSkill?: string | null;
  strongestSkillArea?: string | null;
  overallAccuracy: number;
  weeklyAccuracies: number[];
}

export function generateParentTips(input: ParentLetterInput): string[] {
  const tips: string[] = [];
  const visualTip = AGE_VISUAL_TIP[input.ageGroup] ?? AGE_VISUAL_TIP['6-9'];
  const durationTip = AGE_DURATION_TIP[input.ageGroup] ?? AGE_DURATION_TIP['6-9'];

  if (input.weakestSubSkill) {
    tips.push(`"${input.weakestSubSkill}" يحتاج تمثيلاً بصرياً — ${visualTip}`);
  } else {
    tips.push(`ابدأ بجلسة يومية قصيرة — ${visualTip}`);
  }

  if (input.strongestSkillArea) {
    const area = input.strongestSkillArea === 'verbal' ? 'اللفظي'
               : input.strongestSkillArea === 'quantitative' ? 'الكمّي'
               : input.strongestSkillArea === 'logical_patterns' ? 'المنطقي'
               : input.strongestSkillArea;
    tips.push(`نقاط قوّته في ${area} ممتازة — شجّعه بقراءة أو أنشطة إضافية لتعزيز هذه الموهبة.`);
  } else if (input.overallAccuracy >= 75) {
    tips.push('أداؤه العام ممتاز — استمر في الإيقاع الحالي وزد تدريجياً في الصعوبة.');
  } else {
    tips.push('ركّز الآن على بناء الثقة قبل الصعوبة — النجاحات الصغيرة المتكررة تبني عادة التدريب.');
  }

  tips.push(durationTip);

  return tips;
}

export function generateProgressSummary(
  name: string,
  weeklyAccuracies: number[],
  overallAccuracy: number,
  totalSessions: number
): string {
  if (totalSessions === 0) {
    return `${name} لم يبدأ التدريب بعد. جلسة واحدة قصيرة يومياً كفيلة ببناء عادة قوية خلال أسبوع واحد.`;
  }
  if (weeklyAccuracies.length >= 2) {
    const first = weeklyAccuracies[0];
    const last = weeklyAccuracies[weeklyAccuracies.length - 1];
    const diff = last - first;
    if (diff >= 10) {
      return `${name} يُظهر تقدماً ملحوظاً — تحسّنت دقته من ${first}% إلى ${last}% عبر الأسابيع الأخيرة. هذا تحسّن ممتاز يدل على استيعاب جيد وانتظام في التدريب.`;
    }
    if (diff <= -10) {
      return `${name} يمرّ بفترة تحدٍّ — تراجعت الدقة من ${first}% إلى ${last}%. قد يكون بحاجة إلى راحة قصيرة أو تغيير في أسلوب التدريب لاستعادة الحماس.`;
    }
    return `${name} يحافظ على أداء مستقر حول ${overallAccuracy}%. الثبات علامة جيدة — الخطوة التالية هي رفع الصعوبة تدريجياً للنمو.`;
  }
  return `${name} في بداية رحلته مع بُنيان، ومتوسط دقته الحالي ${overallAccuracy}%. الأسابيع القادمة ستكشف اتجاه تطوره.`;
}
