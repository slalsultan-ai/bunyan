import type { BunaaExpression } from '@/components/mascot/BunaaAvatar';

export interface BunaaMessage {
  expression: BunaaExpression;
  text: string;
}

export type MessageContext =
  | 'correct_answer'
  | 'wrong_answer'
  | 'streak_3'
  | 'streak_5'
  | 'streak_10'
  | 'streak_broken'
  | 'session_start'
  | 'session_end'
  | 'session_half'
  | 'daily_challenge_start'
  | 'daily_challenge_done'
  | 'star_earned'
  | 'badge_earned'
  | 'level_up'
  | 'comeback'
  | 'first_visit'
  | 'perfect_session'
  | 'hard_question_correct'
  | 'improving_skill'
  | 'idle_30s';

const messages: Record<MessageContext, BunaaMessage[]> = {
  correct_answer: [
    { expression: 'happy', text: 'أحسنت!' },
    { expression: 'happy', text: 'إجابة صحيحة! يا بطل!' },
    { expression: 'happy', text: 'ممتاز! كذا نبني!' },
    { expression: 'happy', text: 'صح! عقلك نشيط اليوم!' },
    { expression: 'happy', text: 'برافو! استمر!' },
    { expression: 'happy', text: 'رائع! أنت تتحسّن!' },
    { expression: 'happy', text: 'يا سلام! حلّيتها!' },
    { expression: 'happy', text: 'بالضبط! أنت ذكي!' },
  ],

  wrong_answer: [
    { expression: 'encouraging', text: 'لا تشيل هم! كل بنّاء يتعلّم من أخطاءه.' },
    { expression: 'encouraging', text: 'تقريباً! المرة الجاية بتجيبها.' },
    { expression: 'encouraging', text: 'محاولة جيدة! جرّب تفكّر فيها بطريقة ثانية.' },
    { expression: 'encouraging', text: 'مو مشكلة! الغلط يعلّمنا.' },
    { expression: 'encouraging', text: 'ما يخالف! التعلّم من الخطأ هو البناء الحقيقي.' },
    { expression: 'encouraging', text: 'حاول مرة ثانية — أنا واثق فيك!' },
    { expression: 'encouraging', text: 'قريب! شوف الشرح وبتفهمها.' },
    { expression: 'encouraging', text: 'الأبطال ما يستسلمون! يلا نكمل.' },
  ],

  streak_3: [
    { expression: 'excited', text: '3 صح ورا بعض! أنت ملتهب!' },
    { expression: 'excited', text: 'سلسلة 3! استمر يا بطل!' },
    { expression: 'happy', text: 'ثلاثة بثلاثة! يلا نكمل!' },
  ],

  streak_5: [
    { expression: 'excited', text: '5 صح ورا بعض! ما شاء الله!' },
    { expression: 'excited', text: 'سلسلة خمسة! أنت معماري حقيقي!' },
    { expression: 'excited', text: 'خمسة على التوالي! مستواك عالي!' },
  ],

  streak_10: [
    { expression: 'excited', text: '10 صح ورا بعض! أنت أسطورة!' },
    { expression: 'excited', text: 'عشرة بدون خطأ! ما شاء الله تبارك الله!' },
  ],

  streak_broken: [
    { expression: 'encouraging', text: 'انكسرت السلسلة — بس لا تقلق، نبدأ وحدة جديدة!' },
    { expression: 'encouraging', text: 'ما يخالف! السلسلة الجاية بتكون أطول!' },
  ],

  session_start: [
    { expression: 'happy', text: 'أهلاً! مستعد نبني اليوم؟' },
    { expression: 'happy', text: 'يلا نبدأ! كل لبنة تقرّبك من الهدف!' },
    { expression: 'happy', text: 'مرحباً! يومك يبدأ بتدريب ممتاز!' },
    { expression: 'happy', text: 'أهلاً وسهلاً! جاهز للتحدي؟' },
    { expression: 'happy', text: 'حيّاك! خلنا نبني شي حلو اليوم!' },
  ],

  session_end: [
    { expression: 'happy', text: 'أحسنت! جلسة ممتازة. نشوفك بكرة!' },
    { expression: 'happy', text: 'عمل رائع اليوم! كل يوم تتحسّن.' },
    { expression: 'happy', text: 'انتهينا! كل جلسة لبنة جديدة في بُنيانك.' },
    { expression: 'happy', text: 'جلسة حلوة! استاهل استراحة.' },
  ],

  session_half: [
    { expression: 'happy', text: 'نص الطريق! أداءك ممتاز — أكمل!' },
    { expression: 'thinking', text: 'وصلنا النص! يلا نكمّل الباقي!' },
  ],

  daily_challenge_start: [
    { expression: 'excited', text: 'تحدي اليوم جاهز! 3 أسئلة بس — يلا!' },
    { expression: 'happy', text: 'وقت التحدي! أبيك تجيب الثلاث!' },
  ],

  daily_challenge_done: [
    { expression: 'excited', text: 'أكملت تحدي اليوم! نجمة جديدة لك!' },
    { expression: 'excited', text: 'تحدي اليوم تمّ! كل يوم نجمة = أنت نجم!' },
  ],

  star_earned: [
    { expression: 'excited', text: 'نجمة جديدة! استمر وبتوصل للوسام!' },
    { expression: 'excited', text: 'حصلت على نجمة! أنت تبني مستقبلك!' },
  ],

  badge_earned: [
    { expression: 'excited', text: 'وسام جديد! 7 أيام متواصلة — أنت بطل!' },
    { expression: 'excited', text: 'مبروك الوسام! ما شاء الله عليك!' },
  ],

  level_up: [
    { expression: 'excited', text: 'ارتفع مستواك! أنت تتطوّر بسرعة!' },
    { expression: 'excited', text: 'مستوى جديد! كل بُنيان يبدأ بلبنة — وأنت بنيت كثير!' },
  ],

  comeback: [
    { expression: 'happy', text: 'وحشتني! حمدلله إنك رجعت!' },
    { expression: 'happy', text: 'أهلاً! كنت أنتظرك! يلا نتدرّب!' },
    { expression: 'encouraging', text: 'رجعت! أهم شي إنك ما وقّفت. يلا نكمل!' },
  ],

  first_visit: [
    { expression: 'excited', text: 'أهلاً فيك! أنا بنّاء، وبكون معك في كل تدريب!' },
    { expression: 'happy', text: 'مرحباً! أنا بنّاء. مع بعض بنبني عقلك لبنة لبنة!' },
  ],

  perfect_session: [
    { expression: 'excited', text: 'كل الإجابات صح! أنت عبقري!' },
    { expression: 'excited', text: 'جلسة مثالية! ما غلطت ولا وحدة!' },
  ],

  hard_question_correct: [
    { expression: 'excited', text: 'حلّيت سؤال صعب! عقلك يشتغل ممتاز!' },
    { expression: 'excited', text: 'هذا سؤال صعب وجبته! فخور فيك!' },
  ],

  improving_skill: [
    { expression: 'happy', text: 'لاحظت إنك تتحسّن! استمر!' },
    { expression: 'happy', text: 'مهاراتك تتطوّر — أشوف الفرق!' },
  ],

  idle_30s: [
    { expression: 'thinking', text: 'تحتاج وقت أكثر؟ لا تستعجل — فكّر بهدوء.' },
    { expression: 'thinking', text: 'خذ وقتك! أحياناً التفكير الهادي يوصّل للجواب.' },
    { expression: 'encouraging', text: 'لو محتار، جرّب تستبعد الخيارات الخاطئة أولاً.' },
  ],
};

/**
 * Pick a random message for the given context.
 * Avoids repeating the same message twice in a row.
 */
export function getBunaaMessage(
  context: MessageContext,
  lastMessageText?: string | null
): BunaaMessage {
  const pool = messages[context];
  if (!pool || pool.length === 0) {
    return { expression: 'happy', text: '' };
  }

  if (pool.length === 1) return pool[0];

  let selected: BunaaMessage;
  do {
    selected = pool[Math.floor(Math.random() * pool.length)];
  } while (selected.text === lastMessageText);

  return selected;
}

/**
 * Pick a message and substitute {name} with the child's name.
 */
export function getPersonalizedMessage(
  context: MessageContext,
  childName: string,
  lastMessageText?: string | null
): BunaaMessage {
  const msg = getBunaaMessage(context, lastMessageText);
  return {
    ...msg,
    text: msg.text.replace('{name}', childName),
  };
}

/** Expose the full dictionary for testing */
export const _messages = messages;
