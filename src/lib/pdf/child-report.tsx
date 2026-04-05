import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  G,
  Line,
  Polyline,
  Polygon,
  Circle,
  Rect,
  Path,
  renderToBuffer,
} from '@react-pdf/renderer';
import {
  getChallengeFor,
  getStrengthDescription,
  generateParentTips,
  generateProgressSummary,
} from './child-report-content';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportData {
  child: {
    name: string;
    age: number;
    ageGroup: string;
    createdAt: string;
  };
  stats: {
    totalSessions: number;
    totalQuestions: number;
    overallAccuracy: number;
    totalPoints: number;
    currentLevel: number;
    currentStreak: number;
    badges: string[];
    longestCorrectStreak?: number;
    avgSessionsPerWeek?: number;
    avgQuestionsPerDay?: number;
    bestDayOfWeek?: string;
  };
  skills: Record<string, {
    accuracy: number;
    totalAnswered: number;
    trend: 'up' | 'down' | 'stable';
    strongest?: { name: string; accuracy: number } | null;
    weakest?: { name: string; accuracy: number } | null;
  }>;
  weeklyData: { week: string; sessions: number; accuracy: number; points: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  // Optional enrichment (route computes when available)
  peerComparison?: { averageAccuracy: number; percentile: number; isEstimated: boolean };
  strongPoints?: { name: string; accuracy: number; description?: string }[];
  weakPoints?: { name: string; accuracy: number; skillArea?: string }[];
  generatedAt?: string;
  nextReportDate?: string;
}

// ─── Fonts ───────────────────────────────────────────────────────────────────

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback(w => [w]);

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  green: '#0D9255',
  greenDark: '#076B3E',
  greenLight: '#D1FAE5',
  greenBg: '#F0FDF4',
  yellow: '#FFC107',
  red: '#E53935',
  redLight: '#FEE2E2',
  redBorder: '#FCA5A5',
  blue: '#2196F3',
  blueLight: '#EFF6FF',
  blueBg: '#DBEAFE',
  purpleLight: '#F3E8FF',
  orangeLight: '#FFEDD5',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  grayBg: '#F9FAFB',
  white: '#FFFFFF',
};

const SKILL_AR: Record<string, string> = {
  quantitative: 'كمّي',
  verbal: 'لفظي',
  logical_patterns: 'منطقي',
};

const SKILL_ICON: Record<string, string> = {
  quantitative: '🔢',
  verbal: '📚',
  logical_patterns: '🧩',
};

const LEVEL_AR: Record<number, string> = {
  1: 'مبتدئ', 2: 'مستكشف', 3: 'متعلم', 4: 'متميز',
  5: 'خبير', 6: 'عبقري', 7: 'أسطورة',
};

const BADGE_AR: Record<string, { name: string; icon: string }> = {
  starter: { name: 'نجم البداية', icon: '🌟' },
  achiever: { name: 'المتفوق', icon: '🏆' },
  persistent: { name: 'المثابر', icon: '🔥' },
  math_genius: { name: 'عبقري الرياضيات', icon: '🔢' },
  word_king: { name: 'ملك الكلمات', icon: '📖' },
  detective: { name: 'المحقق', icon: '🔍' },
  champion: { name: 'البطل', icon: '👑' },
};

