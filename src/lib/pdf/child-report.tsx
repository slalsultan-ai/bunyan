import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer';

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
  };
  skills: Record<string, { accuracy: number; totalAnswered: number; trend: 'up' | 'down' | 'stable' }>;
  weeklyData: { week: string; sessions: number; accuracy: number; points: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// ─── Fonts ───────────────────────────────────────────────────────────────────

Font.register({
  family: 'Cairo',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf',
      fontWeight: 700,
    },
  ],
});

Font.registerHyphenationCallback(w => [w]);

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  green: '#059669',
  greenDark: '#1B6B4A',
  greenLight: '#D1FAE5',
  greenBg: '#F0FDF4',
  gold: '#F59E0B',
  goldDark: '#92400E',
  goldLight: '#FFFBEB',
  goldBorder: '#FDE68A',
  red: '#DC2626',
  redDark: '#991B1B',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  blue: '#1E40AF',
  blueLight: '#EFF6FF',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  grayBg: '#F9FAFB',
  white: '#FFFFFF',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    backgroundColor: C.white,
    paddingHorizontal: 36,
    paddingVertical: 30,
    direction: 'rtl',
  },

  // Header
  header: {
    backgroundColor: C.greenDark,
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: { color: C.white, fontSize: 22, fontWeight: 700 },
  headerTitleGroup: { flexDirection: 'column', alignItems: 'flex-end' },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: 700 },
  headerSub: { color: '#A7F3D0', fontSize: 10, marginTop: 2 },

  // Cover child info
  coverChild: {
    backgroundColor: C.grayBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  coverName: { fontSize: 26, fontWeight: 700, color: C.greenDark, marginBottom: 6 },
  coverMeta: { fontSize: 12, color: C.gray500 },

  // Stat cards
  statRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.grayBg,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.gray200,
  },
  statValue: { fontSize: 22, fontWeight: 700, color: C.greenDark },
  statLabel: { fontSize: 9, color: C.gray500, marginTop: 4 },

  // Section
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.greenDark,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    textAlign: 'right',
  },

  // Skill bars
  skillRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  skillLabel: { width: 60, fontSize: 11, fontWeight: 700, color: C.gray700, textAlign: 'right' },
  skillBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: C.gray200,
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  skillBarFill: { height: 12, borderRadius: 6 },
  skillPct: { width: 70, fontSize: 10, color: C.gray500, textAlign: 'left' },

  // Weekly table
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: C.greenBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeaderCell: { flex: 1, fontSize: 10, fontWeight: 700, color: C.green, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  tableCell: { flex: 1, fontSize: 10, color: C.gray700, textAlign: 'center' },

  // List items
  strengthItem: {
    flexDirection: 'row-reverse',
    backgroundColor: C.greenBg,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  strengthText: { fontSize: 11, color: C.greenDark, textAlign: 'right' },

  weaknessItem: {
    flexDirection: 'row-reverse',
    backgroundColor: C.redLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.redBorder,
  },
  weaknessText: { fontSize: 11, color: C.redDark, textAlign: 'right' },

  recItem: {
    flexDirection: 'row-reverse',
    backgroundColor: C.goldLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  recText: { fontSize: 11, color: C.goldDark, textAlign: 'right' },

  // Badges
  badgeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: C.goldLight,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  badgeText: { fontSize: 10, fontWeight: 700, color: C.goldDark },

  // No data
  noData: {
    backgroundColor: C.grayBg,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  noDataText: { fontSize: 13, color: C.gray500 },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 9, color: C.gray500 },
  footerUrl: { fontSize: 9, color: C.green },

  pageNumber: {
    position: 'absolute',
    bottom: 14,
    left: 36,
    fontSize: 9,
    color: C.gray500,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SKILL_AR: Record<string, string> = {
  quantitative: 'كمي',
  verbal: 'لفظي',
  logical_patterns: 'منطقي',
};

const LEVEL_AR: Record<number, string> = {
  1: 'مبتدئ',
  2: 'مستكشف',
  3: 'متعلم',
  4: 'متميز',
  5: 'خبير',
  6: 'عبقري',
  7: 'أسطورة',
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
  return '—';
}

function barColor(pct: number): string {
  if (pct >= 80) return C.green;
  if (pct >= 60) return C.gold;
  return C.red;
}

function formatDate(): string {
  return new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Riyadh',
  });
}

// ─── Components ──────────────────────────────────────────────────────────────

function Header() {
  return (
    <View style={s.header} fixed>
      <View style={s.headerLogo}>
        <Text style={s.headerLogoText}>ب</Text>
      </View>
      <View style={s.headerTitleGroup}>
        <Text style={s.headerTitle}>تقرير أداء الطفل</Text>
        <Text style={s.headerSub}>بُنيان — منصة تدريب القدرات</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerUrl}>bunyan.guru</Text>
      <Text style={s.footerText}>© بُنيان — كل بُنيان يبدأ بلبنة</Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function CoverPage({ data }: { data: ReportData }) {
  const levelName = LEVEL_AR[data.stats.currentLevel] ?? `المستوى ${data.stats.currentLevel}`;

  return (
    <Page size="A4" style={s.page}>
      <Header />

      <View style={s.coverChild}>
        <Text style={s.coverName}>{data.child.name}</Text>
        <Text style={s.coverMeta}>
          العمر: {data.child.age} سنوات | الفئة: {data.child.ageGroup} سنوات
        </Text>
        <Text style={[s.coverMeta, { marginTop: 4 }]}>تاريخ التقرير: {formatDate()}</Text>
      </View>

      <View style={s.statRow}>
        <StatCard value={String(data.stats.totalSessions)} label="الجلسات" />
        <StatCard value={String(data.stats.totalQuestions)} label="الأسئلة" />
        <StatCard value={`${data.stats.overallAccuracy}٪`} label="الدقة" />
      </View>

      <View style={s.statRow}>
        <StatCard value={String(data.stats.totalPoints)} label="النقاط" />
        <StatCard value={levelName} label="المستوى" />
        <StatCard value={`${data.stats.currentStreak} يوم`} label="السلسلة" />
      </View>

      {data.stats.totalSessions === 0 && (
        <View style={s.noData}>
          <Text style={s.noDataText}>لم يبدأ التدريب بعد — ابدأ أول جلسة!</Text>
        </View>
      )}

      {data.stats.badges.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionTitle}>الشارات المكتسبة</Text>
          <View style={s.badgeRow}>
            {data.stats.badges.map((badge, i) => {
              const info = BADGE_AR[badge] ?? { name: badge, icon: '⭐' };
              return (
                <View key={i} style={s.badge}>
                  <Text style={s.badgeText}>{info.icon} {info.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <Footer />
      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

function PerformancePage({ data }: { data: ReportData }) {
  const skillEntries = Object.entries(data.skills) as [string, { accuracy: number; totalAnswered: number; trend: 'up' | 'down' | 'stable' }][];

  return (
    <Page size="A4" style={s.page}>
      <Header />

      <Text style={s.sectionTitle}>تحليل المهارات (آخر ٣٠ يوم)</Text>

      {skillEntries.map(([key, skill]) => (
        <View key={key} style={s.skillRow}>
          <Text style={s.skillLabel}>{SKILL_AR[key] ?? key}</Text>
          <View style={s.skillBarBg}>
            <View style={[s.skillBarFill, { width: `${Math.max(skill.accuracy, 2)}%`, backgroundColor: barColor(skill.accuracy) }]} />
          </View>
          <Text style={s.skillPct}>
            {skill.accuracy}٪ {trendArrow(skill.trend)} ({skill.totalAnswered} سؤال)
          </Text>
        </View>
      ))}

      <View style={{ marginTop: 20 }}>
        <Text style={s.sectionTitle}>مقارنة أسبوعية (آخر ٤ أسابيع)</Text>

        {data.weeklyData.length === 0 ? (
          <View style={s.noData}>
            <Text style={s.noDataText}>لا توجد بيانات كافية للمقارنة الأسبوعية</Text>
          </View>
        ) : (
          <View>
            <View style={s.tableHeader}>
              <Text style={s.tableHeaderCell}>الأسبوع</Text>
              <Text style={s.tableHeaderCell}>الجلسات</Text>
              <Text style={s.tableHeaderCell}>الدقة</Text>
              <Text style={s.tableHeaderCell}>النقاط</Text>
            </View>
            {data.weeklyData.map((week, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableCell}>{week.week}</Text>
                <Text style={s.tableCell}>{week.sessions}</Text>
                <Text style={[s.tableCell, { color: barColor(week.accuracy), fontWeight: 700 }]}>{week.accuracy}٪</Text>
                <Text style={s.tableCell}>{week.points}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Footer />
      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

function RecommendationsPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={s.page}>
      <Header />

      <Text style={s.sectionTitle}>نقاط القوة</Text>
      {data.strengths.length === 0 ? (
        <View style={s.noData}>
          <Text style={s.noDataText}>أكمل المزيد من الجلسات لتحديد نقاط القوة</Text>
        </View>
      ) : (
        data.strengths.map((st, i) => (
          <View key={i} style={s.strengthItem}>
            <Text style={s.strengthText}>✓ {st}</Text>
          </View>
        ))
      )}

      <View style={{ marginTop: 16 }}>
        <Text style={[s.sectionTitle, { color: C.red, borderBottomColor: C.red }]}>نقاط التحسين</Text>
        {data.weaknesses.length === 0 ? (
          <View style={s.noData}>
            <Text style={s.noDataText}>أكمل المزيد من الجلسات لتحديد نقاط التحسين</Text>
          </View>
        ) : (
          data.weaknesses.map((w, i) => (
            <View key={i} style={s.weaknessItem}>
              <Text style={s.weaknessText}>⚠ {w}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={[s.sectionTitle, { color: C.goldDark, borderBottomColor: C.gold }]}>التوصيات</Text>
        {data.recommendations.map((rec, i) => (
          <View key={i} style={s.recItem}>
            <Text style={s.recText}>{i + 1}. {rec}</Text>
          </View>
        ))}
      </View>

      <Footer />
      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

// ─── Main Document ───────────────────────────────────────────────────────────

function ChildReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`تقرير أداء ${data.child.name} — بُنيان`}
      author="بُنيان"
      language="ar"
    >
      <CoverPage data={data} />
      <PerformancePage data={data} />
      <RecommendationsPage data={data} />
    </Document>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function generateChildPdf(data: ReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ChildReport data={data} />);
  return Buffer.from(buffer);
}
