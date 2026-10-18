const PATTERNS: Record<string, string[]> = {
  '/assets/bunyan/4-5/pattern_01.png': ['🔴', '🔵', '🔴', '🔵', '🔴', '🔵'],
  '/assets/bunyan/4-5/pattern_02.png': ['🟩', '⭐', '🟩', '⭐', '🟩'],
  '/assets/bunyan/4-5/pattern_03.png': ['🔺', '🔺', '🟦', '🔺', '🔺'],
  '/assets/bunyan/4-5/pattern_04.png': ['🔶', '🟢', '🟢', '🔶', '🟢'],
  '/assets/bunyan/4-5/pattern_05.png': ['🟪', '🔴', '🟩', '🟪', '🔴'],
  '/assets/bunyan/4-5/pattern_06.png': ['🔵', '🔵', '🟡', '🟡', '🔵', '🔵', '🟡'],
  '/assets/bunyan/4-5/pattern_07.png': ['🔺', '🟩', '⭐', '🔺', '🟩'],
  '/assets/bunyan/4-5/pattern_08.png': ['🟪', '🔶', '🔶', '🟪', '🔶'],
  '/assets/bunyan/4-5/pattern_09.png': ['🟦', '🟦', '🔴', '🟦', '🟦'],
  '/assets/bunyan/4-5/pattern_10.png': ['🔺', '🔵', '🔵', '🔺', '🔺'],
  '/assets/bunyan/4-5/pattern_11.png': ['⭐', '🟢', '🔶', '⭐', '🟢'],
  '/assets/bunyan/4-5/pattern_12.png': ['⭐', '⭐', '🔺', '🔺', '⭐', '⭐'],
};

export function getEmojiPattern(imageUrl?: string | null): string[] | null {
  return imageUrl ? PATTERNS[imageUrl] ?? null : null;
}