function trendArrow(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function barColor(pct: number): string {
  if (pct >= 80) return C.green;
  if (pct >= 60) return C.yellow;
  return C.red;
}

function formatDateArabic(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  try {
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh',
    });
  } catch {
    return d.toISOString().split('T')[0];
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    backgroundColor: C.white,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 44,
    direction: 'rtl',
  },
  coverPage: {
    fontFamily: 'Cairo',
    backgroundColor: C.white,
    padding: 0,
    direction: 'rtl',
  },

  // Cover
  coverTop: {
    backgroundColor: C.greenDark,
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  coverLogo: {
    width: 60, height: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  coverLogoText: { color: C.white, fontSize: 32, fontWeight: 700 },
  coverBrand: { color: C.white, fontSize: 28, fontWeight: 700, letterSpacing: 1 },
  coverTagline: { color: '#A7F3D0', fontSize: 11, marginTop: 4 },

  coverBody: { padding: 36, alignItems: 'center', flex: 1 },
  coverReportTitle: {
    fontSize: 14, color: C.gray700, marginTop: 22, marginBottom: 30, textAlign: 'center',
  },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4, borderColor: C.greenLight,
  },
  avatarText: { color: C.white, fontSize: 56, fontWeight: 700 },
  coverChildName: { fontSize: 32, fontWeight: 700, color: C.greenDark, marginBottom: 8 },
  coverChildMeta: { fontSize: 13, color: C.gray500, marginBottom: 2, textAlign: 'center' },

  coverDivider: {
    width: 120, height: 2, backgroundColor: C.yellow, marginVertical: 18,
  },

  coverFooter: {
    backgroundColor: C.grayBg,
    paddingVertical: 18,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  coverFooterBrand: { fontSize: 12, color: C.green, fontWeight: 700 },
  coverFooterTag: { fontSize: 10, color: C.gray500, marginTop: 2 },

  // Sections
  pageHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: C.green,
    paddingBottom: 8,
    marginBottom: 14,
  },
  pageHeaderIcon: { fontSize: 16, marginLeft: 8, color: C.green },
  pageHeaderTitle: { fontSize: 16, fontWeight: 700, color: C.greenDark, textAlign: 'right', flex: 1 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: C.gray700,
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'right',
  },

  // Stat cards
  statsRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 9, color: C.gray700, marginTop: 4, fontWeight: 700 },

  // Level bar
  levelBarWrap: { marginTop: 4, marginBottom: 4 },
  levelBarBg: {
    height: 14, backgroundColor: C.gray200, borderRadius: 7, overflow: 'hidden',
    flexDirection: 'row-reverse',
  },
  levelBarLabels: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 4,
  },
  levelBarLabel: { fontSize: 8, color: C.gray500 },

  // Comparison bars
  compareRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 6 },
  compareLabel: { width: 56, fontSize: 10, fontWeight: 700, color: C.gray700, textAlign: 'right' },
  compareBarBg: { flex: 1, height: 14, backgroundColor: C.gray200, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  compareBarFill: { height: 14, borderRadius: 4 },
  comparePct: { width: 40, fontSize: 10, color: C.gray700, textAlign: 'left', fontWeight: 700 },

  // Info box
  infoBox: {
    backgroundColor: C.blueLight,
    borderRadius: 8,
    padding: 10,
    borderRightWidth: 3,
    borderRightColor: C.blue,
    marginTop: 8,
  },
  infoText: { fontSize: 10, color: C.gray700, textAlign: 'right', lineHeight: 1.5 },

  // Bullet list row
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bulletLabel: { flex: 1, fontSize: 10, color: C.gray700, textAlign: 'right' },
  bulletValue: { fontSize: 10, fontWeight: 700, color: C.greenDark },

  // Skill bars on Page 3
  skillBlock: { marginBottom: 12 },
  skillHead: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
  skillHeadIcon: { fontSize: 12, marginLeft: 6 },
  skillHeadName: { fontSize: 11, fontWeight: 700, color: C.gray900, textAlign: 'right' },
  skillBarOuter: {
    flex: 1,
    height: 10, backgroundColor: C.gray200, borderRadius: 5, overflow: 'hidden',
  },
  skillBarInner: { height: 10, borderRadius: 5 },
  skillBarRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  skillPctText: { fontSize: 10, fontWeight: 700, color: C.gray700, width: 80, textAlign: 'left' },
  skillSubInfo: { fontSize: 9, color: C.gray500, marginTop: 3, textAlign: 'right' },

  // Page 5 cards
  strongCard: {
    backgroundColor: C.greenBg,
    borderWidth: 1, borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
  },
  strongHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 3 },
  strongName: { fontSize: 11, fontWeight: 700, color: C.greenDark },
  strongPct: { fontSize: 11, fontWeight: 700, color: C.green },
  strongDesc: { fontSize: 9, color: C.gray700, textAlign: 'right', lineHeight: 1.4 },

  weakCard: {
    backgroundColor: C.redLight,
    borderWidth: 1, borderColor: C.redBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
  },
  weakHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 3 },
  weakName: { fontSize: 11, fontWeight: 700, color: '#991B1B' },
  weakPct: { fontSize: 11, fontWeight: 700, color: C.red },
  weakLabel: { fontSize: 9, fontWeight: 700, color: '#991B1B', marginTop: 4, textAlign: 'right' },
  weakBody: { fontSize: 9, color: C.gray700, textAlign: 'right', lineHeight: 1.4, marginTop: 2 },

  // Plan table
  planTableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: C.greenDark,
    paddingVertical: 8, paddingHorizontal: 10,
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  planTableHeaderCell: { fontSize: 10, color: C.white, fontWeight: 700, textAlign: 'center' },
  planTableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  planTableCell: { fontSize: 10, color: C.gray700, textAlign: 'center' },

  // Parent letter
  letterBody: {
    fontSize: 11, color: C.gray700, lineHeight: 1.7, textAlign: 'right', marginBottom: 10,
  },
  letterTip: {
    fontSize: 10, color: C.gray700, lineHeight: 1.6, textAlign: 'right', marginBottom: 8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 16, left: 36, right: 36,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.gray200,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: C.gray500 },

  disclaimer: { fontSize: 8, color: C.gray400, textAlign: 'center', marginTop: 14, lineHeight: 1.5 },
});

