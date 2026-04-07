import { getDb } from '../index';
import { questions } from '../schema';
import { sql } from 'drizzle-orm';

/**
 * 50 sample premium questions across all skills, difficulties, and age groups.
 * These serve as test data for the extended question bank feature.
 * Real premium questions will come from GAT 1445/1443 seed files.
 */

interface PremiumQuestion {
  skillArea: string;
  subSkill: string;
  ageGroup: string;
  difficulty: string;
  questionType: string;
  questionTextAr: string;
  options: Array<{ text: string }>;
  correctOptionIndex: number;
  explanationAr: string;
  tags: string[];
}

const PREMIUM_QUESTIONS: PremiumQuestion[] = [
  // ═══ كمي — أنماط عددية ═══
  { skillArea: 'quantitative', subSkill: 'أنماط عددية', ageGroup: '4-5', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما العدد التالي في النمط: 2، 4، 6، ___؟', options: [{ text: '7' }, { text: '8' }, { text: '9' }, { text: '10' }], correctOptionIndex: 1, explanationAr: 'النمط يزيد بمقدار 2 في كل مرة، فالعدد التالي هو 8.', tags: ['أنماط'] },
  { skillArea: 'quantitative', subSkill: 'أنماط عددية', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما العدد التالي في النمط: 3، 6، 12، 24، ___؟', options: [{ text: '36' }, { text: '48' }, { text: '30' }, { text: '42' }], correctOptionIndex: 1, explanationAr: 'كل عدد يُضرب في 2 للحصول على التالي. 24 × 2 = 48.', tags: ['أنماط', 'ضرب'] },
  { skillArea: 'quantitative', subSkill: 'أنماط عددية', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'ما العدد التالي في النمط: 1، 1، 2، 3، 5، 8، ___؟', options: [{ text: '11' }, { text: '13' }, { text: '15' }, { text: '10' }], correctOptionIndex: 1, explanationAr: 'هذا تسلسل فيبوناتشي: كل عدد هو مجموع العددين السابقين. 5 + 8 = 13.', tags: ['فيبوناتشي'] },

  // ═══ كمي — مسائل كلامية ═══
  { skillArea: 'quantitative', subSkill: 'المسائل الكلامية', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'عند سارة 3 تفاحات وأعطاها أخوها 2، كم تفاحة عندها الآن؟', options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '3' }], correctOptionIndex: 1, explanationAr: '3 + 2 = 5 تفاحات.', tags: ['جمع'] },
  { skillArea: 'quantitative', subSkill: 'المسائل الكلامية', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'اشترى أحمد 4 كتب بسعر 15 ريالاً للكتاب، كم دفع؟', options: [{ text: '45 ريال' }, { text: '60 ريال' }, { text: '55 ريال' }, { text: '75 ريال' }], correctOptionIndex: 1, explanationAr: '4 × 15 = 60 ريال.', tags: ['ضرب'] },
  { skillArea: 'quantitative', subSkill: 'المسائل الكلامية', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'إذا كان ثمن 5 كتب 75 ريالاً، فكم ثمن 12 كتاباً؟', options: [{ text: '150 ريال' }, { text: '160 ريال' }, { text: '180 ريال' }, { text: '200 ريال' }], correctOptionIndex: 2, explanationAr: 'سعر الكتاب = 75 ÷ 5 = 15 ريال. سعر 12 كتاب = 12 × 15 = 180 ريال.', tags: ['قسمة', 'ضرب'] },

  // ═══ كمي — الطرح المتقدم ═══
  { skillArea: 'quantitative', subSkill: 'الطرح', ageGroup: '4-5', difficulty: 'medium', questionType: 'text', questionTextAr: 'كان عند خالد 9 بالونات وطار منها 4، كم بقي؟', options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '3' }], correctOptionIndex: 1, explanationAr: '9 - 4 = 5 بالونات.', tags: ['طرح'] },
  { skillArea: 'quantitative', subSkill: 'الطرح', ageGroup: '6-9', difficulty: 'hard', questionType: 'text', questionTextAr: 'ما ناتج 1000 - 347؟', options: [{ text: '653' }, { text: '663' }, { text: '753' }, { text: '647' }], correctOptionIndex: 0, explanationAr: '1000 - 347 = 653.', tags: ['طرح'] },

  // ═══ كمي — المقارنة المتقدمة ═══
  { skillArea: 'quantitative', subSkill: 'المقارنة', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'أيهما أكبر: 3/4 أم 5/7؟', options: [{ text: '3/4' }, { text: '5/7' }, { text: 'متساويان' }, { text: 'لا يمكن المقارنة' }], correctOptionIndex: 0, explanationAr: '3/4 = 0.75 و 5/7 ≈ 0.714. إذن 3/4 أكبر.', tags: ['كسور', 'مقارنة'] },
  { skillArea: 'quantitative', subSkill: 'المقارنة', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'رتّب من الأصغر للأكبر: 45، 32، 67، 51', options: [{ text: '32، 45، 51، 67' }, { text: '32، 45، 67، 51' }, { text: '45، 32، 51، 67' }, { text: '67، 51، 45، 32' }], correctOptionIndex: 0, explanationAr: 'الترتيب التصاعدي: 32 < 45 < 51 < 67.', tags: ['ترتيب'] },

  // ═══ كمي — عمليات متقدمة ═══
  { skillArea: 'quantitative', subSkill: 'العمليات الحسابية', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما قيمة 25% من 240؟', options: [{ text: '48' }, { text: '60' }, { text: '72' }, { text: '80' }], correctOptionIndex: 1, explanationAr: '25% من 240 = 240 × 0.25 = 60.', tags: ['نسبة مئوية'] },
  { skillArea: 'quantitative', subSkill: 'العمليات الحسابية', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'إذا كان x + 7 = 15، فما قيمة 2x؟', options: [{ text: '14' }, { text: '16' }, { text: '22' }, { text: '8' }], correctOptionIndex: 1, explanationAr: 'x = 15 - 7 = 8. إذن 2x = 16.', tags: ['جبر'] },
  { skillArea: 'quantitative', subSkill: 'العمليات الحسابية', ageGroup: '4-5', difficulty: 'hard', questionType: 'text', questionTextAr: 'ما حاصل 7 + 8؟', options: [{ text: '14' }, { text: '15' }, { text: '16' }, { text: '13' }], correctOptionIndex: 1, explanationAr: '7 + 8 = 15.', tags: ['جمع'] },
  { skillArea: 'quantitative', subSkill: 'الهندسة', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'مستطيل طوله 8 سم وعرضه 5 سم، ما محيطه؟', options: [{ text: '26 سم' }, { text: '13 سم' }, { text: '40 سم' }, { text: '30 سم' }], correctOptionIndex: 0, explanationAr: 'محيط المستطيل = 2 × (الطول + العرض) = 2 × (8 + 5) = 26 سم.', tags: ['هندسة'] },
  { skillArea: 'quantitative', subSkill: 'الهندسة', ageGroup: '6-9', difficulty: 'easy', questionType: 'text', questionTextAr: 'كم عدد أضلاع المربع؟', options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }], correctOptionIndex: 1, explanationAr: 'المربع له 4 أضلاع متساوية.', tags: ['أشكال'] },

  // ═══ لفظي — تناظر لفظي ═══
  { skillArea: 'verbal', subSkill: 'التناظر اللفظي', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'قلم : كتابة :: مقص : ___', options: [{ text: 'رسم' }, { text: 'قص' }, { text: 'لصق' }, { text: 'طي' }], correctOptionIndex: 1, explanationAr: 'القلم أداة الكتابة، والمقص أداة القص. العلاقة: أداة ووظيفتها.', tags: ['تناظر'] },
  { skillArea: 'verbal', subSkill: 'التناظر اللفظي', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'طبيب : مستشفى :: معلم : ___', options: [{ text: 'مكتبة' }, { text: 'مدرسة' }, { text: 'مختبر' }, { text: 'ملعب' }], correctOptionIndex: 1, explanationAr: 'الطبيب يعمل في المستشفى والمعلم يعمل في المدرسة. العلاقة: شخص ومكان عمله.', tags: ['تناظر'] },
  { skillArea: 'verbal', subSkill: 'التناظر اللفظي', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'عين : رؤية :: أذن : ___', options: [{ text: 'سمع' }, { text: 'شم' }, { text: 'لمس' }, { text: 'تذوق' }], correctOptionIndex: 0, explanationAr: 'العين للرؤية والأذن للسمع.', tags: ['حواس'] },

  // ═══ لفظي — إكمال جمل ═══
  { skillArea: 'verbal', subSkill: 'إكمال الجمل', ageGroup: '6-9', difficulty: 'easy', questionType: 'text', questionTextAr: 'الشمس تشرق من ___', options: [{ text: 'الغرب' }, { text: 'الشرق' }, { text: 'الشمال' }, { text: 'الجنوب' }], correctOptionIndex: 1, explanationAr: 'الشمس تشرق من الشرق وتغرب في الغرب.', tags: ['معلومات عامة'] },
  { skillArea: 'verbal', subSkill: 'إكمال الجمل', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'العلم نور و ___ ظلام', options: [{ text: 'الليل' }, { text: 'الجهل' }, { text: 'الظلم' }, { text: 'الحزن' }], correctOptionIndex: 1, explanationAr: 'العلم نور والجهل ظلام — تضاد شائع في اللغة العربية.', tags: ['تضاد'] },
  { skillArea: 'verbal', subSkill: 'إكمال الجمل', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'القطة حيوان ___ والكلب حيوان ___', options: [{ text: 'أليف، أليف' }, { text: 'متوحش، أليف' }, { text: 'أليف، متوحش' }, { text: 'بري، بري' }], correctOptionIndex: 0, explanationAr: 'القطة والكلب كلاهما حيوانات أليفة.', tags: ['حيوانات'] },

  // ═══ لفظي — خطأ سياقي ═══
  { skillArea: 'verbal', subSkill: 'الخطأ السياقي', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'أي كلمة لا تنتمي: طائرة، سيارة، قطار، تفاحة', options: [{ text: 'طائرة' }, { text: 'سيارة' }, { text: 'قطار' }, { text: 'تفاحة' }], correctOptionIndex: 3, explanationAr: 'تفاحة ليست وسيلة مواصلات بعكس الباقي.', tags: ['تصنيف'] },
  { skillArea: 'verbal', subSkill: 'الخطأ السياقي', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'أي جملة فيها خطأ: "ذهبت إلى المدرسة لأتعلم"، "أكلت الطعام اللذيذ"، "القمر يضيء في النهار"', options: [{ text: 'الأولى' }, { text: 'الثانية' }, { text: 'الثالثة' }, { text: 'لا يوجد خطأ' }], correctOptionIndex: 2, explanationAr: 'القمر يضيء في الليل وليس النهار.', tags: ['خطأ سياقي'] },

  // ═══ لفظي — مترادفات ═══
  { skillArea: 'verbal', subSkill: 'المترادفات', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما مرادف كلمة "شجاع"؟', options: [{ text: 'جبان' }, { text: 'مقدام' }, { text: 'كريم' }, { text: 'حكيم' }], correctOptionIndex: 1, explanationAr: 'شجاع ومقدام كلمتان مترادفتان بمعنى عدم الخوف.', tags: ['مترادفات'] },
  { skillArea: 'verbal', subSkill: 'المترادفات', ageGroup: '6-9', difficulty: 'easy', questionType: 'text', questionTextAr: 'ما مرادف كلمة "سعيد"؟', options: [{ text: 'حزين' }, { text: 'فرح' }, { text: 'غاضب' }, { text: 'خائف' }], correctOptionIndex: 1, explanationAr: 'سعيد وفرح كلمتان بنفس المعنى.', tags: ['مترادفات'] },
  { skillArea: 'verbal', subSkill: 'المترادفات', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'ما مرادف كلمة "تقاعس"؟', options: [{ text: 'نشاط' }, { text: 'كسل' }, { text: 'سرعة' }, { text: 'ذكاء' }], correctOptionIndex: 1, explanationAr: 'تقاعس وكسل بمعنى التراخي وعدم العمل.', tags: ['مترادفات'] },

  // ═══ لفظي — فهم مقروء ═══
  { skillArea: 'verbal', subSkill: 'فهم المقروء', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: '"الماء ضروري للحياة، ويشكل 70% من جسم الإنسان." — ما نسبة الماء في جسم الإنسان؟', options: [{ text: '50%' }, { text: '60%' }, { text: '70%' }, { text: '80%' }], correctOptionIndex: 2, explanationAr: 'النص يذكر أن الماء يشكل 70% من جسم الإنسان.', tags: ['فهم'] },
  { skillArea: 'verbal', subSkill: 'فهم المقروء', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: '"النحلة حشرة مفيدة تصنع العسل." — ماذا تصنع النحلة؟', options: [{ text: 'الحليب' }, { text: 'العسل' }, { text: 'الخبز' }, { text: 'الزبدة' }], correctOptionIndex: 1, explanationAr: 'النص يذكر أن النحلة تصنع العسل.', tags: ['فهم'] },

  // ═══ لفظي — أضداد ═══
  { skillArea: 'verbal', subSkill: 'الأضداد', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'ما عكس كلمة "كبير"؟', options: [{ text: 'طويل' }, { text: 'صغير' }, { text: 'عريض' }, { text: 'ثقيل' }], correctOptionIndex: 1, explanationAr: 'عكس كبير هو صغير.', tags: ['أضداد'] },
  { skillArea: 'verbal', subSkill: 'الأضداد', ageGroup: '4-5', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما عكس كلمة "سريع"؟', options: [{ text: 'بطيء' }, { text: 'قوي' }, { text: 'طويل' }, { text: 'ثقيل' }], correctOptionIndex: 0, explanationAr: 'عكس سريع هو بطيء.', tags: ['أضداد'] },

  // ═══ منطقي — أنماط بصرية ═══
  { skillArea: 'logical_patterns', subSkill: 'الأنماط البصرية', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'ما الشكل التالي في النمط: دائرة، مربع، دائرة، مربع، ___؟', options: [{ text: 'مثلث' }, { text: 'دائرة' }, { text: 'مربع' }, { text: 'نجمة' }], correctOptionIndex: 1, explanationAr: 'النمط يتكرر: دائرة ثم مربع. الشكل التالي هو دائرة.', tags: ['أنماط'] },
  { skillArea: 'logical_patterns', subSkill: 'الأنماط البصرية', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'في نمط ألوان: أحمر، أزرق، أخضر، أحمر، أزرق، ___؟', options: [{ text: 'أحمر' }, { text: 'أزرق' }, { text: 'أخضر' }, { text: 'أصفر' }], correctOptionIndex: 2, explanationAr: 'النمط يتكرر كل 3 ألوان: أحمر، أزرق، أخضر.', tags: ['أنماط'] },
  { skillArea: 'logical_patterns', subSkill: 'الأنماط البصرية', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'في كل صف يزيد عدد النقاط: 1، 3، 6، 10، ___. ما العدد التالي؟', options: [{ text: '12' }, { text: '14' }, { text: '15' }, { text: '16' }], correctOptionIndex: 2, explanationAr: 'هذه أعداد مثلثية: الفرق بين كل عددين يزيد 1 (2، 3، 4، 5). العدد التالي: 10 + 5 = 15.', tags: ['أنماط مثلثية'] },

  // ═══ منطقي — تصنيف متقدم ═══
  { skillArea: 'logical_patterns', subSkill: 'التصنيف', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'أيّها لا ينتمي للمجموعة: تفاحة، موزة، سيارة، برتقالة؟', options: [{ text: 'تفاحة' }, { text: 'موزة' }, { text: 'سيارة' }, { text: 'برتقالة' }], correctOptionIndex: 2, explanationAr: 'السيارة ليست فاكهة بعكس الباقي.', tags: ['تصنيف'] },
  { skillArea: 'logical_patterns', subSkill: 'التصنيف', ageGroup: '6-9', difficulty: 'medium', questionType: 'text', questionTextAr: 'أيّها لا ينتمي: الأسد، النمر، الحصان، الفهد؟', options: [{ text: 'الأسد' }, { text: 'النمر' }, { text: 'الحصان' }, { text: 'الفهد' }], correctOptionIndex: 2, explanationAr: 'الأسد والنمر والفهد من القطط الكبيرة (السنوريات)، بينما الحصان ليس منها.', tags: ['تصنيف'] },
  { skillArea: 'logical_patterns', subSkill: 'التصنيف', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'أيّها لا ينتمي: 2، 3، 5، 9، 11؟', options: [{ text: '2' }, { text: '3' }, { text: '9' }, { text: '11' }], correctOptionIndex: 2, explanationAr: 'كل الأعداد أولية ما عدا 9 (9 = 3 × 3).', tags: ['أعداد أولية'] },

  // ═══ منطقي — تسلسل منطقي ═══
  { skillArea: 'logical_patterns', subSkill: 'التسلسل المنطقي', ageGroup: '4-5', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما الترتيب الصحيح: تنظيف الأسنان، الاستيقاظ، الذهاب للمدرسة؟', options: [{ text: 'الاستيقاظ، تنظيف الأسنان، الذهاب للمدرسة' }, { text: 'الذهاب للمدرسة، الاستيقاظ، تنظيف الأسنان' }, { text: 'تنظيف الأسنان، الذهاب للمدرسة، الاستيقاظ' }, { text: 'الاستيقاظ، الذهاب للمدرسة، تنظيف الأسنان' }], correctOptionIndex: 0, explanationAr: 'أولاً نستيقظ، ثم ننظف أسناننا، ثم نذهب للمدرسة.', tags: ['تسلسل'] },
  { skillArea: 'logical_patterns', subSkill: 'التسلسل المنطقي', ageGroup: '6-9', difficulty: 'hard', questionType: 'text', questionTextAr: 'أحمد أطول من سعد، وسعد أطول من خالد. من الأقصر؟', options: [{ text: 'أحمد' }, { text: 'سعد' }, { text: 'خالد' }, { text: 'لا يمكن المعرفة' }], correctOptionIndex: 2, explanationAr: 'أحمد > سعد > خالد. إذن خالد هو الأقصر.', tags: ['استدلال'] },
  { skillArea: 'logical_patterns', subSkill: 'التسلسل المنطقي', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'إذا كان كل الطيور تطير، والنسر طائر، فماذا نستنتج؟', options: [{ text: 'النسر لا يطير' }, { text: 'النسر يطير' }, { text: 'النسر سمكة' }, { text: 'لا يمكن الاستنتاج' }], correctOptionIndex: 1, explanationAr: 'بما أن كل الطيور تطير والنسر طائر، إذن النسر يطير. هذا قياس منطقي.', tags: ['قياس منطقي'] },

  // ═══ منطقي — الشاذ ═══
  { skillArea: 'logical_patterns', subSkill: 'الشاذ', ageGroup: '4-5', difficulty: 'easy', questionType: 'text', questionTextAr: 'أيّ لون مختلف عن الباقي: أحمر، أخضر، كرسي، أزرق؟', options: [{ text: 'أحمر' }, { text: 'أخضر' }, { text: 'كرسي' }, { text: 'أزرق' }], correctOptionIndex: 2, explanationAr: 'الكرسي ليس لوناً بعكس الباقي.', tags: ['شاذ'] },
  { skillArea: 'logical_patterns', subSkill: 'الشاذ', ageGroup: '6-9', difficulty: 'easy', questionType: 'text', questionTextAr: 'أيّها الشاذ: كتاب، دفتر، قلم، بيتزا؟', options: [{ text: 'كتاب' }, { text: 'دفتر' }, { text: 'قلم' }, { text: 'بيتزا' }], correctOptionIndex: 3, explanationAr: 'البيتزا ليست أداة مدرسية بعكس الباقي.', tags: ['شاذ'] },
  { skillArea: 'logical_patterns', subSkill: 'الشاذ', ageGroup: '10-12', difficulty: 'medium', questionType: 'text', questionTextAr: 'أيّها الشاذ: القاهرة، الرياض، النيل، دمشق؟', options: [{ text: 'القاهرة' }, { text: 'الرياض' }, { text: 'النيل' }, { text: 'دمشق' }], correctOptionIndex: 2, explanationAr: 'النيل نهر بينما الباقي عواصم عربية.', tags: ['شاذ'] },

  // ═══ منطقي — الاستنتاج ═══
  { skillArea: 'logical_patterns', subSkill: 'الاستنتاج', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'في صف من 30 طالباً، أحمد ترتيبه الخامس من البداية. ما ترتيبه من النهاية؟', options: [{ text: '25' }, { text: '26' }, { text: '24' }, { text: '27' }], correctOptionIndex: 1, explanationAr: 'ترتيبه من النهاية = 30 - 5 + 1 = 26.', tags: ['استنتاج'] },
  { skillArea: 'logical_patterns', subSkill: 'الاستنتاج', ageGroup: '6-9', difficulty: 'hard', questionType: 'text', questionTextAr: 'إذا كان اليوم الثلاثاء، فما اليوم بعد 3 أيام؟', options: [{ text: 'الخميس' }, { text: 'الجمعة' }, { text: 'السبت' }, { text: 'الأحد' }], correctOptionIndex: 1, explanationAr: 'الثلاثاء + 3 أيام = الأربعاء، الخميس، الجمعة.', tags: ['أيام'] },
  { skillArea: 'logical_patterns', subSkill: 'الاستنتاج', ageGroup: '4-5', difficulty: 'hard', questionType: 'text', questionTextAr: 'لو الأرنب أسرع من السلحفاة والسلحفاة أسرع من الحلزون، من الأبطأ؟', options: [{ text: 'الأرنب' }, { text: 'السلحفاة' }, { text: 'الحلزون' }, { text: 'الكل متساوون' }], correctOptionIndex: 2, explanationAr: 'الأرنب > السلحفاة > الحلزون. إذن الحلزون الأبطأ.', tags: ['ترتيب'] },

  // ═══ أسئلة إضافية لتكملة 50 ═══
  { skillArea: 'quantitative', subSkill: 'النسبة والتناسب', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'إذا كانت نسبة البنين إلى البنات 3:2 وعدد الطلاب 25، فكم عدد البنين؟', options: [{ text: '10' }, { text: '15' }, { text: '12' }, { text: '20' }], correctOptionIndex: 1, explanationAr: 'مجموع النسب = 3 + 2 = 5. حصة البنين = (3/5) × 25 = 15.', tags: ['نسبة'] },
  { skillArea: 'verbal', subSkill: 'إكمال الجمل', ageGroup: '10-12', difficulty: 'hard', questionType: 'text', questionTextAr: 'اختر الكلمة المناسبة: "الصبر مفتاح ___"', options: [{ text: 'الحزن' }, { text: 'الفرج' }, { text: 'الألم' }, { text: 'النوم' }], correctOptionIndex: 1, explanationAr: '"الصبر مفتاح الفرج" حكمة عربية مشهورة.', tags: ['حكم'] },
  { skillArea: 'logical_patterns', subSkill: 'العلاقات المكانية', ageGroup: '4-5', difficulty: 'medium', questionType: 'text', questionTextAr: 'القطة فوق الطاولة والكلب تحت الطاولة. أيهما أعلى؟', options: [{ text: 'القطة' }, { text: 'الكلب' }, { text: 'متساويان' }, { text: 'لا أعرف' }], correctOptionIndex: 0, explanationAr: 'فوق الطاولة أعلى من تحتها. القطة أعلى.', tags: ['مكاني'] },
];

export async function seedPremiumQuestions(): Promise<{ imported: number; skipped: number }> {
  const db = getDb();
  let imported = 0;
  let skipped = 0;

  for (const q of PREMIUM_QUESTIONS) {
    try {
      await db.insert(questions).values({
        skillArea: q.skillArea,
        subSkill: q.subSkill,
        ageGroup: q.ageGroup,
        difficulty: q.difficulty,
        questionType: q.questionType,
        questionTextAr: q.questionTextAr,
        questionImageUrl: null,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanationAr: q.explanationAr,
        tags: q.tags,
        isActive: true,
      });

      // Mark as premium via raw SQL (tier/source columns added by migration)
      const [lastRow] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          sql`question_text_ar = ${q.questionTextAr} AND age_group = ${q.ageGroup} AND skill_area = ${q.skillArea}`
        )
        .orderBy(sql`created_at DESC`)
        .limit(1);

      if (lastRow) {
        await db.run(
          sql`UPDATE questions SET tier = 'premium', source = 'gat_adapted' WHERE id = ${lastRow.id}`
        );
      }

      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}
