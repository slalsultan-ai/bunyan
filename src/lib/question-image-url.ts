const LOCAL_YOUNG_QUESTION_IMAGE = /^\/assets\/bunyan\/(4-5|mawhiba2)\/[a-z0-9_-]+\.png$/i;

/** Allows trusted remote images and the bundled visual-question assets only. */
export function sanitizeQuestionImageUrl(url: unknown): string | null {
  if (typeof url !== 'string' || url.trim().length === 0) return null;
  const value = url.trim();

  if (LOCAL_YOUNG_QUESTION_IMAGE.test(value)) return value;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}