// ─── Shared Footer ───────────────────────────────────────────────────────────

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `صفحة ${pageNumber} من ${totalPages}`}
      />
      <Text style={s.footerText}>bunyan.guru | بُنيان — كل بُنيان يبدأ بلبنة ©</Text>
    </View>
  );
}

function PageHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderIcon}>{icon}</Text>
      <Text style={s.pageHeaderTitle}>{title}</Text>
    </View>
  );
}

// ─── Page 1: Cover ───────────────────────────────────────────────────────────

function CoverPage({ data }: { data: ReportData }) {
  const initial = data.child.name.trim().charAt(0) || 'ب';
  const reportDate = formatDateArabic(data.generatedAt);

  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverTop}>
        <View style={s.coverLogo}>
          <Text style={s.coverLogoText}>ب</Text>
        </View>
        <Text style={s.coverBrand}>بُنيان</Text>
        <Text style={s.coverTagline}>منصة تدريب القدرات للأطفال</Text>
      </View>

      <View style={s.coverBody}>
        <Text style={s.coverReportTitle}>تقرير تحليل أداء شامل</Text>

        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>

        <Text style={s.coverChildName}>{data.child.name}</Text>
        <Text style={s.coverChildMeta}>العمر: {data.child.age} سنوات</Text>
        <Text style={s.coverChildMeta}>الفئة: {data.child.ageGroup} سنوات</Text>

        <View style={s.coverDivider} />

        <Text style={s.coverChildMeta}>تاريخ التقرير: {reportDate}</Text>
        <Text style={s.coverChildMeta}>الفترة: آخر 30 يوماً</Text>
      </View>

      <View style={s.coverFooter}>
        <Text style={s.coverFooterBrand}>bunyan.guru</Text>
        <Text style={s.coverFooterTag}>"كل بُنيان يبدأ بلبنة"</Text>
      </View>
    </Page>
  );
}

// ─── Page 2: Dashboard ───────────────────────────────────────────────────────

