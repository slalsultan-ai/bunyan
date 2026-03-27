// أسئلة عمر 4-5 — مصممة للأطفال الذين لا يقرأون
// القاعدة الصارمة: الخيارات = إيموجي أو أرقام فقط — صفر كلمات عربية في الخيارات
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
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🦋؟\n🦋🦋🦋🦋🦋🦋',
    options: [{ text: '4' }, { text: '5' }, { text: '6' }, { text: '7' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد الفراشات: 1، 2، 3، 4، 5، 6. الجواب 6.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأشكال', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أي شكل مستدير؟',
    options: [{ text: '▲' }, { text: '⬛' }, { text: '⬤' }, { text: '▬' }],
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
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'كم 🐠؟\n🐠',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 0,
    explanationAr: 'هناك سمكة واحدة فقط. الجواب 1.',
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
    explanationAr: 'النمط: 🔴 ثم 🔵. بعد 🔴 يأتي 🔵.',
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
    questionTextAr: 'أيهما أكبر؟\n9 أم 6',
    options: [{ text: '6' }, { text: '7' }, { text: '8' }, { text: '9' }],
    correctOptionIndex: 3,
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
    questionTextAr: '▲ المثلث له كم ضلع؟',
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
    explanationAr: '2 + 2 = 4.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الجمع', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🐱🐱🐱 + 🐱🐱 = ؟',
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
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الطرح', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '5 - 3 = ؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: '5 - 3 = 2.',
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
    explanationAr: '1 + 1 + 1 = 3.',
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
    explanationAr: '4 - 2 = 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'الأشكال', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '⬛ المربع له كم ضلع؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 2,
    explanationAr: 'المربع ⬛ له 4 أضلاع كلها متساوية.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — سهل (10 أسئلة)
  // الخيارات: إيموجي فقط
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍎 لونه؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 0,
    explanationAr: 'التفاحة 🍎 لونها أحمر 🔴.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌤️ السماء لونها؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'السماء 🌤️ لونها أزرق 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌿 العشب لونه؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 2,
    explanationAr: 'العشب 🌿 لونه أخضر 🟢.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🌞 الشمس لونها؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 3,
    explanationAr: 'الشمس 🌞 لونها أصفر 🟡.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: '🍌 الموزة لونها؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 3,
    explanationAr: 'الموزة 🍌 لونها أصفر 🟡.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المشاعر', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما سعيد؟',
    options: [{ text: '😀' }, { text: '😢' }, { text: '😡' }, { text: '😴' }],
    correctOptionIndex: 0,
    explanationAr: 'الوجه 😀 يبتسم — هذا السعيد.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يطير؟',
    options: [{ text: '🐦' }, { text: '🐶' }, { text: '🐟' }, { text: '🐢' }],
    correctOptionIndex: 0,
    explanationAr: 'الطائر 🐦 يطير في السماء بأجنحته.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يعيش في الماء؟',
    options: [{ text: '🐟' }, { text: '🐶' }, { text: '🦁' }, { text: '🐰' }],
    correctOptionIndex: 0,
    explanationAr: 'السمكة 🐟 تعيش وتسبح في الماء.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما أكبر؟',
    options: [{ text: '🐘' }, { text: '🐭' }, { text: '🐇' }, { text: '🐓' }],
    correctOptionIndex: 0,
    explanationAr: 'الفيل 🐘 هو أكبر الحيوانات هنا.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما من الفواكه؟',
    options: [{ text: '🍎' }, { text: '🚗' }, { text: '🐶' }, { text: '✏️' }],
    correctOptionIndex: 0,
    explanationAr: 'التفاحة 🍎 فاكهة نأكلها.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — متوسط (10 أسئلة)
  // الخيارات: إيموجي فقط
  // ════════════════════════════
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
    explanationAr: 'الجزر 🥕 خضروات وليس فاكهة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نلبسه في القدمين؟',
    options: [{ text: '👒' }, { text: '🧤' }, { text: '👟' }, { text: '🧣' }],
    correctOptionIndex: 2,
    explanationAr: 'الحذاء 👟 نلبسه في قدمينا.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يسبح؟',
    options: [{ text: '🐟' }, { text: '🐶' }, { text: '🦁' }, { text: '🐦' }],
    correctOptionIndex: 0,
    explanationAr: 'السمكة 🐟 تسبح في الماء.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ساخن؟',
    options: [{ text: '☀️' }, { text: '❄️' }, { text: '🌧️' }, { text: '🌙' }],
    correctOptionIndex: 0,
    explanationAr: 'الشمس ☀️ ساخنة والثلج ❄️ بارد.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس مركبة؟\n🚗 🚌 🚂 🐶',
    options: [{ text: '🚗' }, { text: '🚌' }, { text: '🚂' }, { text: '🐶' }],
    correctOptionIndex: 3,
    explanationAr: 'الكلب 🐶 ليس مركبة. السيارة والحافلة والقطار مركبات.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نستخدم للكتابة؟',
    options: [{ text: '✏️' }, { text: '🍴' }, { text: '🚗' }, { text: '🐶' }],
    correctOptionIndex: 0,
    explanationAr: 'القلم ✏️ للكتابة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الوقت', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما في الليل؟',
    options: [{ text: '🌙' }, { text: '☀️' }, { text: '🌞' }, { text: '🌤️' }],
    correctOptionIndex: 0,
    explanationAr: 'القمر 🌙 يظهر في الليل.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما ليس طعاماً؟\n🍕 🍔 🍦 🚗',
    options: [{ text: '🍕' }, { text: '🍔' }, { text: '🍦' }, { text: '🚗' }],
    correctOptionIndex: 3,
    explanationAr: 'السيارة 🚗 ليست طعاماً. البيتزا والبرجر والآيس كريم نأكلها.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المتضادات', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما بارد؟',
    options: [{ text: '❄️' }, { text: '☀️' }, { text: '🔥' }, { text: '🌞' }],
    correctOptionIndex: 0,
    explanationAr: 'الثلج ❄️ بارد والنار 🔥 ساخنة.',
    tags: []
  },

  // ════════════════════════════
  // لفظي — صعب (10 أسئلة)
  // الخيارات: إيموجي فقط
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'أعضاء الجسم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نسمع به؟',
    options: [{ text: '👂' }, { text: '👁️' }, { text: '👃' }, { text: '👄' }],
    correctOptionIndex: 0,
    explanationAr: 'نسمع بالأذن 👂.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'أعضاء الجسم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نرى به؟',
    options: [{ text: '👁️' }, { text: '👂' }, { text: '👃' }, { text: '👄' }],
    correctOptionIndex: 0,
    explanationAr: 'نرى بالعين 👁️.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'أعضاء الجسم', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نشم به؟',
    options: [{ text: '👃' }, { text: '👁️' }, { text: '👂' }, { text: '👄' }],
    correctOptionIndex: 0,
    explanationAr: 'نشم بالأنف 👃.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نأكل به؟',
    options: [{ text: '🍴' }, { text: '✏️' }, { text: '🔑' }, { text: '✂️' }],
    correctOptionIndex: 0,
    explanationAr: 'نأكل بالشوكة 🍴.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'الغريب: 🍎 🍊 🍋 🥦',
    options: [{ text: '🍎' }, { text: '🍊' }, { text: '🍋' }, { text: '🥦' }],
    correctOptionIndex: 3,
    explanationAr: 'البروكلي 🥦 خضروات، والبقية فواكه.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما يضيء؟',
    options: [{ text: '💡' }, { text: '🍎' }, { text: '🚗' }, { text: '🐶' }],
    correctOptionIndex: 0,
    explanationAr: 'المصباح 💡 يضيء الظلام.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الملابس', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'في الشتاء ❄️ نلبس؟',
    options: [{ text: '🧥' }, { text: '👙' }, { text: '👕' }, { text: '🩳' }],
    correctOptionIndex: 0,
    explanationAr: 'في الجو البارد ❄️ نلبس المعطف 🧥 للدفء.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما أطول؟',
    options: [{ text: '🦒' }, { text: '🐭' }, { text: '🐇' }, { text: '🐓' }],
    correctOptionIndex: 0,
    explanationAr: 'الزرافة 🦒 لها رقبة طويلة جداً — هي الأطول.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'الغريب: 🐶 🐱 🐦 🌳',
    options: [{ text: '🐶' }, { text: '🐱' }, { text: '🐦' }, { text: '🌳' }],
    correctOptionIndex: 3,
    explanationAr: 'الشجرة 🌳 ليست حيواناً. الكلب والقطة والطائر حيوانات.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما نجلس عليه؟',
    options: [{ text: '🪑' }, { text: '🍎' }, { text: '🌊' }, { text: '🐶' }],
    correctOptionIndex: 0,
    explanationAr: 'الكرسي 🪑 نجلس عليه.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — سهل (10 أسئلة)
  // الخيارات: إيموجي فقط
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🔴 🔴 🔴 🔵',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'الأولى والثانية والثالثة حمراء 🔴، لكن الرابعة زرقاء 🔵 — هي المختلفة!',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🐱 🐱 🐶 🐱',
    options: [{ text: '🐱' }, { text: '🐶' }, { text: '🐟' }, { text: '🐦' }],
    correctOptionIndex: 1,
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
    options: [{ text: '🍎' }, { text: '🍌' }, { text: '🍊' }, { text: '🍇' }],
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
    options: [{ text: '🐦' }, { text: '🐟' }, { text: '🐘' }, { text: '🦁' }],
    correctOptionIndex: 1,
    explanationAr: 'السمكة 🐟 تعيش وتسبح في الماء.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'easy',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n▲ ▲ ⬛ ▲',
    options: [{ text: '▲' }, { text: '⬛' }, { text: '⬤' }, { text: '▬' }],
    correctOptionIndex: 1,
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
    options: [{ text: '🍕' }, { text: '🚗' }, { text: '🍎' }, { text: '🍌' }],
    correctOptionIndex: 1,
    explanationAr: 'السيارة 🚗 ليست طعاماً. البيتزا والتفاح والموز نأكلها.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — متوسط (10 أسئلة)
  // الخيارات: إيموجي أو أرقام فقط
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
    options: [{ text: '🐭' }, { text: '🐱' }, { text: '🐘' }, { text: '🐇' }],
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
    questionTextAr: 'أيهما مختلف؟\n🔵🔵🔵🔴🔵',
    options: [{ text: '🔵' }, { text: '🔴' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: '🔴 هو المختلف — الباقي كلها زرقاء 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🍎🍌🍎🍌🍎 ___',
    options: [{ text: '🍎' }, { text: '🍌' }, { text: '🍊' }, { text: '🍇' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 🍎 ثم 🍌. بعد 🍎 يأتي 🍌.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🚗 🚗 🚗 🚂 🚗',
    options: [{ text: '🚗' }, { text: '🚂' }, { text: '🚌' }, { text: '✈️' }],
    correctOptionIndex: 1,
    explanationAr: 'القطار 🚂 هو المختلف — الباقي كلها سيارات 🚗.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n⭐⭐🌙⭐⭐🌙⭐⭐ ___',
    options: [{ text: '⭐' }, { text: '🌙' }, { text: '☀️' }, { text: '💫' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: ⭐⭐🌙 يتكرر. بعد ⭐⭐ يأتي 🌙.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'من الأكبر؟\n🐝 🦋 🐘',
    options: [{ text: '🐝' }, { text: '🦋' }, { text: '🐘' }, { text: '🐞' }],
    correctOptionIndex: 2,
    explanationAr: 'الفيل 🐘 أكبر بكثير من النحلة والفراشة.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🟡🟡🟡🔵🟡🟡🟡🔵 ___\nما التالي؟',
    options: [{ text: '🟡' }, { text: '🔵' }, { text: '🔴' }, { text: '🟢' }],
    correctOptionIndex: 0,
    explanationAr: 'النمط: 🟡🟡🟡🔵 يتكرر. بعد 🔵 يأتي 🟡.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'medium',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🐶 🐶 🐶 🐱 🐶',
    options: [{ text: '🐶' }, { text: '🐱' }, { text: '🐟' }, { text: '🐦' }],
    correctOptionIndex: 1,
    explanationAr: '🐱 هو المختلف — الباقي كلها كلاب 🐶.',
    tags: []
  },

  // ════════════════════════════
  // منطقي — صعب (10 أسئلة)
  // الخيارات: إيموجي أو أرقام فقط
  // ════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🟡🔵🔴🟡🔵🔴🟡 ___',
    options: [{ text: '🔴' }, { text: '🟡' }, { text: '🔵' }, { text: '🟢' }],
    correctOptionIndex: 2,
    explanationAr: 'النمط: 🔴🟡🔵 يتكرر. بعد 🔴🟡 يأتي 🔵.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n2 4 6 8 ___',
    options: [{ text: '9' }, { text: '10' }, { text: '11' }, { text: '12' }],
    correctOptionIndex: 1,
    explanationAr: 'الأعداد الزوجية: 2، 4، 6، 8، 10...',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما الناقص؟\n1 2 _ 4 5',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 2,
    explanationAr: 'العدد الناقص بين 2 و4 هو 3.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🐶🐱🐟🐶🐱🐟🐶🐱 ___',
    options: [{ text: '🐶' }, { text: '🐱' }, { text: '🐟' }, { text: '🐦' }],
    correctOptionIndex: 2,
    explanationAr: 'النمط: 🐶🐱🐟 يتكرر. بعد 🐶🐱 يأتي 🐟.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🔴🔴🔴🔵🔴🔴',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: '🔵 هو المختلف — الباقي كلها حمراء 🔴.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n1 1 2 1 1 2 1 1 ___',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: 1 1 2 يتكرر. بعد 1 1 يأتي 2.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n10 9 8 7 ___',
    options: [{ text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط: نطرح 1 في كل مرة. بعد 7 يأتي 6.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🌞🌛⭐🌞🌛⭐🌞🌛 ___',
    options: [{ text: '🌞' }, { text: '🌛' }, { text: '⭐' }, { text: '🌈' }],
    correctOptionIndex: 2,
    explanationAr: 'النمط: 🌞🌛⭐ يتكرر. بعد 🌞🌛 يأتي ⭐.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'ما التالي؟\n🔴🔴🔵🔵🟢🟢🔴🔴🔵🔵 ___',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 2,
    explanationAr: 'النمط: 🔴🔴🔵🔵🟢🟢 يتكرر. بعد 🔵🔵 يأتي 🟢.',
    tags: []
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'hard',
    questionType: 'text', questionImageUrl: null,
    questionTextAr: 'أيهما مختلف؟\n🍎🍎🍎🍊🍎🍎',
    options: [{ text: '🍎' }, { text: '🍊' }, { text: '🍌' }, { text: '🍋' }],
    correctOptionIndex: 1,
    explanationAr: '🍊 هو المختلف — الباقي كلها تفاح 🍎.',
    tags: []
  },

  // ════════════════════════════════════════
  // أسئلة صوتية — يُقرأ السؤال بالصوت 🔊
  // ════════════════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها يطير في السماء؟',
    options: [{ text: '🐦' }, { text: '🐟' }, { text: '🐶' }, { text: '🐢' }],
    correctOptionIndex: 0,
    explanationAr: 'الطائر 🐦 هو من يطير في السماء.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الألوان', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها فاكهة صفراء؟',
    options: [{ text: '🍌' }, { text: '🍎' }, { text: '🍇' }, { text: '🍓' }],
    correctOptionIndex: 0,
    explanationAr: 'الموزة 🍌 فاكهة صفراء اللون.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'ما عدد أصابع يدك الواحدة؟',
    options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 2,
    explanationAr: 'لدينا خمسة أصابع في كل يد.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها حيوان كبير جداً؟',
    options: [{ text: '🐘' }, { text: '🐭' }, { text: '🐝' }, { text: '🐇' }],
    correctOptionIndex: 0,
    explanationAr: 'الفيل 🐘 هو أكبر الحيوانات الأربعة.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'التصنيف', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها نلبسه في قدمينا؟',
    options: [{ text: '👟' }, { text: '👒' }, { text: '🧤' }, { text: '🧣' }],
    correctOptionIndex: 0,
    explanationAr: 'الحذاء 👟 هو ما نلبسه في القدمين.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'الحيوانات', difficulty: 'medium',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها يُعطينا الحليب؟',
    options: [{ text: '🐄' }, { text: '🐟' }, { text: '🦜' }, { text: '🐢' }],
    correctOptionIndex: 0,
    explanationAr: 'البقرة 🐄 هي التي تُعطينا الحليب.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الاستنتاج', difficulty: 'medium',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها يعيش في الماء ويسبح؟',
    options: [{ text: '🐟' }, { text: '🐈' }, { text: '🐔' }, { text: '🐑' }],
    correctOptionIndex: 0,
    explanationAr: 'السمكة 🐟 تعيش في الماء وتسبح.',
    tags: ['audio']
  },
  {
    ageGroup: '4-5', skillArea: 'verbal', subSkill: 'المشاعر', difficulty: 'easy',
    questionType: 'audio', questionImageUrl: null,
    questionTextAr: 'أيٌّ منها وجه سعيد؟',
    options: [{ text: '😀' }, { text: '😢' }, { text: '😡' }, { text: '😴' }],
    correctOptionIndex: 0,
    explanationAr: '😀 هو الوجه السعيد المبتسم.',
    tags: ['audio']
  },

  // ════════════════════════════════════════
  // أسئلة بصرية — رسومات تظهر على الشاشة وتُطبع 🖼️
  // ════════════════════════════════════════
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'image', questionImageUrl: '/q-images/q45-count-2.svg',
    questionTextAr: 'كم؟',
    options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    correctOptionIndex: 1,
    explanationAr: 'نعد: 1، 2. الجواب 2.',
    tags: ['image', 'counting']
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'easy',
    questionType: 'image', questionImageUrl: '/q-images/q45-count-3.svg',
    questionTextAr: 'كم؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 1,
    explanationAr: 'نعد: 1، 2، 3. الجواب 3.',
    tags: ['image', 'counting']
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'medium',
    questionType: 'image', questionImageUrl: '/q-images/q45-count-4.svg',
    questionTextAr: 'كم؟',
    options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد النجوم: 1، 2، 3، 4. الجواب 4.',
    tags: ['image', 'counting']
  },
  {
    ageGroup: '4-5', skillArea: 'quantitative', subSkill: 'العد', difficulty: 'medium',
    questionType: 'image', questionImageUrl: '/q-images/q45-count-5.svg',
    questionTextAr: 'كم؟',
    options: [{ text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }],
    correctOptionIndex: 2,
    explanationAr: 'نعد الكرات: 1، 2، 3، 4، 5. الجواب 5.',
    tags: ['image', 'counting']
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'الأنماط', difficulty: 'medium',
    questionType: 'image', questionImageUrl: '/q-images/q45-pattern-rb.svg',
    questionTextAr: 'ما التالي؟',
    options: [{ text: '🔴' }, { text: '🔵' }, { text: '🟢' }, { text: '🟡' }],
    correctOptionIndex: 1,
    explanationAr: 'النمط أحمر-أزرق يتكرر. بعد الأحمر يأتي الأزرق 🔵.',
    tags: ['image', 'pattern']
  },
  {
    ageGroup: '4-5', skillArea: 'logical_patterns', subSkill: 'ما يختلف', difficulty: 'medium',
    questionType: 'image', questionImageUrl: '/q-images/q45-odd-shape.svg',
    questionTextAr: 'أيهما مختلف؟',
    options: [{ text: '⭕' }, { text: '⬛' }, { text: '🔺' }, { text: '🔷' }],
    correctOptionIndex: 1,
    explanationAr: 'المربع ⬛ مختلف — الباقي كلها دوائر.',
    tags: ['image', 'shapes']
  },
];

async function seed45() {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL ?? 'file:./local.db', ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}) });
  const db = drizzle(client);

  // حذف أسئلة 4-5 القديمة
  await db.delete(questions).where(
    // @ts-ignore
    require('drizzle-orm').eq(questions.ageGroup, '4-5')
  );
  console.log('Deleted old 4-5 questions');

  // إدراج الأسئلة الجديدة
  console.log('Seeding 4-5 questions...');
  const rows = questions45.map(q => ({
    id: crypto.randomUUID(),
    skillArea: q.skillArea,
    subSkill: q.subSkill,
    ageGroup: q.ageGroup,
    difficulty: q.difficulty,
    questionType: q.questionType,
    questionTextAr: q.questionTextAr,
    questionImageUrl: q.questionImageUrl,
    options: q.options,
    correctOptionIndex: q.correctOptionIndex,
    explanationAr: q.explanationAr,
    tags: q.tags,
    isActive: true,
  }));

  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(questions).values(rows.slice(i, i + BATCH)).onConflictDoNothing();
  }

  console.log(`Seeded ${rows.length} questions for age 4-5`);
  console.log('Done:', rows.length);
  client.close();
}

seed45().catch(console.error);
