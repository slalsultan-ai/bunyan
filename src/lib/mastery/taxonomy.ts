/**
 * Unified skill taxonomy for the adaptive-mastery engine (age group 6-9).
 *
 * The questions table carries a noisy `sub_skill` column (English and Arabic
 * names for the same skill, many tiny buckets). Rather than rewriting that
 * column, each unified skill lists the (skill_area, sub_skill) pairs it owns.
 * Questions whose pair is not listed here are ignored by the engine and show
 * up in the admin gaps report.
 *
 * `prerequisites` drive both unlocking (a skill opens once its prerequisites
 * are mastered) and remediation (a stuck child is sent back to the weakest
 * prerequisite). Prerequisites that are excluded for lack of questions are
 * skipped, so they never block a child.
 */

/** A mastery track: an age group of the general bank, or a dedicated exam bank. */
export type MasteryTrack = '6-9' | 'mawhiba_l1' | 'mawhiba_l2';
/** @deprecated kept for existing imports; use MasteryTrack. */
export type MasteryAgeGroup = MasteryTrack;

export interface MasterySkill {
  key: string;
  nameAr: string;
  area: 'quantitative' | 'verbal' | 'logical_patterns' | 'spatial' | 'scientific' | 'flexibility';
  /** Teaching order: lower runs first when several skills are open. */
  order: number;
  prerequisites: string[];
  /** (skill_area, sub_skill) pairs from the questions table. */
  sources: Array<[string, string]>;
}

/** Tracks chosen by the child's age (the general smart path). */
export const MASTERY_AGE_GROUPS: readonly MasteryTrack[] = ['6-9'];
export const MASTERY_TRACKS: readonly MasteryTrack[] = ['6-9', 'mawhiba_l1', 'mawhiba_l2'];
/** Dedicated Mawhiba exam banks (served on /practice/mawhiba). */
export const MAWHIBA_TRACKS: readonly MasteryTrack[] = ['mawhiba_l1', 'mawhiba_l2'];

export function isMawhibaTrack(track: unknown): track is 'mawhiba_l1' | 'mawhiba_l2' {
  return track === 'mawhiba_l1' || track === 'mawhiba_l2';
}