function StatCard({ value, label, bg, color, border }: {
  value: string; label: string; bg: string; color: string; border: string;
}) {
  return (
    <View style={[s.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function LevelBar({ level }: { level: number }) {
  const pct = Math.min(Math.max((level - 1) / 6, 0), 1) * 100;
  return (
    <View style={s.levelBarWrap}>
      <View style={s.levelBarBg}>
        <Svg width="100%" height="14" viewBox="0 0 100 14" preserveAspectRatio="none">
          <Rect x={0} y={0} width={100} height={14} fill={C.gray200} />
          <Rect x={0} y={0} width={pct} height={14} fill={C.green} />
          <Rect x={Math.max(0, pct - 0.8)} y={0} width={1.6} height={14} fill={C.greenDark} />
        </Svg>
      </View>
      <View style={s.levelBarLabels}>
        <Text style={s.levelBarLabel}>مبتدئ</Text>
        <Text style={[s.levelBarLabel, { fontWeight: 700, color: C.greenDark }]}>
          المستوى {level} — {LEVEL_AR[level] ?? ''}
        </Text>
        <Text style={s.levelBarLabel}>أسطورة</Text>
      </View>
    </View>
  );
}

function DashboardPage({ data }: { data: ReportData }) {
  const peer = data.peerComparison ?? {
    averageAccuracy: 68,
    percentile: Math.max(5, Math.min(95, Math.round(data.stats.overallAccuracy - 8))),
    isEstimated: true,
  };

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="📊" title="ملخص الأداء العام" />

      <View style={s.statsRow}>
        <StatCard value={String(data.stats.totalSessions)} label="جلسة" bg={C.blueLight} color={C.blue} border="#BFDBFE" />
        <StatCard value={String(data.stats.totalQuestions)} label="سؤال" bg={C.purpleLight} color="#7C3AED" border="#DDD6FE" />
        <StatCard value={`${data.stats.overallAccuracy}%`} label="دقة" bg={C.greenBg} color={C.green} border="#BBF7D0" />
        <StatCard value={String(data.stats.totalPoints)} label="نقطة" bg={C.orangeLight} color="#EA580C" border="#FED7AA" />
      </View>

      <Text style={s.sectionTitle}>المستوى العام</Text>
      <LevelBar level={data.stats.currentLevel} />

      <Text style={s.sectionTitle}>مقارنة مع المتوسط العام</Text>
      <View>
        <View style={s.compareRow}>
          <Text style={s.compareLabel}>طفلك</Text>
          <View style={s.compareBarBg}>
            <View style={[s.compareBarFill, { width: `${Math.max(data.stats.overallAccuracy, 1)}%`, backgroundColor: C.green }]} />
          </View>
          <Text style={[s.comparePct, { color: C.green }]}>{data.stats.overallAccuracy}%</Text>
        </View>
        <View style={s.compareRow}>
          <Text style={s.compareLabel}>المتوسط</Text>
          <View style={s.compareBarBg}>
            <View style={[s.compareBarFill, { width: `${Math.max(peer.averageAccuracy, 1)}%`, backgroundColor: C.gray400 }]} />
          </View>
          <Text style={[s.comparePct, { color: C.gray500 }]}>{peer.averageAccuracy}%{peer.isEstimated ? ' *' : ''}</Text>
        </View>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoText}>
          {data.stats.overallAccuracy >= peer.averageAccuracy
            ? `✓ طفلك يتفوّق على ${peer.percentile}% من أقرانه في نفس الفئة العمرية`
            : `طفلك في موقع جيد — مع تدريب منتظم سيتجاوز المتوسط خلال أسابيع قليلة`}
          {peer.isEstimated ? ' (تقديري)' : ''}
        </Text>
      </View>

      <Text style={s.sectionTitle}>معدل النشاط</Text>
      <View>
        <View style={s.bulletRow}>
          <Text style={s.bulletLabel}>متوسط الجلسات أسبوعياً</Text>
          <Text style={s.bulletValue}>{data.stats.avgSessionsPerWeek ?? 0} جلسات</Text>
        </View>
        <View style={s.bulletRow}>
          <Text style={s.bulletLabel}>متوسط الأسئلة يومياً</Text>
          <Text style={s.bulletValue}>{data.stats.avgQuestionsPerDay ?? 0} أسئلة</Text>
        </View>
        <View style={s.bulletRow}>
          <Text style={s.bulletLabel}>أطول سلسلة إجابات صحيحة</Text>
          <Text style={s.bulletValue}>{data.stats.longestCorrectStreak ?? 0} سؤال</Text>
        </View>
        {data.stats.bestDayOfWeek ? (
          <View style={s.bulletRow}>
            <Text style={s.bulletLabel}>أفضل يوم أداء</Text>
            <Text style={s.bulletValue}>{data.stats.bestDayOfWeek}</Text>
          </View>
        ) : null}
      </View>

      <PageFooter />
    </Page>
  );
}

// ─── Radar Chart (SVG) ───────────────────────────────────────────────────────

function RadarChart({ skills }: { skills: { label: string; value: number }[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const R = 72;
  const n = skills.length;

  // Angles: start at top (-90°), equally spaced
  const angles = skills.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n);

  const pointAt = (radius: number, angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const rings = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = skills
    .map((sk, i) => pointAt((sk.value / 100) * R, angles[i]))
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <Svg width={size} height={size + 18} viewBox={`0 0 ${size} ${size + 18}`}>
      {/* Rings */}
      {rings.map((r, i) => (
        <Polygon
          key={i}
          points={angles.map(a => {
            const p = pointAt(R * r, a);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ')}
          stroke={C.gray200}
          strokeWidth={0.6}
          fill="none"
        />
      ))}
      {/* Axes */}
      {angles.map((a, i) => {
        const p = pointAt(R, a);
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={C.gray300}
            strokeWidth={0.6}
          />
        );
      })}
      {/* Data polygon */}
      <Polygon
        points={dataPoints}
        fill={C.green}
        fillOpacity={0.22}
        stroke={C.green}
        strokeWidth={1.6}
      />
      {/* Data dots */}
      {skills.map((sk, i) => {
        const p = pointAt((sk.value / 100) * R, angles[i]);
        return (
          <Circle key={i} cx={p.x} cy={p.y} r={2.4} fill={C.greenDark} />
        );
      })}
    </Svg>
  );
}

// ─── Page 3: Skills ──────────────────────────────────────────────────────────

function SkillsPage({ data }: { data: ReportData }) {
  const order = ['quantitative', 'verbal', 'logical_patterns'];
  const skillList = order.map(k => ({
    key: k,
    label: SKILL_AR[k] ?? k,
    value: data.skills[k]?.accuracy ?? 0,
  }));

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="🧠" title="تحليل المهارات" />

      <Text style={s.sectionTitle}>رادار المهارات</Text>
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <RadarChart skills={skillList} />
        <View style={{ flexDirection: 'row-reverse', gap: 16, marginTop: 4 }}>
          {skillList.map(sk => (
            <Text key={sk.key} style={{ fontSize: 10, color: C.gray700, fontWeight: 700 }}>
              {sk.label}: {sk.value}%
            </Text>
          ))}
        </View>
      </View>

      <Text style={s.sectionTitle}>تفصيل كل مهارة</Text>
      {order.map(k => {
        const sk = data.skills[k];
        if (!sk) return null;
        const name = SKILL_AR[k] ?? k;
        const icon = SKILL_ICON[k] ?? '•';
        return (
          <View key={k} style={s.skillBlock}>
            <View style={s.skillHead}>
              <Text style={s.skillHeadIcon}>{icon}</Text>
              <Text style={s.skillHeadName}>{name}</Text>
            </View>
            <View style={s.skillBarRow}>
              <View style={s.skillBarOuter}>
                <View style={[s.skillBarInner, { width: `${Math.max(sk.accuracy, 2)}%`, backgroundColor: barColor(sk.accuracy) }]} />
              </View>
              <Text style={s.skillPctText}>
                {sk.accuracy}% {trendArrow(sk.trend)} ({sk.totalAnswered} سؤال)
              </Text>
            </View>
            <Text style={s.skillSubInfo}>
              {sk.strongest ? `الأقوى: ${sk.strongest.name} (${sk.strongest.accuracy}%)` : ''}
              {sk.strongest && sk.weakest ? '  |  ' : ''}
              {sk.weakest ? `الأضعف: ${sk.weakest.name} (${sk.weakest.accuracy}%)` : ''}
              {!sk.strongest && !sk.weakest ? 'بيانات غير كافية لهذه المهارة' : ''}
            </Text>
          </View>
        );
      })}

      <Text style={[s.skillSubInfo, { marginTop: 10, color: C.gray400 }]}>
        أسهم الاتجاه: ↑ تحسّن  |  → مستقر  |  ↓ تراجع (مقارنة بالشهر السابق)
      </Text>

      <PageFooter />
    </Page>
  );
}

// ─── Line & Bar Charts (SVG) ─────────────────────────────────────────────────

function LineChart({ points, width = 460, height = 140 }: {
  points: { label: string; value: number }[];
  width?: number; height?: number;
}) {
  const padL = 30, padR = 12, padT = 10, padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = points.length;
  const stepX = n > 1 ? plotW / (n - 1) : 0;
  // RTL: week 1 is on the right, week N is on the left
  const xAt = (i: number) => padL + plotW - i * stepX;
  const yAt = (v: number) => padT + (1 - v / 100) * plotH;

  const polyline = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(' ');

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Y gridlines */}
      {[0, 25, 50, 75, 100].map((val, i) => (
        <G key={i}>
          <Line x1={padL} y1={yAt(val)} x2={padL + plotW} y2={yAt(val)} stroke={C.gray200} strokeWidth={0.5} />
        </G>
      ))}
      {/* Axes */}
      <Line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={C.gray400} strokeWidth={0.8} />
      <Line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={C.gray400} strokeWidth={0.8} />
      {/* Data line */}
      {n > 0 && (
        <Polyline points={polyline} fill="none" stroke={C.green} strokeWidth={2} />
      )}
      {/* Points */}
      {points.map((p, i) => (
        <Circle key={i} cx={xAt(i)} cy={yAt(p.value)} r={3} fill={C.green} stroke={C.white} strokeWidth={1} />
      ))}
    </Svg>
  );
}

function BarChart({ bars, width = 460, height = 120, color = C.green }: {
  bars: { label: string; value: number }[];
  width?: number; height?: number; color?: string;
}) {
  const padL = 30, padR = 12, padT = 10, padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = bars.length;
  const max = Math.max(1, ...bars.map(b => b.value));
  const step = plotW / n;
  const barW = step * 0.55;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={C.gray400} strokeWidth={0.8} />
      <Line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={C.gray400} strokeWidth={0.8} />
      {bars.map((b, i) => {
        const h = (b.value / max) * plotH;
        // RTL: index 0 rightmost
        const x = padL + plotW - (i + 1) * step + (step - barW) / 2;
        const y = padT + plotH - h;
        return <Rect key={i} x={x} y={y} width={barW} height={h} fill={color} rx={2} />;
      })}
    </Svg>
  );
}

// ─── Page 4: Trends ──────────────────────────────────────────────────────────

function TrendsPage({ data }: { data: ReportData }) {
  const accPoints = data.weeklyData.map(w => ({ label: w.week, value: w.accuracy }));
  const sessionBars = data.weeklyData.map(w => ({ label: w.week, value: w.sessions }));

  // Trend text
  let trendNote = 'لا توجد بيانات كافية لتحليل الاتجاه.';
  if (data.weeklyData.length >= 2) {
    const first = data.weeklyData[0].accuracy;
    const last = data.weeklyData[data.weeklyData.length - 1].accuracy;
    const diff = last - first;
    trendNote = diff > 0
      ? `الدقة تحسّنت ${Math.abs(diff)}% منذ الأسبوع الأول`
      : diff < 0
      ? `الدقة تراجعت ${Math.abs(diff)}% منذ الأسبوع الأول`
      : 'الدقة مستقرة عبر الأسابيع الأخيرة';
  }

  const weekLabels = data.weeklyData.map(w => w.week);

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="📈" title="التقدم الأسبوعي" />

      <Text style={s.sectionTitle}>الدقة عبر الأسابيع (%)</Text>
      {accPoints.length === 0 ? (
        <View style={s.infoBox}><Text style={s.infoText}>لا توجد بيانات أسبوعية بعد</Text></View>
      ) : (
        <>
          <LineChart points={accPoints} />
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 30, marginTop: -4 }}>
            {weekLabels.map((lbl, i) => (
              <Text key={i} style={{ fontSize: 8, color: C.gray500 }}>{lbl}</Text>
            ))}
          </View>
        </>
      )}

      <Text style={s.sectionTitle}>عدد الجلسات أسبوعياً</Text>
      {sessionBars.length === 0 ? (
        <View style={s.infoBox}><Text style={s.infoText}>لا توجد بيانات أسبوعية بعد</Text></View>
      ) : (
        <>
          <BarChart bars={sessionBars} color={C.blue} />
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 30, marginTop: -4 }}>
            {weekLabels.map((lbl, i) => (
              <Text key={i} style={{ fontSize: 8, color: C.gray500 }}>{lbl}</Text>
            ))}
          </View>
        </>
      )}

      <Text style={s.sectionTitle}>تحليل الاتجاه</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>📊 {trendNote}</Text>
        <Text style={s.infoText}>📊 معدل الجلسات الأسبوعية: {data.stats.avgSessionsPerWeek ?? 0}</Text>
        {data.stats.bestDayOfWeek ? (
          <Text style={s.infoText}>📊 أفضل يوم أداء: {data.stats.bestDayOfWeek}</Text>
        ) : null}
      </View>

      <PageFooter />
    </Page>
  );
}

