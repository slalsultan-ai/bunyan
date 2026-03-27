import { getDb } from './index';
import { questions } from './schema';

const q = [
  { id: crypto.randomUUID(), ageGroup: '6-9', skillArea: 'quantitative', subSkill: 'basic_operations', difficulty: 'easy', questionType: 'text', questionTextAr: '٩ + ٩ = ؟', questionImageUrl: null, options: [{ text: '١٦' }, { text: '١٧' }, { text: '١٨' }, { text: '١٩' }], correctOptionIndex: 2, explanationAr: '٩ + ٩ = ١٨', tags: ['addition'], isActive: true },
  { id: crypto.randomUUID(), ageGroup: '6-9', skillArea: 'verbal', subSkill: 'antonyms', difficulty: 'easy', questionType: 'text', questionTextAr: 'ما مضاد كلمة "نظيف"؟', questionImageUrl: null, options: [{ text: 'جميل' }, { text: 'وسخ' }, { text: 'صغير' }, { text: 'ثقيل' }], correctOptionIndex: 1, explanationAr: 'مضاد نظيف هو وسخ', tags: ['antonyms'], isActive: true },
  { id: crypto.randomUUID(), ageGroup: '10-12', skillArea: 'quantitative', subSkill: 'algebra', difficulty: 'medium', questionType: 'text', questionTextAr: 'إذا كان س² = ٤٩، فما قيمة س (الموجبة)؟', questionImageUrl: null, options: [{ text: '٦' }, { text: '٧' }, { text: '٨' }, { text: '٩' }], correctOptionIndex: 1, explanationAr: '٧ × ٧ = ٤٩، إذن س = ٧', tags: ['algebra', 'square_root'], isActive: true },
  { id: crypto.randomUUID(), ageGroup: '10-12', skillArea: 'verbal', subSkill: 'synonyms', difficulty: 'medium', questionType: 'text', questionTextAr: 'ما مرادف كلمة "اجتهد"؟', questionImageUrl: null, options: [{ text: 'كسل' }, { text: 'نام' }, { text: 'سعى' }, { text: 'هرب' }], correctOptionIndex: 2, explanationAr: 'مرادف اجتهد هو سعى وبذل الجهد', tags: ['synonyms'], isActive: true },
  { id: crypto.randomUUID(), ageGroup: '4-5', skillArea: 'verbal', subSkill: 'actions', difficulty: 'easy', questionType: 'audio', questionTextAr: 'ماذا نفعل بالقلم؟', questionImageUrl: null, options: [{ text: 'نأكله' }, { text: 'نكتب به' }, { text: 'نشربه' }, { text: 'نلبسه' }], correctOptionIndex: 1, explanationAr: 'نكتب بالقلم', tags: ['actions', 'objects'], isActive: true },
];

async function main() {
  const db = getDb();
  for (const item of q) await db.insert(questions).values(item);
  console.log('✅ أُضيف 5 أسئلة — الإجمالي 500');
  process.exit(0);
}
main();
