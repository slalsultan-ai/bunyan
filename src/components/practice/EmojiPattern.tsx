interface EmojiPatternProps {
  sequence: string[];
}

/** Native RTL pattern avoids a heavy image for simple child-friendly sequences. */
export default function EmojiPattern({ sequence }: EmojiPatternProps) {
  return (
    <div
      dir="rtl"
      aria-label="نمط بصري، اختر الشكل الناقص"
      className="flex items-center justify-center gap-1.5 overflow-x-auto rounded-xl border border-gray-100 bg-white px-3 py-6 text-[clamp(1.5rem,8vw,3rem)] leading-none"
    >
      {sequence.map((emoji, index) => <span key={`${emoji}-${index}`}>{emoji}</span>)}
      <span aria-hidden="true" className="inline-flex h-[1em] w-[1em] shrink-0 rounded-[0.22em] border-[0.08em] border-dashed border-slate-400" />
    </div>
  );
}