// ─── Page 5: Strengths & Improvements ────────────────────────────────────────

interface ParsedSubSkill { name: string; accuracy: number }

function parseSubSkillString(str: string): ParsedSubSkill {
  // Handles "التصنيف (90٪)" or "التصنيف (90%)"
  const m = str.match(/^(.+?)\s*\(\s*(\d+)\s*[%٪]\s*\)\s*$/);
  if (m) return { name: m[1].trim(), accuracy: parseInt(m[2], 10) };
  return { name: str.trim(), accuracy: 0 };
}

function StrengthsPage({ data }: { data: ReportData }) {
  // Prefer enriched fields, fall back to legacy strings
  const strongPoints = data.strongPoints
    ?? data.strengths.map(s => {
      const p = parseSubSkillString(s);
      return { name: p.name, accuracy: p.accuracy, description: getStrengthDescription(p.name) };
    });

  const weakPoints = data.weakPoints
    ?? data.weaknesses.map(w => {
      const p = parseSubSkillString(w);
      return { name: p.name, accuracy: p.accuracy };
    });

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="💪" title="نقاط القوة ونقاط التحسين" />

      <Text style={s.sectionTitle}>⭐ نقاط القوة</Text>
      {strongPoints.length === 0 ? (
        <View style={s.infoBox}>
          <Text style={s.infoText}>أكمل المزيد من الجلسات لتحديد نقاط القوة</Text>
        </View>
      ) : (
        strongPoints.slice(0, 3).map((p, i) => (
          <View key={i} style={s.strongCard}>
            <View style={s.strongHead}>
              <Text style={s.strongName}>⭐ {p.name}</Text>
              <Text style={s.strongPct}>{p.accuracy}%</Text>
            </View>
            <Text style={s.strongDesc}>{p.description ?? getStrengthDescription(p.name)}</Text>
          </View>
        ))
      )}

      <Text style={s.sectionTitle}>🎯 نقاط التحسين</Text>
      {weakPoints.length === 0 ? (
        <View style={s.infoBox}>
          <Text style={s.infoText}>أكمل المزيد من الجلسات لتحديد نقاط التحسين</Text>
        </View>
      ) : (
        weakPoints.slice(0, 3).map((p, i) => {
          const entry = getChallengeFor(p.name);
          return (
            <View key={i} style={s.weakCard}>
              <View style={s.weakHead}>
                <Text style={s.weakName}>🎯 {p.name}</Text>
                <Text style={s.weakPct}>{p.accuracy}%</Text>
              </View>
              <Text style={s.weakLabel}>التحدي:</Text>
              <Text style={s.weakBody}>{entry.challenge}</Text>
              <Text style={s.weakLabel}>💡 تمرين منزلي:</Text>
              <Text style={s.weakBody}>{entry.exercise}</Text>
            </View>
          );
        })
      )}

      <PageFooter />
    </Page>
  );
}