export const SKILLS_6_9: MasterySkill[] = [
  // ─── Quantitative ────────────────────────────────────────────────────────
  {
    key: 'q_add_sub',
    nameAr: 'الجمع والطرح',
    area: 'quantitative',
    order: 10,
    prerequisites: [],
    sources: [['quantitative', 'الجمع'], ['quantitative', 'الطرح'], ['quantitative', 'basic_operations']],
  },
  {
    key: 'q_mul_div',
    nameAr: 'الضرب والقسمة',
    area: 'quantitative',
    order: 20,
    prerequisites: ['q_add_sub'],
    sources: [
      ['quantitative', 'الضرب'],
      ['quantitative', 'القسمة'],
      ['quantitative', 'multiplication'],
      ['quantitative', 'division'],
    ],
  },
  {
    key: 'q_comparison',
    nameAr: 'المقارنة الكمية',
    area: 'quantitative',
    order: 30,
    prerequisites: ['q_add_sub'],
    sources: [['quantitative', 'comparison'], ['quantitative', 'number_comparison']],
  },
  {
    key: 'q_word_problems',
    nameAr: 'المسائل اللفظية',
    area: 'quantitative',
    order: 40,
    prerequisites: ['q_add_sub', 'q_mul_div'],
    sources: [
      ['quantitative', 'word_problems'],
      ['quantitative', 'المسائل'],
      ['quantitative', 'المسائل المركبة'],
    ],
  },
  {
    key: 'q_fractions',
    nameAr: 'الكسور والنسب',
    area: 'quantitative',
    order: 50,
    prerequisites: ['q_mul_div'],
    sources: [
      ['quantitative', 'fractions'],
      ['quantitative', 'fractions_basics'],
      ['quantitative', 'الكسور'],
      ['quantitative', 'percentages'],
    ],
  },
  {
    key: 'q_geometry',
    nameAr: 'الهندسة',
    area: 'quantitative',
    order: 60,
    prerequisites: [],
    sources: [['quantitative', 'geometry'], ['quantitative', 'الهندسة']],
  },
  {
    key: 'q_algebra',
    nameAr: 'المجهول والمعادلات البسيطة',
    area: 'quantitative',
    order: 70,
    prerequisites: ['q_add_sub', 'q_mul_div'],
    sources: [['quantitative', 'algebra']],
  },

  // ─── Logical patterns ────────────────────────────────────────────────────
  {
    key: 'l_visual_patterns',
    nameAr: 'الأنماط البصرية',
    area: 'logical_patterns',
    order: 15,
    prerequisites: [],
    sources: [
      ['logical_patterns', 'الأنماط'],
      ['logical_patterns', 'الأنماط المتقدمة'],
      ['logical_patterns', 'pattern_completion'],
    ],
  },
  {
    key: 'l_number_sequences',
    nameAr: 'السلاسل والأنماط العددية',
    area: 'logical_patterns',
    order: 35,
    prerequisites: ['q_add_sub', 'l_visual_patterns'],
    sources: [
      ['quantitative', 'number_patterns'],
      ['quantitative', 'الأنماط الرقمية'],
      ['logical_patterns', 'السلاسل الرقمية'],
      ['logical_patterns', 'السلاسل المتقدمة'],
      ['logical_patterns', 'السلاسل المعقدة'],
      ['logical_patterns', 'sequence_patterns'],
      ['logical_patterns', 'number_sequences'],
      ['quantitative', 'number_sequences'],
      ['logical_patterns', 'rules'],
    ],
  },
  {
    key: 'l_reasoning',
    nameAr: 'الاستدلال والاستنتاج',
    area: 'logical_patterns',
    order: 45,
    prerequisites: [],
    sources: [
      ['logical_patterns', 'الاستنتاج'],
      ['logical_patterns', 'الاستدلال'],
      ['logical_patterns', 'الاستدلال المعقد'],
      ['logical_patterns', 'logical_reasoning'],
      ['logical_patterns', 'القياس المنطقي'],
      ['logical_patterns', 'deductive_reasoning'],
      ['logical_patterns', 'if_then'],
      ['logical_patterns', 'comparison'],
      ['logical_patterns', 'spatial'],
    ],
  },

  // ─── Verbal ──────────────────────────────────────────────────────────────
  {
    key: 'v_vocabulary',
    nameAr: 'المفردات والمعاني',
    area: 'verbal',
    order: 12,
    prerequisites: [],
    sources: [
      ['verbal', 'المفردات'],
      ['verbal', 'المترادفات'],
      ['verbal', 'المتضادات'],
      ['verbal', 'antonyms'],
      ['verbal', 'synonyms'],
    ],
  },
  {
    key: 'v_analogy',
    nameAr: 'التناظر اللفظي',
    area: 'verbal',
    order: 32,
    prerequisites: ['v_vocabulary'],
    sources: [
      ['verbal', 'التناظر'],
      ['verbal', 'التناظر اللغوي'],
      ['verbal', 'verbal_analogy'],
      ['verbal', 'analogies'],
    ],
  },
  {
    key: 'v_context',
    nameAr: 'إكمال الجمل والخطأ السياقي',
    area: 'verbal',
    order: 42,
    prerequisites: ['v_vocabulary'],
    sources: [
      ['verbal', 'إكمال الجملة'],
      ['verbal', 'sentence_completion'],
      ['verbal', 'الخطأ السياقي'],
      ['verbal', 'contextual_error'],
    ],
  },
  {
    key: 'v_odd_one_out',
    nameAr: 'الكلمة المختلفة',
    area: 'verbal',
    order: 22,
    prerequisites: ['v_vocabulary'],
    sources: [['verbal', 'odd_one_out'], ['verbal', 'categories']],
  },
  {
    key: 'v_reading',
    nameAr: 'الفهم القرائي',
    area: 'verbal',
    order: 55,
    prerequisites: ['v_vocabulary', 'v_context'],
    sources: [['verbal', 'الفهم القرائي'], ['verbal', 'comprehension']],
  },
];

