'use client';

interface DataPoint {
  week: string;
  accuracy: number;
  sessions: number;
}

interface MonthlyProgressChartProps {
  data: DataPoint[];
  childName: string;
}

export default function MonthlyProgressChart({ data, childName }: MonthlyProgressChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <p className="text-gray-400 text-sm">📈 بيانات أسبوع واحد فقط — سيظهر الرسم البياني بعد أسبوعين من التدريب</p>
      </div>
    );
  }

  const maxAcc = 100;
  const chartWidth = 100; // percentage
  const chartHeight = 140;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const innerW = chartWidth;
  const innerH = chartHeight - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * (innerW - padding.left - padding.right),
    y: padding.top + innerH - (d.accuracy / maxAcc) * innerH,
    acc: d.accuracy,
    week: d.week,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Average line
  const avg = Math.round(data.reduce((s, d) => s + d.accuracy, 0) / data.length);
  const avgY = padding.top + innerH - (avg / maxAcc) * innerH;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">📈 تقدم الدقة — {childName}</h3>
      <svg
        viewBox={`0 0 ${chartWidth + padding.left} ${chartHeight}`}
        className="w-full"
        style={{ maxHeight: '180px' }}
      >
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + innerH - (v / maxAcc) * innerH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={chartWidth} y2={y} stroke="#E5E7EB" strokeWidth="0.5" />
              <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#9CA3AF">{v}%</text>
            </g>
          );
        })}

        {/* Average dashed line */}
        <line x1={padding.left} y1={avgY} x2={chartWidth} y2={avgY} stroke="#D1D5DB" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x={chartWidth + 2} y={avgY + 3} fontSize="6" fill="#9CA3AF">متوسط {avg}%</text>

        {/* Line */}
        <path d={pathD} fill="none" stroke="#059669" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#059669" stroke="#fff" strokeWidth="1.5" />
            {/* X-axis label (show every other for space) */}
            {(i % 2 === 0 || i === points.length - 1) && (
              <text x={p.x} y={chartHeight - 4} textAnchor="middle" fontSize="6" fill="#9CA3AF">
                {p.week.slice(5)} {/* MM-DD */}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