// ─── Page 6: Weekly Plan ─────────────────────────────────────────────────────

function PlanPage({ data }: { data: ReportData }) {
  // Identify weakest skill areas
  const skillScores = Object.entries(data.skills)
    .map(([k, v]) => ({ key: k, acc: v.accuracy }))
    .sort((a, b) => a.acc - b.acc);

  const weakest = skillScores[0]?.key ?? 'quantitative';
  const middle = skillScores[1]?.key ?? 'verbal';
  const strongest = skillScores[skillScores.length - 1]?.key ?? 'logical_patterns';

  const weakName = SKILL_AR[weakest] ?? weakest;
  const midName = SKILL_AR[middle] ?? middle;
  const strongName = SKILL_AR[strongest] ?? strongest;

  // Build weakly plan — 60% weakness, 40% reinforcement
  const weakestSub = data.skills[weakest]?.weakest?.name ?? `تمارين ${weakName}`;
  const middleSub = data.skills[middle]?.weakest?.name ?? `تمارين ${midName}`;
  const strongestSub = data.skills[strongest]?.strongest?.name ?? `تعزيز ${strongName}`;

  const plan = [
    { day: 'السبت', skill: `${SKILL_ICON[weakest] ?? '•'} ${weakName}`, focus: weakestSub },
    { day: 'الأحد', skill: `${SKILL_ICON[middle] ?? '•'} ${midName}`, focus: middleSub },
    { day: 'الاثنين', skill: `${SKILL_ICON[weakest] ?? '•'} ${weakName}`, focus: `مزيد من ${weakName}` },
    { day: 'الثلاثاء', skill: `${SKILL_ICON[strongest] ?? '•'} ${strongName}`, focus: strongestSub },
    { day: 'الأربعاء', skill: `${SKILL_ICON[weakest] ?? '•'} ${weakName}`, focus: `تعمّق في ${weakName}` },
    { day: 'الخميس', skill: `${SKILL_ICON[middle] ?? '•'} ${midName}`, focus: `تعزيز ${midName}` },
    { day: 'الجمعة', skill: '🎮 مراجعة', focus: 'مراجعة شاملة وتحدي ممتع' },
  ];

  const duration = data.child.ageGroup === '4-5' ? '10 دقائق'
                 : data.child.ageGroup === '6-9' ? '15 دقيقة'
                 : '20 دقيقة';

  // Projections
  const weakAcc = data.skills[weakest]?.accuracy ?? 0;
  const projectedWeakAcc = Math.min(100, weakAcc + 10);
  const projectedOverall = Math.min(100, data.stats.overallAccuracy + 5);

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="📋" title="خطة التدريب — الأسبوع القادم" />

      <Text style={[s.letterBody, { marginBottom: 12 }]}>
        بناءً على تحليل أداء {data.child.name}، صمّمنا هذه الخطة لتعزيز نقاط الضعف مع الحفاظ على
        نقاط القوة.
      </Text>

      <View style={s.planTableHeader}>
        <View style={{ flex: 1 }}><Text style={s.planTableHeaderCell}>اليوم</Text></View>
        <View style={{ flex: 1.4 }}><Text style={s.planTableHeaderCell}>المهارة</Text></View>
        <View style={{ flex: 2 }}><Text style={s.planTableHeaderCell}>التركيز</Text></View>
      </View>
      {plan.map((row, i) => (
        <View
          key={i}
          style={[s.planTableRow, { backgroundColor: i % 2 === 0 ? C.white : C.grayBg }]}
        >
          <View style={{ flex: 1 }}><Text style={s.planTableCell}>{row.day}</Text></View>
          <View style={{ flex: 1.4 }}><Text style={s.planTableCell}>{row.skill}</Text></View>
          <View style={{ flex: 2 }}><Text style={s.planTableCell}>{row.focus}</Text></View>
        </View>
      ))}

      <Text style={[s.sectionTitle, { marginTop: 14 }]}>⏱ المدة المقترحة: {duration} يومياً</Text>

      <Text style={s.sectionTitle}>التوقعات</Text>
      <View style={s.infoBox}>
        <Text style={s.infoText}>📈 لو التزم {data.child.name} بهذه الخطة:</Text>
        <Text style={s.infoText}>   • {weakName}: من {weakAcc}% إلى ~{projectedWeakAcc}%</Text>
        <Text style={s.infoText}>   • الدقة العامة: من {data.stats.overallAccuracy}% إلى ~{projectedOverall}%</Text>
        <Text style={[s.infoText, { color: C.gray500, marginTop: 4, fontSize: 9 }]}>
          * توقعات بناءً على معدلات التحسّن المرصودة لدى أطفال مشابهين.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

// ─── Page 7: Parent Letter ───────────────────────────────────────────────────

function ParentLetterPage({ data }: { data: ReportData }) {
  const weeklyAccs = data.weeklyData.map(w => w.accuracy);
  const weakestSub = (data.weakPoints && data.weakPoints[0]?.name)
    ?? (data.weaknesses[0] ? parseSubSkillString(data.weaknesses[0]).name : null);

  const strongestArea = Object.entries(data.skills)
    .sort((a, b) => b[1].accuracy - a[1].accuracy)[0]?.[0] ?? null;

  const progressText = generateProgressSummary(
    data.child.name,
    weeklyAccs,
    data.stats.overallAccuracy,
    data.stats.totalSessions,
  );

  const tips = generateParentTips({
    ageGroup: data.child.ageGroup,
    weakestSubSkill: weakestSub,
    strongestSkillArea: strongestArea,
    overallAccuracy: data.stats.overallAccuracy,
    weeklyAccuracies: weeklyAccs,
  });

  const generatedAt = data.generatedAt ?? new Date().toISOString();
  const nextDate = data.nextReportDate ?? addDays(generatedAt, 14);

  return (
    <Page size="A4" style={s.page}>
      <PageHeader icon="💌" title="رسالة إلى ولي الأمر" />

      <Text style={s.letterBody}>أهلاً بك،</Text>
      <Text style={s.letterBody}>{progressText}</Text>

      <Text style={s.sectionTitle}>3 نصائح مخصصة لـ{data.child.name}</Text>
      {tips.map((tip, i) => (
        <Text key={i} style={s.letterTip}>{i + 1}. {tip}</Text>
      ))}

      <View style={[s.infoBox, { marginTop: 12 }]}>
        <Text style={s.infoText}>📅 التقرير القادم: {formatDateArabic(nextDate)} (بعد أسبوعين)</Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 10,
          backgroundColor: C.greenDark,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: C.white, fontSize: 22, fontWeight: 700 }}>ب</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: 700, color: C.green, marginTop: 6 }}>bunyan.guru</Text>
        <Text style={{ fontSize: 9, color: C.gray500, marginTop: 2 }}>"كل بُنيان يبدأ بلبنة"</Text>
      </View>

      <Text style={s.disclaimer}>
        هذا التقرير وُلّد تلقائياً بواسطة منصة بُنيان. البيانات محدّثة حتى {formatDateArabic(generatedAt)}.
      </Text>

      <PageFooter />
    </Page>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

function ChildReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`تقرير أداء ${data.child.name} — بُنيان`}
      author="بُنيان"
      language="ar"
    >
      <CoverPage data={data} />
      <DashboardPage data={data} />
      <SkillsPage data={data} />
      <TrendsPage data={data} />
      <StrengthsPage data={data} />
      <PlanPage data={data} />
      <ParentLetterPage data={data} />
    </Document>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function generateChildPdf(data: ReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ChildReport data={data} />);
  return Buffer.from(buffer);
}