// ─── Mawhiba Level 1 (grades 3–5): one skill per question type ─────────────
// Teaching order interleaves the four sections so early sessions touch all of them.
const m1 = (
  key: string, nameAr: string, area: MasterySkill['area'], order: number, prerequisites: string[], subSkill: string,
): MasterySkill => ({ key, nameAr, area, order, prerequisites, sources: [[area, subSkill]] });

export const SKILLS_MAWHIBA_L1: MasterySkill[] = [
  m1('m1_word_problems', 'المسائل الكلامية', 'quantitative', 10, [], 'مسائل كلامية'),
  m1('m1_synonyms', 'المترادفات', 'verbal', 11, [], 'المترادفات'),
  m1('m1_directions', 'الاتجاهات والحركة', 'spatial', 12, [], 'الاتجاهات والحركة'),
  m1('m1_science_facts', 'المفاهيم العلمية', 'scientific', 13, [], 'معلومات علمية'),
  m1('m1_sequences', 'المتتاليات العددية', 'quantitative', 20, [], 'المتتاليات العددية'),
  m1('m1_antonyms', 'الأضداد', 'verbal', 21, [], 'الأضداد'),
  m1('m1_cubes', 'المكعبات والأحجام', 'spatial', 22, [], 'المكعبات والأحجام'),
  m1('m1_mechanics', 'التروس والرافعات والآلات البسيطة', 'scientific', 23, [], 'التروس والرافعات والآلات البسيطة'),
  m1('m1_unknowns', 'الأعداد المجهولة', 'quantitative', 30, ['m1_word_problems'], 'الأعداد المجهولة'),
  m1('m1_analogy', 'التناظر اللفظي', 'verbal', 31, ['m1_synonyms', 'm1_antonyms'], 'التناظر اللفظي'),
  m1('m1_patterns', 'الأنماط المتكررة', 'spatial', 32, ['m1_sequences'], 'الأنماط المتكررة'),
  m1('m1_odd_one_out', 'الكلمة المختلفة', 'verbal', 33, [], 'الكلمة المختلفة'),
  m1('m1_fractions', 'الكسور والنسب والتقريب', 'quantitative', 40, ['m1_word_problems'], 'الكسور والنسب والتقريب'),
  m1('m1_sentence_completion', 'إكمال الجمل', 'verbal', 41, ['m1_synonyms'], 'إكمال الجمل'),
  m1('m1_geometry', 'الهندسة والقياس والوقت', 'quantitative', 50, ['m1_word_problems'], 'الهندسة والقياس والوقت'),
  m1('m1_reading', 'فهم المقروء', 'verbal', 51, ['m1_sentence_completion'], 'فهم المقروء'),
];

// ─── Mawhiba Level 2 (grade 6 to intermediate 2): two practice tests, 192 questions ──
// Each skill groups the source's question types so every skill has 12+ questions.
const m2 = (
  key: string, nameAr: string, area: MasterySkill['area'], order: number, subSkills: string[],
): MasterySkill => ({ key, nameAr, area, order, prerequisites: [], sources: subSkills.map((sub) => [area, sub]) });

