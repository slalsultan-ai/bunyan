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
import type { WeeklyContent } from '@/lib/db/seed-weekly-content';

// ─── Fonts ────────────────────────────────────────────────────────────────────

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

Font.registerHyphenationCallback(w => [w]); // no hyphenation for Arabic

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  green: '#059669',
  greenLight: '#d1fae5',
  greenDark: '#065f46',
  blue: '#1e40af',
  blueLight: '#eff6ff',
  amber: '#92400e',
  amberLight: '#fefce8',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6b7280',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  white: '#ffffff',
  correct: '#059669',
  correctBg: '#d1fae5',
  optionBg: '#f9fafb',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    backgroundColor: C.white,
    paddingHorizontal: 40,
    paddingVertical: 32,
    direction: 'rtl',
  },

  // Header
  header: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    color: C.white,
    fontSize: 22,
    fontWeight: 700,
  },
  headerTitleGroup: { flexDirection: 'column', alignItems: 'flex-end' },
  headerTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: 700,
  },
  headerSub: {
    color: '#a7f3d0',
    fontSize: 11,
    marginTop: 2,
  },

  // Child section
  childCard: {
    marginBottom: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: 'hidden',
  },
  childHeader: {
    backgroundColor: C.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childName: {
    color: C.white,
    fontSize: 14,
    fontWeight: 700,
  },
  childAge: {
    color: '#a7f3d0',
    fontSize: 10,
  },
  childBody: {
    padding: 16,
    backgroundColor: '#fafafa',
  },

  // Question
  questionBlock: {
    marginBottom: 14,
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  questionLabel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
  },
  questionLabelText: {
    fontSize: 11,
    fontWeight: 700,
    color: C.green,
  },
  questionText: {
    fontSize: 12,
    color: C.gray900,
    lineHeight: 1.7,
    textAlign: 'right',
    marginBottom: 10,
  },

  // Options
  optionsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.optionBg,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.gray200,
    minWidth: '45%',
  },
  optionCorrect: {
    backgroundColor: C.correctBg,
    borderColor: C.correct,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: C.gray500,
    marginLeft: 6,
  },
  optionLabelCorrect: {
    color: C.greenDark,
  },
  optionText: {
    fontSize: 11,
    color: C.gray700,
    textAlign: 'right',
  },
  optionTextCorrect: {
    color: C.greenDark,
    fontWeight: 700,
  },
  correctTick: {
    fontSize: 10,
    color: C.correct,
    marginLeft: 4,
  },

  // Explanation
  explanation: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRightWidth: 3,
    borderRightColor: C.green,
  },
  explanationText: {
    fontSize: 10,
    color: C.greenDark,
    textAlign: 'right',
    lineHeight: 1.6,
  },

  // Game & Tip
  gameBox: {
    backgroundColor: C.amberLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tipBox: {
    backgroundColor: C.blueLight,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
    marginBottom: 4,
    color: C.amber,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
    marginBottom: 4,
    color: C.blue,
  },
  boxText: {
    fontSize: 11,
    color: C.amber,
    textAlign: 'right',
    lineHeight: 1.6,
  },
  tipText: {
    fontSize: 11,
    color: C.blue,
    textAlign: 'right',
    lineHeight: 1.6,
  },

  // Footer
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 9, color: C.gray500 },
  footerUrl: { fontSize: 9, color: C.green },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    marginVertical: 12,
  },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    fontSize: 9,
    color: C.gray500,
  },
});

// ─── Option labels ────────────────────────────────────────────────────────────

const LABELS = ['أ', 'ب', 'ج', 'د'];

// ─── Components ───────────────────────────────────────────────────────────────

function QuestionBlock({
  label,
  icon,
  q,
}: {
  label: string;
  icon: string;
  q: NonNullable<WeeklyContent['quantitativeQuestion']>;
}) {
  return (
    <View style={s.questionBlock}>
      <View style={s.questionLabel}>
        <Text style={s.questionLabelText}>{icon} {label}</Text>
      </View>
      <Text style={s.questionText}>{q.question}</Text>

      {q.options && q.options.length > 0 && (
        <View style={s.optionsGrid}>
          {q.options.map((opt, i) => {
            const correct = i === q.correctIndex;
            return (
              <View key={i} style={[s.option, correct ? s.optionCorrect : {}]}>
                {correct && <Text style={s.correctTick}>✓</Text>}
                <Text style={[s.optionLabel, correct ? s.optionLabelCorrect : {}]}>
                  {LABELS[i] || String(i + 1)}
                </Text>
                <Text style={[s.optionText, correct ? s.optionTextCorrect : {}]}>
                  {opt}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.explanation}>
        <Text style={s.explanationText}>💡 {q.explanation}</Text>
      </View>
    </View>
  );
}

function ChildSection({
  child,
  index,
}: {
  child: { name: string; ageGroup: string; content: WeeklyContent };
  index: number;
}) {
  const { name, ageGroup, content } = child;
  const avatars = ['👦', '👧', '🧒'];
  const avatar = avatars[index % avatars.length];

  return (
    <View style={s.childCard} break={index > 0}>
      <View style={s.childHeader}>
        <Text style={s.childAge}>{ageGroup} سنوات</Text>
        <Text style={s.childName}>{avatar} تمارين {name}</Text>
      </View>
      <View style={s.childBody}>

        {content.quantitativeQuestion && (
          <QuestionBlock label="السؤال الكمي" icon="🔢" q={content.quantitativeQuestion} />
        )}

        {content.verbalQuestion && (
          <QuestionBlock label="السؤال اللفظي" icon="📖" q={content.verbalQuestion} />
        )}

        <View style={s.divider} />

        <View style={s.gameBox}>
          <Text style={s.boxTitle}>🧩 لعبة الأسبوع: {content.weeklyGame.title}</Text>
          <Text style={s.boxText}>{content.weeklyGame.description}</Text>
          <Text style={[s.boxText, { marginTop: 4 }]}>
            {content.weeklyGame.howToPlay}
          </Text>
        </View>

        <View style={s.tipBox}>
          <Text style={s.tipTitle}>💡 نصيحة الأسبوع: {content.weeklyTip.title}</Text>
          <Text style={s.tipText}>{content.weeklyTip.content}</Text>
        </View>

      </View>
    </View>
  );
}

interface PdfChild {
  name: string;
  ageGroup: string;
  content: WeeklyContent;
}

function WeeklyPdf({
  weekNumber,
  children,
}: {
  weekNumber: number;
  children: PdfChild[];
}) {
  return (
    <Document
      title={`تمارين بُنيان — الأسبوع ${weekNumber}`}
      author="بُنيان"
      language="ar"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.headerLogo}>
            <Text style={s.headerLogoText}>ب</Text>
          </View>
          <View style={s.headerTitleGroup}>
            <Text style={s.headerTitle}>تمارين بُنيان الأسبوعية</Text>
            <Text style={s.headerSub}>الأسبوع {weekNumber} من 8</Text>
          </View>
        </View>

        {/* Children */}
        {children.map((child, i) => (
          <ChildSection key={i} child={child} index={i} />
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerUrl}>bunyan.guru</Text>
          <Text style={s.footerText}>© بُنيان — منصة تعليمية للأطفال</Text>
        </View>

        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateWeeklyPdf(
  weekNumber: number,
  children: PdfChild[],
): Promise<Buffer> {
  const validChildren = children.filter(c => c.content !== null);
  if (validChildren.length === 0) throw new Error('No content for PDF');

  const buffer = await renderToBuffer(
    <WeeklyPdf weekNumber={weekNumber} children={validChildren} />,
  );
  return Buffer.from(buffer);
}
