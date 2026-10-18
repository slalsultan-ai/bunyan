import { describe, expect, it } from 'vitest';
import { getEmojiPattern } from '@/lib/emoji-patterns';

describe('emoji patterns', () => {
  it('uses a native visual sequence for bundled pattern images', () => {
    expect(getEmojiPattern('/assets/bunyan/4-5/pattern_01.png'))
      .toEqual(['🔴', '🔵', '🔴', '🔵', '🔴', '🔵']);
  });

  it('leaves real illustrations as images', () => {
    expect(getEmojiPattern('/assets/bunyan/4-5/count_01.png')).toBeNull();
  });
});