export const SKILLS_MAWHIBA_L2: MasterySkill[] = [
  m2('m2_analogy', 'التناظر اللفظي', 'verbal', 10, ['تناظر']),
  m2('m2_ideas', 'توليد الأفكار', 'flexibility', 11, ['أفكار']),
  m2('m2_arithmetic', 'الحساب والنسب', 'quantitative', 12, ['حساب', 'أعداد', 'عد', 'كسور', 'نسب', 'تناسب', 'زمن']),
  m2('m2_mechanics', 'القوى والآلات والطاقة', 'scientific', 13, ['قوى', 'رافعة', 'بكرات', 'تروس', 'طاقة']),
  m2('m2_verbal_logic', 'الاستنتاج اللغوي', 'verbal', 20, ['إكمال', 'المختلف', 'استنتاج']),
  m2('m2_classify', 'التصنيف وإعادة الصياغة', 'flexibility', 21, ['تصنيف', 'إعادة صياغة']),
  m2('m2_spatial', 'الاستدلال المكاني', 'spatial', 22, ['تدوير', 'انعكاس', 'مصفوفة', 'مكعبات', 'متتالية أشكال']),
  m2('m2_science', 'المفاهيم العلمية', 'scientific', 23, ['منهج', 'صوت', 'أرض', 'ضوء', 'كهرباء', 'مادة', 'أحياء', 'مغناطيس']),
  m2('m2_reading', 'فهم المقروء', 'verbal', 30, ['فهم المقروء']),
  m2('m2_rule_switch', 'تبديل القواعد وحل المشكلات', 'flexibility', 31, ['تبديل القاعدة', 'حل مشكلات']),
  m2('m2_algebra', 'الجبر والمتتاليات والهندسة', 'quantitative', 32, ['جبر', 'متتاليات', 'هندسة', 'إحصاء', 'احتمال']),
];

const TAXONOMY: Record<MasteryTrack, MasterySkill[]> = {
  '6-9': SKILLS_6_9,
  mawhiba_l1: SKILLS_MAWHIBA_L1,
  mawhiba_l2: SKILLS_MAWHIBA_L2,
};

/** Display info for a skill key, from any supported age group. */
export function skillLabel(skillKey: string): { key: string; nameAr: string; area: MasterySkill['area'] } | null {
  for (const group of MASTERY_TRACKS) {
    const sk = TAXONOMY[group].find((s) => s.key === skillKey);
    if (sk) return { key: sk.key, nameAr: sk.nameAr, area: sk.area };
  }
  return null;
}

export function isMasteryAgeGroup(ageGroup: string): ageGroup is MasteryTrack {
  return (MASTERY_AGE_GROUPS as readonly string[]).includes(ageGroup);
}

export function isMasteryTrack(track: unknown): track is MasteryTrack {
  return typeof track === 'string' && (MASTERY_TRACKS as readonly string[]).includes(track);
}

export function getTaxonomy(track: MasteryTrack): MasterySkill[] {
  return TAXONOMY[track];
}

function pairKey(skillArea: string, subSkill: string): string {
  return `${skillArea}::${subSkill.trim()}`;
}

/** Map (skill_area, sub_skill) → unified skill key for one age group. */
export function buildSourceIndex(skills: MasterySkill[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const skill of skills) {
    for (const [area, sub] of skill.sources) {
      const key = pairKey(area, sub);
      if (index.has(key)) {
        throw new Error(`Taxonomy source ${key} is mapped to both ${index.get(key)} and ${skill.key}`);
      }
      index.set(key, skill.key);
    }
  }
  return index;
}

export function skillKeyForQuestion(
  index: Map<string, string>,
  skillArea: string,
  subSkill: string,
): string | null {
  return index.get(pairKey(skillArea, subSkill)) ?? null;
}

/**
 * Prerequisites that actually gate a skill: excluded skills (too few
 * questions) are walked through, so their own prerequisites still apply.
 */
export function effectivePrerequisites(
  skillKey: string,
  skills: MasterySkill[],
  eligible: Set<string>,
): string[] {
  const byKey = new Map(skills.map((s) => [s.key, s]));
  const result = new Set<string>();
  const seen = new Set<string>();
  const stack = [...(byKey.get(skillKey)?.prerequisites ?? [])];
  while (stack.length > 0) {
    const key = stack.pop()!;
    if (seen.has(key)) continue;
    seen.add(key);
    if (eligible.has(key)) {
      result.add(key);
    } else {
      stack.push(...(byKey.get(key)?.prerequisites ?? []));
    }
  }
  return [...result];
}
