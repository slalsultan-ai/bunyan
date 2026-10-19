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

export type MasteryAgeGroup = '6-9';

export interface MasterySkill {
  key: string;
  nameAr: string;
  area: 'quantitative' | 'verbal' | 'logical_patterns';
  /** Teaching order: lower runs first when several skills are open. */
  order: number;
  prerequisites: string[];
  /** (skill_area, sub_skill) pairs from the questions table. */
  sources: Array<[string, string]>;
}

export const MASTERY_AGE_GROUPS: readonly MasteryAgeGroup[] = ['6-9'];

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

const TAXONOMY: Record<MasteryAgeGroup, MasterySkill[]> = {
  '6-9': SKILLS_6_9,
};

export function isMasteryAgeGroup(ageGroup: string): ageGroup is MasteryAgeGroup {
  return (MASTERY_AGE_GROUPS as readonly string[]).includes(ageGroup);
}

export function getTaxonomy(ageGroup: MasteryAgeGroup): MasterySkill[] {
  return TAXONOMY[ageGroup];
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
