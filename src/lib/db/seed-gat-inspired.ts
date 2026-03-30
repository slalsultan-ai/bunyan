import { getDb } from './index';
import { questions } from './schema';

/**
 * أسئلة مستوحاة من تجميعات اختبار القدرات العامة (البابطين)
 * تغطي: لفظي، كمي، منطقي × ٣ فئات عمرية × ٣ مستويات صعوبة
 */
const gatInspiredQuestions = [
  // ══════════════════════════════════════
  // القسم اللفظي — ٤-٥ سنوات
  // ══════════════════════════════════════

  // --- تناظر بصري ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'visual_analogy',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'القطة حيوان أليف. أي من هذه حيوان أليف أيضاً؟',
    questionImageUrl: null,
    options: [{ text: 'أرنب' }, { text: 'أسد' }, { text: 'تمساح' }, { text: 'ذئب' }],
    correctOptionIndex: 0,
    explanationAr: 'الأرنب حيوان أليف مثل القطة. أما الأسد والتمساح والذئب فهي حيوانات مفترسة.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'visual_analogy',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'التفاحة فاكهة. أي من هذه فاكهة أيضاً؟',
    questionImageUrl: null,
    options: [{ text: 'جزر' }, { text: 'خس' }, { text: 'موز' }, { text: 'بطاطس' }],
    correctOptionIndex: 2,
    explanationAr: 'الموز فاكهة مثل التفاحة. أما الجزر والخس والبطاطس فهي خضروات.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'visual_analogy',
    ageGroup: '4-5', difficulty: 'medium', questionType: 'image',
    questionTextAr: 'الحذاء نلبسه في القدم. أين نلبس القبعة؟',
    questionImageUrl: null,
    options: [{ text: 'اليد' }, { text: 'الرأس' }, { text: 'القدم' }, { text: 'الرقبة' }],
    correctOptionIndex: 1,
    explanationAr: 'كما نلبس الحذاء في القدم، نلبس القبعة على الرأس. كل شيء له مكانه المناسب.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },

  // --- المفردة الشاذة ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'odd_one_out',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'أيهم لا ينتمي للمجموعة؟',
    questionImageUrl: null,
    options: [{ text: 'سيارة' }, { text: 'طائرة' }, { text: 'تفاحة' }, { text: 'قطار' }],
    correctOptionIndex: 2,
    explanationAr: 'التفاحة فاكهة نأكلها، أما السيارة والطائرة والقطار فكلها وسائل نقل نركبها.',
    tags: ['gat-inspired', 'تجميعات', 'odd-one-out'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'odd_one_out',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'أيهم مختلف عن الباقي؟',
    questionImageUrl: null,
    options: [{ text: 'أحمر' }, { text: 'أخضر' }, { text: 'مربع' }, { text: 'أزرق' }],
    correctOptionIndex: 2,
    explanationAr: 'أحمر وأخضر وأزرق كلها ألوان، أما المربع فهو شكل وليس لوناً.',
    tags: ['gat-inspired', 'تجميعات', 'odd-one-out'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'odd_one_out',
    ageGroup: '4-5', difficulty: 'medium', questionType: 'image',
    questionTextAr: 'واحد من هذه لا يطير. أيهم؟',
    questionImageUrl: null,
    options: [{ text: 'عصفور' }, { text: 'سمكة' }, { text: 'فراشة' }, { text: 'نحلة' }],
    correctOptionIndex: 1,
    explanationAr: 'السمكة تسبح في الماء ولا تطير. أما العصفور والفراشة والنحلة فكلها تطير.',
    tags: ['gat-inspired', 'تجميعات', 'odd-one-out'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم اللفظي — ٦-٩ سنوات
  // ══════════════════════════════════════

  // --- إكمال الجمل ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '6-9', difficulty: 'easy', questionType: 'text',
    questionTextAr: 'الشمس تشرق في ........ وتغرب في ........',
    questionImageUrl: null,
    options: [{ text: 'الصباح — المساء' }, { text: 'المساء — الصباح' }, { text: 'الليل — النهار' }, { text: 'الشتاء — الصيف' }],
    correctOptionIndex: 0,
    explanationAr: 'الشمس تشرق (تظهر) في الصباح وتغرب (تختفي) في المساء. هذا نظام يومي يتكرر كل يوم.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'من لم يتعلم في ........ لم يتقدم في ........',
    questionImageUrl: null,
    options: [{ text: 'كبره — صغره' }, { text: 'صغره — كبره' }, { text: 'بيته — مدرسته' }, { text: 'يومه — ليله' }],
    correctOptionIndex: 1,
    explanationAr: 'المعنى أن التعلم يبدأ من الصغر، فمن لم يتعلم وهو صغير لن يتقدم عندما يكبر. التعلم المبكر أساس النجاح.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'الصديق الحقيقي هو من يقف معك وقت ........ لا وقت ........',
    questionImageUrl: null,
    options: [{ text: 'الفرح — الحزن' }, { text: 'الشدة — الرخاء' }, { text: 'اللعب — الدراسة' }, { text: 'النوم — الأكل' }],
    correctOptionIndex: 1,
    explanationAr: 'الصديق الحقيقي يظهر في الأوقات الصعبة (الشدة)، لأن في أوقات الرخاء والفرح الكل يكون موجوداً.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '6-9', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'النجم الذي يتألق فجأة ينطفئ ........',
    questionImageUrl: null,
    options: [{ text: 'بالتدريج' }, { text: 'ببطء' }, { text: 'فجأة' }, { text: 'قليلاً' }],
    correctOptionIndex: 2,
    explanationAr: 'كما ظهر فجأة، يختفي فجأة أيضاً. المعنى أن النجاح السريع بدون أساس لا يدوم.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },

  // --- التناظر اللفظي ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '6-9', difficulty: 'easy', questionType: 'text',
    questionTextAr: 'بحر : غرق ← نار : ........',
    questionImageUrl: null,
    options: [{ text: 'ماء' }, { text: 'هواء' }, { text: 'حرق' }, { text: 'شرب' }],
    correctOptionIndex: 2,
    explanationAr: 'العلاقة: الشيء وما يمكن أن ينتج عنه من ضرر. البحر قد يسبب غرقاً، والنار قد تسبب حرقاً.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'ماء : حياة ← هواء : ........',
    questionImageUrl: null,
    options: [{ text: 'نبات' }, { text: 'نهار' }, { text: 'تنفس' }, { text: 'قمر' }],
    correctOptionIndex: 2,
    explanationAr: 'العلاقة: الشيء ووظيفته الأساسية للإنسان. الماء ضروري للحياة، والهواء ضروري للتنفس.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'كلمة : جملة ← يوم : ........',
    questionImageUrl: null,
    options: [{ text: 'أسبوع' }, { text: 'رمضان' }, { text: 'دقيقة' }, { text: 'ديوان' }],
    correctOptionIndex: 0,
    explanationAr: 'العلاقة: الجزء والكل. الكلمة جزء من الجملة، واليوم جزء من الأسبوع.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '6-9', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'جندي : ضابط ← شبل : ........',
    questionImageUrl: null,
    options: [{ text: 'أسد' }, { text: 'رداء' }, { text: 'مشتري' }, { text: 'قلعة' }],
    correctOptionIndex: 0,
    explanationAr: 'العلاقة: الصغير والكبير في نفس المجال. الجندي يصبح ضابطاً عندما يترقى، والشبل يكبر ليصبح أسداً.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },

  // --- الخطأ السياقي ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'contextual_error',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'يجب علينا أن نفهم أن ضحك الطفل قد يكون ترجمة لحزنه. أي كلمة لا تناسب المعنى؟',
    questionImageUrl: null,
    options: [{ text: 'نفهم' }, { text: 'ضحك' }, { text: 'ترجمة' }, { text: 'لحزنه' }],
    correctOptionIndex: 1,
    explanationAr: 'الكلمة الخاطئة هي \'ضحك\' لأن الضحك عادة يعبر عن الفرح لا الحزن. الصواب: \'بكاء الطفل قد يكون ترجمة لحزنه\'.',
    tags: ['gat-inspired', 'تجميعات', 'contextual-error'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'contextual_error',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'الأصدقاء كالمظلة كلما اشتد المطر قلّت الحاجة إليها. أي كلمة خاطئة؟',
    questionImageUrl: null,
    options: [{ text: 'الأصدقاء' }, { text: 'المطر' }, { text: 'قلّت' }, { text: 'اشتد' }],
    correctOptionIndex: 2,
    explanationAr: 'الكلمة الخاطئة هي \'قلّت\'. الصواب \'زادت\' لأن المظلة نحتاجها أكثر كلما اشتد المطر، مثل الأصدقاء نحتاجهم أكثر في الأوقات الصعبة.',
    tags: ['gat-inspired', 'تجميعات', 'contextual-error'], isActive: true,
  },

  // --- الارتباط والاختلاف ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'odd_one_out',
    ageGroup: '6-9', difficulty: 'easy', questionType: 'text',
    questionTextAr: 'اختر المفردة الشاذة التي لا تنتمي للمجموعة:',
    questionImageUrl: null,
    options: [{ text: 'مصحف' }, { text: 'مسجد' }, { text: 'صومعة' }, { text: 'كنيسة' }],
    correctOptionIndex: 0,
    explanationAr: 'المصحف كتاب، أما المسجد والصومعة والكنيسة فكلها أماكن للعبادة.',
    tags: ['gat-inspired', 'تجميعات', 'odd-one-out'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'odd_one_out',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'اختر المفردة التي لا تنتمي للمجموعة:',
    questionImageUrl: null,
    options: [{ text: 'نفط' }, { text: 'غاز' }, { text: 'ماء' }, { text: 'فحم' }],
    correctOptionIndex: 2,
    explanationAr: 'النفط والغاز والفحم كلها مصادر للطاقة (وقود)، أما الماء فليس وقوداً.',
    tags: ['gat-inspired', 'تجميعات', 'odd-one-out'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم اللفظي — ١٠-١٢ سنة
  // ══════════════════════════════════════

  // --- إكمال جمل متقدم ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'ما رأيت شيئاً ككثرة ........ يُحبط ........ ويُهلك العمل.',
    questionImageUrl: null,
    options: [{ text: 'الانتقام — الإصلاح' }, { text: 'الجدل — الأمل' }, { text: 'المثقفين — القراءة' }, { text: 'العلماء — التعليم' }],
    correctOptionIndex: 1,
    explanationAr: 'كثرة الجدل تقتل الأمل وتهلك العمل، لأن المجادل ينشغل بالكلام عن الفعل. الجدل يحبط الأمل ويمنع الإنجاز.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'الفقير ليس من فقد ........ ولكن من فقد ........',
    questionImageUrl: null,
    options: [{ text: 'الصديق — الطريق' }, { text: 'الذهب — الأدب' }, { text: 'التقى — الرضا' }, { text: 'النصيحة — المشورة' }],
    correctOptionIndex: 1,
    explanationAr: 'الفقر الحقيقي ليس فقدان المال (الذهب)، بل فقدان الأخلاق (الأدب). فالإنسان بأخلاقه لا بأمواله.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'sentence_completion',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'إذا أقمت الحق فإن الجميع سوف ........ ولكن ليس شرطاً أن ........',
    questionImageUrl: null,
    options: [{ text: 'يحبونك — يهابوك' }, { text: 'يهابوك — يحبونك' }, { text: 'يبغضونك — يحبوك' }, { text: 'يخافونك — يواجهوك' }],
    correctOptionIndex: 1,
    explanationAr: 'من يقيم الحق والعدل يهابه الناس ويحترمونه، لكن ليس بالضرورة أن يحبوه لأن الحق قد يكون مُرّاً على البعض.',
    tags: ['gat-inspired', 'تجميعات', 'sentence-completion'], isActive: true,
  },

  // --- التناظر اللفظي المتقدم ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'غاية : وسيلة ← إدارة : ........',
    questionImageUrl: null,
    options: [{ text: 'تخطيط' }, { text: 'غنى' }, { text: 'وقت' }, { text: 'صمت' }],
    correctOptionIndex: 0,
    explanationAr: 'العلاقة: الهدف والأداة لتحقيقه. الغاية تتحقق بالوسيلة، والإدارة تتحقق بالتخطيط.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'ميقات : إحرام ← مضمار : ........',
    questionImageUrl: null,
    options: [{ text: 'سباق' }, { text: 'فصول' }, { text: 'هديل' }, { text: 'نجاح' }],
    correctOptionIndex: 0,
    explanationAr: 'العلاقة: المكان والفعل الذي يبدأ منه. الميقات هو المكان الذي يبدأ منه الإحرام، والمضمار هو المكان الذي يبدأ منه السباق.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'verbal_analogy',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'صداقة : مصارحة ← نفاق : ........',
    questionImageUrl: null,
    options: [{ text: 'الكمال' }, { text: 'خديعة' }, { text: 'ود' }, { text: 'نهك' }],
    correctOptionIndex: 1,
    explanationAr: 'العلاقة: الصفة وما يصاحبها. الصداقة الحقيقية تقتضي المصارحة، والنفاق يقترن بالخديعة.',
    tags: ['gat-inspired', 'تجميعات', 'analogy'], isActive: true,
  },

  // --- الخطأ السياقي المتقدم ---
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'contextual_error',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'ليس العاقل من يعرف الخير والشر بل العاقل من يعرف الخير فيبعده ويعرف الشر فيجتنبه. أي كلمة خاطئة؟',
    questionImageUrl: null,
    options: [{ text: 'يعرف' }, { text: 'العاقل' }, { text: 'فيبعده' }, { text: 'يجتنب' }],
    correctOptionIndex: 2,
    explanationAr: 'الكلمة الخاطئة \'فيبعده\'. الصواب \'فيتبعه\' لأن العاقل يتبع الخير ولا يبعده. أما الشر فيجتنبه.',
    tags: ['gat-inspired', 'تجميعات', 'contextual-error'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'verbal', subSkill: 'contextual_error',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'الإنسان الجاهل هو الذي يغضب من غير شيء ويكتم السر ويثق في كل الناس. أي كلمة لا تناسب؟',
    questionImageUrl: null,
    options: [{ text: 'الجاهل' }, { text: 'يكتم' }, { text: 'يغضب' }, { text: 'يثق' }],
    correctOptionIndex: 1,
    explanationAr: 'الكلمة الخاطئة \'يكتم\'. الجاهل لا يكتم السر بل يفشيه. الصواب: \'يفشي السر\'.',
    tags: ['gat-inspired', 'تجميعات', 'contextual-error'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم الكمي — ٤-٥ سنوات
  // ══════════════════════════════════════
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'counting',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'أيهم أكثر: ٣ تفاحات أم ٥ تفاحات؟',
    questionImageUrl: null,
    options: [{ text: '٣ تفاحات' }, { text: '٥ تفاحات' }, { text: 'متساويان' }, { text: 'لا أعرف' }],
    correctOptionIndex: 1,
    explanationAr: '٥ أكبر من ٣، فـ ٥ تفاحات أكثر من ٣ تفاحات.',
    tags: ['gat-inspired', 'تجميعات', 'counting'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'comparison',
    ageGroup: '4-5', difficulty: 'medium', questionType: 'image',
    questionTextAr: 'عند سارة ٤ بالونات. أعطتها أمها ٢ أخرى. كم بالون مع سارة الآن؟',
    questionImageUrl: null,
    options: [{ text: '٥' }, { text: '٦' }, { text: '٧' }, { text: '٣' }],
    correctOptionIndex: 1,
    explanationAr: '٤ + ٢ = ٦. عندما نضيف ٢ إلى ٤ نحصل على ٦ بالونات.',
    tags: ['gat-inspired', 'تجميعات', 'addition'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم الكمي — ٦-٩ سنوات
  // ══════════════════════════════════════

  // --- أنماط عددية ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'number_patterns',
    ageGroup: '6-9', difficulty: 'easy', questionType: 'text',
    questionTextAr: 'ما العدد التالي في السلسلة: ٢، ٤، ٦، ٨، ...؟',
    questionImageUrl: null,
    options: [{ text: '٩' }, { text: '١٠' }, { text: '١١' }, { text: '١٢' }],
    correctOptionIndex: 1,
    explanationAr: 'نلاحظ أن كل عدد يزيد عن الذي قبله بـ ٢. فالعدد التالي بعد ٨ هو ٨ + ٢ = ١٠.',
    tags: ['gat-inspired', 'تجميعات', 'patterns'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'number_patterns',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'أكمل النمط: ١، ٣، ٥، ٧، ...؟',
    questionImageUrl: null,
    options: [{ text: '٨' }, { text: '٩' }, { text: '١٠' }, { text: '١١' }],
    correctOptionIndex: 1,
    explanationAr: 'هذه الأعداد الفردية المتتالية. كل عدد يزيد عن سابقه بـ ٢. فالعدد التالي: ٧ + ٢ = ٩.',
    tags: ['gat-inspired', 'تجميعات', 'patterns'], isActive: true,
  },

  // --- مسائل كلامية ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'word_problems',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'اشترى أحمد ٣ كتب بنفس السعر ودفع ٢٤ ريالاً. كم سعر الكتاب الواحد؟',
    questionImageUrl: null,
    options: [{ text: '٦ ريالات' }, { text: '٧ ريالات' }, { text: '٨ ريالات' }, { text: '٩ ريالات' }],
    correctOptionIndex: 2,
    explanationAr: 'نقسم المبلغ الكلي على عدد الكتب: ٢٤ ÷ ٣ = ٨ ريالات لكل كتاب.',
    tags: ['gat-inspired', 'تجميعات', 'word-problem', 'division'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'word_problems',
    ageGroup: '6-9', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'مع سارة ضعف ما مع أحمد من النقود. إذا كان مع أحمد ١٥ ريالاً، كم مع سارة؟',
    questionImageUrl: null,
    options: [{ text: '٢٠' }, { text: '٢٥' }, { text: '٣٠' }, { text: '٣٥' }],
    correctOptionIndex: 2,
    explanationAr: 'ضعف العدد يعني نضربه في ٢. ضعف ١٥ = ١٥ × ٢ = ٣٠ ريالاً.',
    tags: ['gat-inspired', 'تجميعات', 'word-problem', 'multiplication'], isActive: true,
  },

  // --- نسب ومقارنات ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'fractions_basics',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'إذا كان عند سارة ١٢ تفاحة وأعطت أخاها ربعها، كم تفاحة بقيت معها؟',
    questionImageUrl: null,
    options: [{ text: '٣' }, { text: '٩' }, { text: '٨' }, { text: '٦' }],
    correctOptionIndex: 1,
    explanationAr: 'ربع ١٢ = ١٢ ÷ ٤ = ٣ تفاحات أعطتها. بقي معها: ١٢ - ٣ = ٩ تفاحات.',
    tags: ['gat-inspired', 'تجميعات', 'fractions'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم الكمي — ١٠-١٢ سنة
  // ══════════════════════════════════════

  // --- أنماط عددية متقدمة ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'number_patterns',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'أكمل النمط: ٢، ٦، ١٤، ٣٠، ...؟',
    questionImageUrl: null,
    options: [{ text: '٦٢' }, { text: '٦٠' }, { text: '٥٦' }, { text: '٤٢' }],
    correctOptionIndex: 0,
    explanationAr: 'النمط: كل عدد = (العدد السابق × ٢) + ٢. فـ ٣٠ × ٢ + ٢ = ٦٢.',
    tags: ['gat-inspired', 'تجميعات', 'patterns'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'number_patterns',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'أكمل النمط: ١/٣، ١/٥، ١/٧، ...؟',
    questionImageUrl: null,
    options: [{ text: '١/٨' }, { text: '١/١٠' }, { text: '١/١١' }, { text: '١/٩' }],
    correctOptionIndex: 3,
    explanationAr: 'المقامات هي: ٣، ٥، ٧ (تزيد بمقدار ٢). فالعدد التالي مقامه ٩ → ١/٩.',
    tags: ['gat-inspired', 'تجميعات', 'patterns', 'fractions'], isActive: true,
  },

  // --- نسب مئوية ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'percentages',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'جوال قيمته ٢٧٠٠ ريال بعد خصم ١٠٪. ما المبلغ الأصلي؟',
    questionImageUrl: null,
    options: [{ text: '٢٧٠٠ ريال' }, { text: '٦٠٠٠ ريال' }, { text: '٢٥٠٠ ريال' }, { text: '٣٠٠٠ ريال' }],
    correctOptionIndex: 3,
    explanationAr: 'إذا كان السعر بعد خصم ١٠٪ = ٢٧٠٠، فـ ٩٠٪ من الأصلي = ٢٧٠٠. الأصلي = ٢٧٠٠ ÷ ٠.٩ = ٣٠٠٠ ريال.',
    tags: ['gat-inspired', 'تجميعات', 'percentages'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'percentages',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'راعي غنم باع ٧٥٪ من غنمه وبقي له ١٠٠ رأس. كم كان عددهم الإجمالي؟',
    questionImageUrl: null,
    options: [{ text: '٣٥٠' }, { text: '٤٠٠' }, { text: '٦٠٠' }, { text: '٨٠٠' }],
    correctOptionIndex: 1,
    explanationAr: 'باع ٧٥٪ وبقي ٢٥٪ = ١٠٠ رأس. إذاً ١٠٠٪ = ١٠٠ ÷ ٠.٢٥ = ٤٠٠ رأس.',
    tags: ['gat-inspired', 'تجميعات', 'percentages'], isActive: true,
  },

  // --- مقارنة كمية ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'quantitative_comparison',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'طائرة سرعتها ٦٠٠ كم/ساعة لمدة ٣ ساعات، وطائرة أخرى سرعتها ٣٨٠ كم/ساعة لمدة ٥ ساعات. أيهما قطعت مسافة أكبر؟',
    questionImageUrl: null,
    options: [{ text: 'الأولى' }, { text: 'الثانية' }, { text: 'متساويتان' }, { text: 'لا يمكن التحديد' }],
    correctOptionIndex: 1,
    explanationAr: 'الأولى: ٦٠٠ × ٣ = ١٨٠٠ كم. الثانية: ٣٨٠ × ٥ = ١٩٠٠ كم. الثانية قطعت مسافة أكبر.',
    tags: ['gat-inspired', 'تجميعات', 'comparison', 'speed-distance'], isActive: true,
  },

  // --- هندسة ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'geometry',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'مستطيل مساحته ٦٠ م² ومحيطه ٣٢ م. ما الفرق بين طوله وعرضه؟',
    questionImageUrl: null,
    options: [{ text: '٤' }, { text: '٥' }, { text: '٦' }, { text: '٧' }],
    correctOptionIndex: 0,
    explanationAr: 'نصف المحيط = ١٦ = الطول + العرض. المساحة = الطول × العرض = ٦٠. بالتجريب: ١٠ × ٦ = ٦٠ و ١٠ + ٦ = ١٦. الفرق = ١٠ - ٦ = ٤.',
    tags: ['gat-inspired', 'تجميعات', 'geometry'], isActive: true,
  },

  // --- مسائل كلامية متقدمة ---
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'word_problems',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: '٣ عمال يقطعون ٣ ألواح خشبية في ٣ دقائق. كم لوحاً يقطعه ٩ عمال في ٤ ساعات؟',
    questionImageUrl: null,
    options: [{ text: '٢٠' }, { text: '٣٦' }, { text: '٢٧٠' }, { text: '٧٢٠' }],
    correctOptionIndex: 3,
    explanationAr: 'عامل واحد يقطع لوحاً واحداً في ٣ دقائق. ٩ عمال في دقيقة واحدة يقطعون ٣ ألواح. في ٢٤٠ دقيقة (٤ ساعات): ٣ × ٢٤٠ = ٧٢٠ لوحاً.',
    tags: ['gat-inspired', 'تجميعات', 'word-problem', 'rates'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'quantitative', subSkill: 'word_problems',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'آلة ينقص سعرها ٢٠٠ ريال سنوياً وسعرها الآن ١٨٠٠ ريال. كم سيكون سعرها بعد ٧ سنوات؟',
    questionImageUrl: null,
    options: [{ text: '١٠٠' }, { text: '٤٠٠' }, { text: '٥٠٠' }, { text: '١٢٠٠' }],
    correctOptionIndex: 1,
    explanationAr: 'النقص في ٧ سنوات = ٢٠٠ × ٧ = ١٤٠٠ ريال. السعر بعد ٧ سنوات = ١٨٠٠ - ١٤٠٠ = ٤٠٠ ريال.',
    tags: ['gat-inspired', 'تجميعات', 'word-problem', 'depreciation'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم المنطقي — ٤-٥ سنوات
  // ══════════════════════════════════════
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'pattern_recognition',
    ageGroup: '4-5', difficulty: 'easy', questionType: 'image',
    questionTextAr: 'ما الشكل التالي: ⭐ 🌙 ⭐ 🌙 ⭐ ...؟',
    questionImageUrl: null,
    options: [{ text: '⭐' }, { text: '🌙' }, { text: '☀️' }, { text: '⬟' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط يتكرر: نجمة ثم هلال. بعد النجمة يأتي الهلال.',
    tags: ['gat-inspired', 'تجميعات', 'patterns'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'pattern_recognition',
    ageGroup: '4-5', difficulty: 'medium', questionType: 'image',
    questionTextAr: 'رتّب من الأصغر إلى الأكبر: كرة كبيرة، كرة صغيرة، كرة متوسطة',
    questionImageUrl: null,
    options: [{ text: 'صغيرة — متوسطة — كبيرة' }, { text: 'كبيرة — متوسطة — صغيرة' }, { text: 'متوسطة — صغيرة — كبيرة' }, { text: 'صغيرة — كبيرة — متوسطة' }],
    correctOptionIndex: 0,
    explanationAr: 'الترتيب من الأصغر للأكبر: صغيرة ثم متوسطة ثم كبيرة.',
    tags: ['gat-inspired', 'تجميعات', 'ordering'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم المنطقي — ٦-٩ سنوات
  // ══════════════════════════════════════
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'logical_reasoning',
    ageGroup: '6-9', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'إذا كان كل الطيور لها أجنحة، والعصفور طائر، فإن العصفور:',
    questionImageUrl: null,
    options: [{ text: 'يسبح' }, { text: 'له أجنحة' }, { text: 'يمشي فقط' }, { text: 'ليس له ريش' }],
    correctOptionIndex: 1,
    explanationAr: 'هذا استنتاج منطقي: كل الطيور لها أجنحة + العصفور طائر = العصفور له أجنحة.',
    tags: ['gat-inspired', 'تجميعات', 'deduction'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'sequence_patterns',
    ageGroup: '6-9', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'ما العدد الذي يظهر في النمطين معاً؟ النمط ١: (٩، ١٧، ٢٥، ٣٣، ٤١...) النمط ٢: (١٧، ٢١، ٢٥، ٢٩، ٣٣، ٣٧...)',
    questionImageUrl: null,
    options: [{ text: '٤٠' }, { text: '٤١' }, { text: '٤٥' }, { text: '٥٠' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط ١ يزيد بـ ٨: التالي بعد ٣٣ هو ٤١. النمط ٢ يزيد بـ ٤: التالي بعد ٣٧ هو ٤١. العدد المشترك التالي هو ٤١.',
    tags: ['gat-inspired', 'تجميعات', 'patterns', 'intersection'], isActive: true,
  },

  // ══════════════════════════════════════
  // القسم المنطقي — ١٠-١٢ سنة
  // ══════════════════════════════════════
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'deductive_reasoning',
    ageGroup: '10-12', difficulty: 'medium', questionType: 'text',
    questionTextAr: 'علاقة \'بسبب تفجر الثورة الصناعية\' بما قبلها:',
    questionImageUrl: null,
    options: [{ text: 'نتيجة لما قبلها' }, { text: 'سبب لما قبلها' }, { text: 'نتيجة لما بعدها' }, { text: 'سبب لما بعدها' }],
    correctOptionIndex: 1,
    explanationAr: 'عبارة \'بسبب\' تدل على أن ما بعدها هو السبب لما ذُكر قبلها. فالثورة الصناعية هي سبب ما حدث قبلها في النص.',
    tags: ['gat-inspired', 'تجميعات', 'deduction', 'cause-effect'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'data_analysis',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'في جدول إنتاج أسبوعي: دجاج ٧، بط ٥، حمام ٨. كم يكون إنتاج البط في سنة كاملة (٥٢ أسبوع)؟',
    questionImageUrl: null,
    options: [{ text: '٢٠٠' }, { text: '٢٥٠' }, { text: '٢٦٠' }, { text: '٣٥٠' }],
    correctOptionIndex: 2,
    explanationAr: 'إنتاج البط الأسبوعي = ٥. في سنة = ٥ × ٥٢ = ٢٦٠.',
    tags: ['gat-inspired', 'تجميعات', 'data-analysis'], isActive: true,
  },
  {
    id: crypto.randomUUID(), skillArea: 'logical_patterns', subSkill: 'relationship_analysis',
    ageGroup: '10-12', difficulty: 'hard', questionType: 'text',
    questionTextAr: 'ما العلاقة بين \'انخفاض درجة الحرارة\' و\'الارتفاع عن سطح الأرض\'؟',
    questionImageUrl: null,
    options: [{ text: 'طردية' }, { text: 'عكسية' }, { text: 'لا علاقة' }, { text: 'سببية فقط' }],
    correctOptionIndex: 1,
    explanationAr: 'العلاقة عكسية: كلما زاد الارتفاع عن سطح الأرض، انخفضت درجة الحرارة. أي تتحرك في اتجاهين متعاكسين.',
    tags: ['gat-inspired', 'تجميعات', 'relationships'], isActive: true,
  },
];

export async function seedGatInspired() {
  const db = getDb();
  console.log(`⏳ إضافة ${gatInspiredQuestions.length} سؤال مستوحى من التجميعات...`);
  let added = 0;
  for (const q of gatInspiredQuestions) {
    await db.insert(questions).values(q).onConflictDoNothing();
    added++;
  }
  console.log(`✅ تم إضافة ${added} سؤال من التجميعات.`);
  return added;
}

if (require.main === module) {
  seedGatInspired()
    .then(n => { console.log(`Done: ${n}`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
