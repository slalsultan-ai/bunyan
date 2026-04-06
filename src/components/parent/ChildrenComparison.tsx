'use client';

interface ChildCompare {
  childId: string;
  name: string;
  accuracy: number;
  sessions: number;
  trend: 'improving' | 'stable' | 'declining';
}

const TREND_LABELS: Record<string, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
};

export default function ChildrenComparison({ children }: { children: ChildCompare[] }) {
  if (children.length < 2) return null;

  const sorted = [...children].sort((a, b) => b.accuracy - a.accuracy);
  const maxSessions = Math.max(...children.map((c) => c.sessions), 1);
  const mostActive = [...children].sort((a, b) => b.sessions - a.sessions)[0];
  const needsEncouragement = sorted[sorted.length - 1];

  const barColor = (acc: number) =>
    acc >= 80 ? 'bg-emerald-500' : acc >= 60 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-4">👨‍👩‍👧‍👦 مقارنة الأطفال</h3>

      {/* Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right py-2 text-xs font-semibold text-gray-500">الطفل</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500">الدقة</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500">الجلسات</th>
              <th className="text-center py-2 text-xs font-semibold text-gray-500">الاتجاه</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.childId} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                <td className="py-2.5 text-center font-bold text-gray-700">{c.accuracy}%</td>
                <td className="py-2.5 text-center text-gray-600">{c.sessions}</td>
                <td className="py-2.5 text-center">{TREND_LABELS[c.trend] || '→'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual bars */}
      <div className="space-y-2 mb-4">
        {sorted.map((c) => (
          <div key={c.childId} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-16 text-right shrink-0">{c.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${barColor(c.accuracy)}`}
                style={{ width: `${c.accuracy}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 w-10 text-left">{c.accuracy}%</span>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
        <p>💡 {mostActive.name} الأكثر نشاطاً هذا الشهر ({mostActive.sessions} جلسات)</p>
        {needsEncouragement.sessions < mostActive.sessions && (
          <p>🎯 {needsEncouragement.name} يحتاج تشجيع لزيادة الجلسات</p>
        )}
      </div>
    </div>
  );
}
