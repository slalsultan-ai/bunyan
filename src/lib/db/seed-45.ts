// أسئلة عمر 4-5 — مصممة للأطفال الذين لا يقرأون
// القاعدة: الإجابات إما أرقام، أو إيموجي، أو كلمة واحدة بسيطة جداً
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { questions } from './schema';

const questions45 = [
  // ════════════════════════════
  // كمي — سهل (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🍎؟\n🍎🍎🍎',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد التفاحات: 1، 2، 3. الجواب 3.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🐱؟\n🐱🐱',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: 'نعد القطط: 1، 2. الجواب 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم ⭐؟\n⭐⭐⭐⭐',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد النجوم: 1، 2، 3، 4. الجواب 4.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🐶؟\n🐶',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 0,
    explanationAr: 'هناك كلب واحد فقط. الجواب 1.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🍌؟\n🍌🍌🍌🍌🍌',
    options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد الموز: 1، 2، 3، 4، 5. الجواب 5.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'المقارنة', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما أكثر؟\n🍎🍎  أم  🍎🍎🍎🍎',
    options: [{ text: '🍎🍎' }, { text: '🍎🍎🍎🍎' }, { text: 'متساوي' }, { text: 'لا أعرف' }],
    correctOptionIndex: 1,
    explanationAr: '2 تفاحة أم 4 تفاحة؟ — 4 تفاحات أكثر!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأشكال', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أي شكل 🔵 مستدير؟',
    options: [{ text: '▲ مثلث' }, { text: '⬛ مربع' }, { text: '⬤ دائرة' }, { text: '▬ مستطيل' }],
    correctOptionIndex: 2,
    explanationAr: 'الدائرة ⬤ شكل مستدير بدون زوايا.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🌙؟\n🌙🌙🌙',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد الأقمار: 1، 2، 3. الجواب 3.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'المقارنة', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '3 🐠  أم  1 🐠\nأيهما أقل؟',
    options: [{ text: '3' }, { text: '1' }, { text: 'نفس' }, { text: 'لا أعرف' }],
    correctOptionIndex: 1,
    explanationAr: '1 سمكة أقل من 3 سمكات.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🎈؟\n🎈🎈🎈🎈🎈🎈',
    options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '7' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد البالونات: 1، 2، 3، 4، 5، 6. الجواب 6.',
    tags: []
  },

  // ════════════════════════════
  // كمي — متوسط (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🌟؟\n🌟🌟🌟🌟🌟🌟🌟',
    options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد النجوم: 1، 2، 3، 4، 5، 6، 7. الجواب 7.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍎 + 🍎🍎 = ؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: '1 تفاحة + 2 تفاحة = 3 تفاحات.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐱🐱 + 🐱 = ؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 1,
    explanationAr: '2 قطة + 1 قطة = 3 قطط.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔵🔴🔵🔴 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: أحمر 🔴 ثم أزرق 🔵. بعد الأحمر يأتي الأزرق 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما الرقم بعد 7؟\n1 2 3 4 5 6 7 ___',
    options: [{ text: '6' }, { text: '8' }, { text: '9' }, { text: '10' }],
    correctOptionIndex: 1,
    explanationAr: 'بعد 7 يأتي 8 في سلسلة العد.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'المقارنة', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '9 أم 6 — أيهما أكبر؟',
    options: [{ text: '6' }, { text: '9' }, { text: 'نفس' }, { text: 'لا أعرف' }],
    correctOptionIndex: 1,
    explanationAr: '9 أكبر من 6.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الطرح', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كان عندي 🎈🎈🎈🎈🎈\nطارت 🎈🎈 — كم بقي؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: '5 بالون - 2 = 3 بالونات بقت.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأشكال', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'المثلث له كم ضلع؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 1,
    explanationAr: 'المثلث ▲ له 3 أضلاع و3 زوايا.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 2 1 2 1 ___',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 1 ثم 2 ثم 1 ثم 2... بعد 1 يأتي 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🐘؟\n🐘🐘🐘🐘🐘🐘🐘🐘',
    options: [{ text: '6' }, { text: '7' }, { text: '8' }, { text: '9' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد الفيلة: 1، 2، 3، 4، 5، 6، 7، 8. الجواب 8.',
    tags: []
  },

  // ════════════════════════════
  // كمي — صعب (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '2 + 2 = ؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 2,
    explanationAr: '2 + 2 = 4. تعد على أصابعك: 1، 2 ثم 3، 4.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐱🐱🐱 + 🐱🐱 = ؟\nكم قطة الآن؟',
    options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 2,
    explanationAr: '3 قطط + 2 قطط = 5 قطط.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الطرح', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍎🍎🍎🍎🍎\nأكلنا 🍎🍎🍎 — كم بقي؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: '5 تفاحات - 3 = 2 تفاحات بقت.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔴🔵🔴🔴🔵🔴🔴 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 🔴🔴🔵 يتكرر. بعد 🔴🔴 يأتي 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'المقارنة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'رتّب: 5 ، 2 ، 8\nمن الأصغر للأكبر؟',
    options: [{ text: '2 ، 5 ، 8' }, { text: '8 ، 5 ، 2' }, { text: '5 ، 2 ، 8' }, { text: '2 ، 8 ، 5' }],
    correctOptionIndex: 0,
    explanationAr: 'من الأصغر للأكبر: 2 ثم 5 ثم 8.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 2 3 4 ___',
    options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد بالترتيب: بعد 4 يأتي 5.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '1 + 1 + 1 = ؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: '1 + 1 + 1 = 3. ثلاثة آحاد تساوي 3.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 3 5 7 ___',
    options: [{ text: '8' }, { text: '9' }, { text: '10' }, { text: '11' }],
    correctOptionIndex: 1,
    explanationAr: 'الأعداد الفردية: 1، 3، 5، 7، 9...',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الطرح', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '4 - 2 = ؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: '4 - 2 = 2. أربعة ناقص اثنين يساوي اثنين.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأشكال', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'المربع ⬛ له كم ضلع؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 2,
    explanationAr: 'المربع ⬛ له 4 أضلاع كلها متساوية.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — سهل (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'السماء 🌤️ لونها؟',
    options: [{ text: '🔴 أحمر' }, { text: '🔵 أزرق' }, { text: '🟢 أخضر' }, { text: '🟡 أصفر' }],
    correctOptionIndex: 1,
    explanationAr: 'السماء 🌤️ لونها أزرق 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'العشب 🌿 لونه؟',
    options: [{ text: '🔴 أحمر' }, { text: '🔵 أزرق' }, { text: '🟢 أخضر' }, { text: '🟡 أصفر' }],
    correctOptionIndex: 2,
    explanationAr: 'العشب 🌿 لونه أخضر 🟢.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐱 هذا الحيوان يقول؟',
    options: [{ text: 'هاو هاو' }, { text: 'مياو' }, { text: 'خوار' }, { text: 'زقزقة' }],
    correctOptionIndex: 1,
    explanationAr: 'القطة 🐱 تقول "مياو".',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐶 هذا الحيوان يقول؟',
    options: [{ text: 'هاو هاو' }, { text: 'مياو' }, { text: 'خوار' }, { text: 'مو مو' }],
    correctOptionIndex: 0,
    explanationAr: 'الكلب 🐶 يقول "هاو هاو".',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌞 الشمس لونها؟',
    options: [{ text: '🔵 أزرق' }, { text: '🟢 أخضر' }, { text: '🟡 أصفر' }, { text: '🔴 أحمر' }],
    correctOptionIndex: 2,
    explanationAr: 'الشمس 🌞 لونها أصفر 🟡.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الأشياء', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍎 هذا؟',
    options: [{ text: 'موزة' }, { text: 'تفاحة' }, { text: 'برتقالة' }, { text: 'عنبة' }],
    correctOptionIndex: 1,
    explanationAr: 'هذه تفاحة 🍎.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐘 هذا الحيوان؟',
    options: [{ text: 'أسد' }, { text: 'زرافة' }, { text: 'فيل' }, { text: 'دب' }],
    correctOptionIndex: 2,
    explanationAr: 'هذا فيل 🐘. له خرطوم طويل.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍌 الموزة لونها؟',
    options: [{ text: '🔴 أحمر' }, { text: '🟡 أصفر' }, { text: '🟢 أخضر' }, { text: '🔵 أزرق' }],
    correctOptionIndex: 1,
    explanationAr: 'الموزة 🍌 لونها أصفر 🟡.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🦁 هذا الحيوان؟',
    options: [{ text: 'نمر' }, { text: 'أسد' }, { text: 'فيل' }, { text: 'قرد' }],
    correctOptionIndex: 1,
    explanationAr: 'هذا أسد 🦁. يعيش في الغابة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الأشياء', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'نستخدم ✏️ لـ؟',
    options: [{ text: 'الأكل' }, { text: 'الكتابة' }, { text: 'اللعب' }, { text: 'النوم' }],
    correctOptionIndex: 1,
    explanationAr: 'القلم ✏️ نستخدمه للكتابة والرسم.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — متوسط (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐘 كبير — 🐭 ؟',
    options: [{ text: 'كبير' }, { text: 'صغير' }, { text: 'طويل' }, { text: 'سريع' }],
    correctOptionIndex: 1,
    explanationAr: 'الفيل 🐘 كبير والفأر 🐭 صغير. هما متضادان.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌞 النهار — 🌙 ؟',
    options: [{ text: 'نهار' }, { text: 'مساء' }, { text: 'ليل' }, { text: 'فجر' }],
    correctOptionIndex: 2,
    explanationAr: 'عكس النهار 🌞 هو الليل 🌙.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس حيواناً؟\n🐱 🐶 🚗 🐟',
    options: [{ text: '🐱' }, { text: '🐶' }, { text: '🚗' }, { text: '🐟' }],
    correctOptionIndex: 2,
    explanationAr: 'السيارة 🚗 ليست حيواناً. القطة والكلب والسمكة حيوانات.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس فاكهة؟\n🍎 🍌 🥕 🍊',
    options: [{ text: '🍎' }, { text: '🍌' }, { text: '🥕' }, { text: '🍊' }],
    correctOptionIndex: 2,
    explanationAr: 'الجزر 🥕 خضروات وليس فاكهة. التفاح والموز والبرتقال فواكه.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '☀️ ساخن — ❄️ ؟',
    options: [{ text: 'ساخن' }, { text: 'دافئ' }, { text: 'بارد' }, { text: 'جاف' }],
    correctOptionIndex: 2,
    explanationAr: 'الشمس ☀️ ساخنة والثلج ❄️ بارد. هما متضادان.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نستخدم للكتابة؟\n✏️ 🍴 📚 ✂️',
    options: [{ text: '✏️' }, { text: '🍴' }, { text: '📚' }, { text: '✂️' }],
    correctOptionIndex: 0,
    explanationAr: 'القلم ✏️ للكتابة. الشوكة للأكل والمقص للقطع.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '⬆️ فوق — ⬇️ ؟',
    options: [{ text: 'فوق' }, { text: 'جانب' }, { text: 'تحت' }, { text: 'أمام' }],
    correctOptionIndex: 2,
    explanationAr: 'عكس فوق ⬆️ هو تحت ⬇️.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نلبسه في قدمينا؟\n👒 🧤 👟 🧣',
    options: [{ text: '👒 قبعة' }, { text: '🧤 قفاز' }, { text: '👟 حذاء' }, { text: '🧣 وشاح' }],
    correctOptionIndex: 2,
    explanationAr: 'الحذاء 👟 نلبسه في قدمينا.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐢 بطيء — 🐇 ؟',
    options: [{ text: 'بطيء' }, { text: 'كسول' }, { text: 'سريع' }, { text: 'صغير' }],
    correctOptionIndex: 2,
    explanationAr: 'السلحفاة 🐢 بطيئة والأرنب 🐇 سريع. هما متضادان.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يطير في السماء؟\n🐟 🐦 🐕 🐘',
    options: [{ text: '🐟 سمكة' }, { text: '🐦 طائر' }, { text: '🐕 كلب' }, { text: '🐘 فيل' }],
    correctOptionIndex: 1,
    explanationAr: 'الطائر 🐦 يطير في السماء بأجنحته.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — صعب (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌧️ المطر — أين يسقط؟',
    options: [{ text: '🏠 البيت' }, { text: '🌍 الأرض' }, { text: '🌊 البحر' }, { text: '⭐ النجوم' }],
    correctOptionIndex: 1,
    explanationAr: 'المطر 🌧️ يسقط من السماء على الأرض 🌍.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍦 الآيس كريم — ماذا يحدث له في ☀️؟',
    options: [{ text: 'يكبر' }, { text: 'يذوب' }, { text: 'يطير' }, { text: 'يصلب' }],
    correctOptionIndex: 1,
    explanationAr: 'الآيس كريم 🍦 يذوب في الحر ☀️.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف المتقدم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يعيش في الماء؟\n🦁 🐋 🐘 🦒',
    options: [{ text: '🦁 أسد' }, { text: '🐋 حوت' }, { text: '🐘 فيل' }, { text: '🦒 زرافة' }],
    correctOptionIndex: 1,
    explanationAr: 'الحوت 🐋 يعيش في الماء. الأسد والفيل والزرافة على الأرض.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🏥 المستشفى — من نجد هناك؟',
    options: [{ text: '👨‍🍳 طباخ' }, { text: '👨‍🏫 معلم' }, { text: '👨‍⚕️ طبيب' }, { text: '👷 بنّاء' }],
    correctOptionIndex: 2,
    explanationAr: 'في المستشفى 🏥 نجد الطبيب 👨‍⚕️ الذي يعالج المرضى.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌱 البذرة — تكبر وتصبح؟',
    options: [{ text: '🐟 سمكة' }, { text: '🌳 شجرة' }, { text: '🏠 بيت' }, { text: '⭐ نجمة' }],
    correctOptionIndex: 1,
    explanationAr: 'البذرة 🌱 تنبت في الأرض وتكبر لتصبح شجرة 🌳.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف المتقدم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'نذهب إلى 🏫 المدرسة لـ؟',
    options: [{ text: 'النوم' }, { text: 'التعلم' }, { text: 'الطبخ' }, { text: 'البناء' }],
    correctOptionIndex: 1,
    explanationAr: 'نذهب إلى المدرسة 🏫 للتعلم وتعلم القراءة والكتابة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐝 النحلة — ماذا تصنع؟',
    options: [{ text: '🥛 لبن' }, { text: '🍯 عسل' }, { text: '🧀 جبن' }, { text: '🥚 بيض' }],
    correctOptionIndex: 1,
    explanationAr: 'النحلة 🐝 تجمع الرحيق وتصنع العسل 🍯.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌙 القمر — يظهر في؟',
    options: [{ text: '☀️ النهار' }, { text: '🌃 الليل' }, { text: '🌅 الفجر' }, { text: '🌄 المساء فقط' }],
    correctOptionIndex: 1,
    explanationAr: 'القمر 🌙 يظهر في الليل 🌃 ويضيء الظلام.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف المتقدم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نأكله؟\n🚗 📚 🍕 ✏️',
    options: [{ text: '🚗 سيارة' }, { text: '📚 كتاب' }, { text: '🍕 بيتزا' }, { text: '✏️ قلم' }],
    correctOptionIndex: 2,
    explanationAr: 'البيتزا 🍕 نأكلها. السيارة والكتاب والقلم لا نأكلها.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الفهم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '❄️ عندما يكون الجو بارداً نلبس؟',
    options: [{ text: '👙 ملابس رياضة' }, { text: '🩳 شورت' }, { text: '🧥 معطف' }, { text: '👒 قبعة صيف' }],
    correctOptionIndex: 2,
    explanationAr: 'في الجو البارد ❄️ نلبس المعطف 🧥 للدفء.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — سهل (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🔴 🔴 🔴 🔵',
    options: [{ text: '🔴 الأول' }, { text: '🔴 الثاني' }, { text: '🔴 الثالث' }, { text: '🔵 الرابع' }],
    correctOptionIndex: 3,
    explanationAr: 'الأولى والثانية والثالثة حمراء، لكن الرابعة زرقاء 🔵 — هي المختلفة!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🐱 🐱 🐶 🐱',
    options: [{ text: '🐱 الأول' }, { text: '🐱 الثاني' }, { text: '🐶 الثالث' }, { text: '🐱 الرابع' }],
    correctOptionIndex: 2,
    explanationAr: 'الأول والثاني والرابع قطط 🐱، لكن الثالث كلب 🐶 — هو المختلف!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n⭐🌙⭐🌙⭐ ___',
    options: [{ text: '⭐' }, { text: '🌙' }, { text: '☀️' }, { text: '💫' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: ⭐ ثم 🌙. بعد ⭐ يأتي 🌙.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'من يطير؟\n🐟 🐦 🐶 🐱',
    options: [{ text: '🐟' }, { text: '🐦' }, { text: '🐶' }, { text: '🐱' }],
    correctOptionIndex: 1,
    explanationAr: 'الطائر 🐦 يطير. السمكة تسبح، والكلب والقطة يمشون.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🍎 🍌 🍎 🍎',
    options: [{ text: '🍎 الأول' }, { text: '🍌 الثاني' }, { text: '🍎 الثالث' }, { text: '🍎 الرابع' }],
    correctOptionIndex: 1,
    explanationAr: 'الأول والثالث والرابع تفاح 🍎، لكن الثاني موزة 🍌 — هي المختلفة!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔴🔴 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 0,
    explanationAr: 'النمط هو تكرار 🔴. التالي هو 🔴.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'من يسبح في الماء؟\n🐦 🐟 🐘 🦁',
    options: [{ text: '🐦 طائر' }, { text: '🐟 سمكة' }, { text: '🐘 فيل' }, { text: '🦁 أسد' }],
    correctOptionIndex: 1,
    explanationAr: 'السمكة 🐟 تعيش وتسبح في الماء.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n▲ ▲ ⬛ ▲',
    options: [{ text: '▲ الأول' }, { text: '▲ الثاني' }, { text: '⬛ الثالث' }, { text: '▲ الرابع' }],
    correctOptionIndex: 2,
    explanationAr: 'الثالث مربع ⬛ وليس مثلثاً ▲ — هو المختلف!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🌞🌧️🌞🌧️🌞 ___',
    options: [{ text: '🌞' }, { text: '🌧️' }, { text: '❄️' }, { text: '🌈' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 🌞 ثم 🌧️. بعد 🌞 يأتي 🌧️.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس طعاماً؟\n🍕 🚗 🍎 🍌',
    options: [{ text: '🍕 بيتزا' }, { text: '🚗 سيارة' }, { text: '🍎 تفاح' }, { text: '🍌 موز' }],
    correctOptionIndex: 1,
    explanationAr: 'السيارة 🚗 ليست طعاماً. البيتزا والتفاح والموز نأكلها.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — متوسط (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔵🟢🔴🔵 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 2,
    explanationAr: 'النمط: 🔴 🔵 🟢 يتكرر. بعد 🔵 يأتي 🟢.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐱 أكبر من 🐭\n🐘 أكبر من 🐱\nمن الأكبر؟',
    options: [{ text: '🐭' }, { text: '🐱' }, { text: '🐘' }, { text: 'نفس' }],
    correctOptionIndex: 2,
    explanationAr: 'الفيل 🐘 أكبر من القطة، والقطة أكبر من الفأر. الفيل 🐘 هو الأكبر.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 2 3 1 2 3 1 ___',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط 1 2 3 يتكرر. بعد 1 يأتي 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما لا يطير؟\n🦅 🦋 🐦 🐘',
    options: [{ text: '🦅 نسر' }, { text: '🦋 فراشة' }, { text: '🐦 طائر' }, { text: '🐘 فيل' }],
    correctOptionIndex: 3,
    explanationAr: 'الفيل 🐘 لا يطير. النسر والفراشة والطائر يطيرون.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🌞🌞🌧️🌞🌞 ___',
    options: [{ text: '🌞' }, { text: '🌧️' }, { text: '❄️' }, { text: '🌈' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 🌞🌞🌧️ يتكرر. بعد 🌞🌞 يأتي 🌧️.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كل 🐱 يقول مياو\nهذا 🐱 — ماذا يقول؟',
    options: [{ text: 'هاو هاو' }, { text: 'مياو' }, { text: 'خوار' }, { text: 'صمت' }],
    correctOptionIndex: 1,
    explanationAr: 'كل القطط تقول مياو، وهذه قطة، إذن تقول مياو.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'الذي يسكن في البحر؟\n🦁 🐠 🐘 🦒',
    options: [{ text: '🦁' }, { text: '🐠' }, { text: '🐘' }, { text: '🦒' }],
    correctOptionIndex: 1,
    explanationAr: 'السمكة 🐠 تسكن في البحر. الأسد والفيل والزرافة على الأرض.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n▲⬛▲⬛▲ ___',
    options: [{ text: '▲' }, { text: '⬛' }, { text: '⬤' }, { text: '▬' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: ▲ ثم ⬛. بعد ▲ يأتي ⬛.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'سارة 🌟 أكبر من نورة\nنورة أكبر من ريم\nمن الأصغر؟',
    options: [{ text: 'سارة' }, { text: 'نورة' }, { text: 'ريم' }, { text: 'نفس' }],
    correctOptionIndex: 2,
    explanationAr: 'سارة > نورة > ريم. ريم هي الأصغر.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس مستديراً؟\n⬤ ⚽ ▲ 🌕',
    options: [{ text: '⬤ دائرة' }, { text: '⚽ كرة' }, { text: '▲ مثلث' }, { text: '🌕 قمر' }],
    correctOptionIndex: 2,
    explanationAr: 'المثلث ▲ ليس مستديراً. الدائرة والكرة والقمر مستديرة.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — صعب (10 أسئلة)
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط المتقدمة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 3 5 7 ___',
    options: [{ text: '8' }, { text: '9' }, { text: '10' }, { text: '11' }],
    correctOptionIndex: 1,
    explanationAr: 'الأعداد الفردية: 1، 3، 5، 7، 9. نضيف 2 في كل مرة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'إذا كانت ☀️ تضيء النهار\nو 🌙 يضيء الليل\nمن يضيء الليل؟',
    options: [{ text: '☀️' }, { text: '🌙' }, { text: '⭐' }, { text: 'لا شيء' }],
    correctOptionIndex: 1,
    explanationAr: 'القمر 🌙 يضيء الليل — هذا ما قاله السؤال.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط المتقدمة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n2 4 6 8 ___',
    options: [{ text: '9' }, { text: '10' }, { text: '11' }, { text: '12' }],
    correctOptionIndex: 1,
    explanationAr: 'الأعداد الزوجية: 2، 4، 6، 8، 10. نضيف 2 في كل مرة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'عندي 🍎🍎🍎\nأعطيت 🍎 لأختي\nكم بقي معي؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: '3 تفاحات - 1 تفاحة = 2 تفاحة بقيت معي.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط المتقدمة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما الرقم المفقود؟\n1 __ 3 4',
    options: [{ text: '1' }, { text: '2' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 1,
    explanationAr: 'السلسلة: 1، 2، 3، 4. الرقم المفقود هو 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐟 يعيش في الماء\nأخذنا 🐟 من الماء\nماذا يحدث له؟',
    options: [{ text: 'يطير' }, { text: 'يموت' }, { text: 'يمشي' }, { text: 'ينام' }],
    correctOptionIndex: 1,
    explanationAr: 'السمكة 🐟 تحتاج الماء للعيش. خارج الماء لا تستطيع التنفس.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط المتقدمة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔴🔵🔴🔴🔵🔴🔴 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 🔴🔴🔵 يتكرر. بعد 🔴🔴 يأتي 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'إذا نام الطفل مبكراً\nسيستيقظ مبكراً\nنام مبكراً — هل يستيقظ مبكراً؟',
    options: [{ text: 'نعم' }, { text: 'لا' }, { text: 'ربما' }, { text: 'لا أعرف' }],
    correctOptionIndex: 0,
    explanationAr: 'نعم! لأن القاعدة قالت: نام مبكراً ← استيقظ مبكراً.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط المتقدمة', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'الرقم المفقود؟\n2 4 __ 8 10',
    options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
    correctOptionIndex: 1,
    explanationAr: 'الأعداد الزوجية: 2، 4، 6، 8، 10. المفقود هو 6.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أحمد 🏆 جاء أول\nخالد جاء بعده\nمحمد جاء آخراً\nمن جاء ثانياً؟',
    options: [{ text: 'أحمد' }, { text: 'خالد' }, { text: 'محمد' }, { text: 'لا أحد' }],
    correctOptionIndex: 1,
    explanationAr: 'الترتيب: أحمد أول، خالد ثانٍ، محمد ثالث. خالد جاء ثانياً.',
    tags: []
  },
];

async function seed45() {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:./local.db' });
  const db = drizzle(client);

  // Delete old 4-5 questions first
  const { sql } = await import('drizzle-orm');
  await client.execute("DELETE FROM questions WHERE age_group = '4-5'");
  console.log('Deleted old 4-5 questions');

  console.log('Seeding 4-5 questions...');
  let count = 0;
  for (const q of questions45) {
    await db.insert(questions).values({
      id: crypto.randomUUID(),
      skillArea: q.skillArea,
      subSkill: q.subSkill,
      ageGroup: q.ageGroup,
      difficulty: q.difficulty,
      questionType: q.questionType as 'text' | 'image',
      questionTextAr: q.questionTextAr,
      questionImageUrl: q.questionImageUrl,
      options: q.options as Array<{ text: string }>,
      correctOptionIndex: q.correctOptionIndex,
      explanationAr: q.explanationAr,
      tags: q.tags,
      isActive: true,
    });
    count++;
  }
  console.log(`Seeded ${count} questions for age 4-5`);
  return count;
}

if (require.main === module) {
  seed45().then(n => { console.log(`Done: ${n}`); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
}
