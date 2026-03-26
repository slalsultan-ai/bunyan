interface SessionProgressProps {
  current: number;
  total: number;
  score: number;
  pointsThisSession: number;
  onExit: () => void;
}

export default function SessionProgress({ current, total, score, pointsThisSession, onExit }: SessionProgressProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onExit}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
          >
            <span>✕</span>
            <span>إنهاء</span>
          </button>
          <span className="text-sm font-semibold text-gray-700">
            سؤال {current} من {total}
          </span>
          <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
            <span>⭐</span>
            <span>{pointsThisSession}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
