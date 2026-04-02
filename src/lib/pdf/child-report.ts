import jsPDF from 'jspdf';

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

const COLORS = {
  green: [27, 107, 74] as [number, number, number],
  greenLight: [236, 253, 245] as [number, number, number],
  gold: [245, 158, 11] as [number, number, number],
  goldLight: [255, 251, 235] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  grayLight: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  redLight: [254, 242, 242] as [number, number, number],
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function arabicNum(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

function trendArrow(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '^';
  if (trend === 'down') return 'v';
  return '-';
}

function ageGroupLabel(ag: string): string {
  const labels: Record<string, string> = { '4-5': '4-5', '6-9': '6-9', '10-12': '10-12' };
  return labels[ag] ?? ag;
}

const SKILL_LABELS: Record<string, string> = {
  quantitative: 'Quantitative',
  verbal: 'Verbal',
  logical_patterns: 'Logical',
};

const SKILL_LABELS_AR: Record<string, string> = {
  quantitative: '\u0643\u0645\u064a',
  verbal: '\u0644\u0641\u0638\u064a',
  logical_patterns: '\u0645\u0646\u0637\u0642\u064a',
};

const BADGE_MAP: Record<string, { name: string; icon: string }> = {
  starter: { name: 'Starter Star', icon: '*' },
  achiever: { name: 'Achiever', icon: 'T' },
  persistent: { name: 'Persistent (7 days)', icon: 'F' },
  math_genius: { name: 'Math Genius', icon: '#' },
  word_king: { name: 'Word King', icon: 'W' },
  detective: { name: 'Detective', icon: '?' },
  champion: { name: 'Champion', icon: 'C' },
};

function formatDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export async function generateChildPdf(data: ReportData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Use Helvetica (built-in) - Arabic text will be transliterated/displayed as available
  // For proper Arabic, we render labels in English and keep Arabic names as-is
  doc.setFont('Helvetica');

  // ═══ PAGE 1: Cover ═══
  drawCoverPage(doc, data);

  // ═══ PAGE 2: Performance Summary ═══
  doc.addPage();
  drawPerformancePage(doc, data);

  // ═══ PAGE 3: Strengths, Weaknesses & Recommendations ═══
  doc.addPage();
  drawRecommendationsPage(doc, data);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function drawCoverPage(doc: jsPDF, data: ReportData) {
  // Green header background
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, PAGE_WIDTH, 120, 'F');

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.text('Bunyan', PAGE_WIDTH / 2, 40, { align: 'center' });

  doc.setFontSize(16);
  doc.text('Child Performance Report', PAGE_WIDTH / 2, 55, { align: 'center' });

  // Child info
  doc.setFontSize(24);
  doc.text(data.child.name, PAGE_WIDTH / 2, 80, { align: 'center' });

  doc.setFontSize(14);
  doc.text(
    `Age: ${data.child.age} | Group: ${ageGroupLabel(data.child.ageGroup)}`,
    PAGE_WIDTH / 2,
    95,
    { align: 'center' }
  );

  // Date
  doc.setFontSize(12);
  doc.text(`Report Date: ${formatDate()}`, PAGE_WIDTH / 2, 110, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(2);
  doc.line(MARGIN + 30, 125, PAGE_WIDTH - MARGIN - 30, 125);

  // Summary cards
  doc.setTextColor(...COLORS.black);
  const cardY = 145;
  const cardW = CONTENT_WIDTH / 3 - 6;

  // Sessions card
  drawStatCard(doc, MARGIN, cardY, cardW, 'Sessions', data.stats.totalSessions.toString());
  // Questions card
  drawStatCard(doc, MARGIN + cardW + 9, cardY, cardW, 'Questions', data.stats.totalQuestions.toString());
  // Accuracy card
  drawStatCard(doc, MARGIN + 2 * (cardW + 9), cardY, cardW, 'Accuracy', `${data.stats.overallAccuracy}%`);

  // Second row
  const cardY2 = cardY + 45;
  drawStatCard(doc, MARGIN, cardY2, cardW, 'Points', data.stats.totalPoints.toString());
  drawStatCard(doc, MARGIN + cardW + 9, cardY2, cardW, 'Level', data.stats.currentLevel.toString());
  drawStatCard(doc, MARGIN + 2 * (cardW + 9), cardY2, cardW, 'Streak', `${data.stats.currentStreak} days`);

  // No sessions message
  if (data.stats.totalSessions === 0) {
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.gray);
    doc.text('No training sessions yet - start your first session!', PAGE_WIDTH / 2, 260, { align: 'center' });
  }

  // Footer
  drawFooter(doc);
}

function drawStatCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setFillColor(...COLORS.grayLight);
  doc.roundedRect(x, y, w, 38, 4, 4, 'F');

  doc.setTextColor(...COLORS.green);
  doc.setFontSize(22);
  doc.setFont('Helvetica', 'bold');
  doc.text(value, x + w / 2, y + 18, { align: 'center' });

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(label, x + w / 2, y + 30, { align: 'center' });
}

function drawPerformancePage(doc: jsPDF, data: ReportData) {
  let y = MARGIN;

  // Header
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, PAGE_WIDTH, 15, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text('Performance Summary', PAGE_WIDTH / 2, 10, { align: 'center' });

  y = 25;

  // Skill Analysis section
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('Skill Analysis (Last 30 Days)', MARGIN, y);
  y += 10;

  const skillEntries = Object.entries(data.skills) as [string, { accuracy: number; totalAnswered: number; trend: string }][];

  for (const [key, skill] of skillEntries) {
    const label = SKILL_LABELS[key] ?? key;
    const barWidth = CONTENT_WIDTH - 60;
    const filledWidth = (skill.accuracy / 100) * barWidth;
    const trend = trendArrow(skill.trend as 'up' | 'down' | 'stable');

    // Label
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(label, MARGIN, y + 5);

    // Percentage + trend
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(`${skill.accuracy}% ${trend} (${skill.totalAnswered} Q)`, MARGIN + barWidth + 5, y + 5);

    // Bar background
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(MARGIN, y + 8, barWidth, 6, 3, 3, 'F');

    // Bar fill
    if (filledWidth > 0) {
      const barColor = skill.accuracy >= 80 ? COLORS.green : skill.accuracy >= 60 ? COLORS.gold : COLORS.red;
      doc.setFillColor(...barColor);
      doc.roundedRect(MARGIN, y + 8, Math.max(filledWidth, 6), 6, 3, 3, 'F');
    }

    y += 22;
  }

  y += 10;

  // Weekly Comparison
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('Weekly Comparison (Last 4 Weeks)', MARGIN, y);
  y += 10;

  if (data.weeklyData.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('Helvetica', 'normal');
    doc.text('Not enough data for weekly comparison', MARGIN, y + 5);
    y += 15;
  } else {
    // Table header
    doc.setFillColor(...COLORS.greenLight);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    const colX = [MARGIN + 5, MARGIN + 55, MARGIN + 100, MARGIN + 140];
    doc.text('Week', colX[0], y + 7);
    doc.text('Sessions', colX[1], y + 7);
    doc.text('Accuracy', colX[2], y + 7);
    doc.text('Points', colX[3], y + 7);
    y += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...COLORS.black);
    for (const week of data.weeklyData) {
      doc.setFontSize(10);
      doc.text(week.week, colX[0], y + 5);
      doc.text(week.sessions.toString(), colX[1], y + 5);
      doc.text(`${week.accuracy}%`, colX[2], y + 5);
      doc.text(week.points.toString(), colX[3], y + 5);

      // Mini bar
      const barW = 40;
      const filled = (week.accuracy / 100) * barW;
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(MARGIN + 95, y + 8, barW, 3, 1.5, 1.5, 'F');
      if (filled > 0) {
        doc.setFillColor(...COLORS.green);
        doc.roundedRect(MARGIN + 95, y + 8, Math.max(filled, 3), 3, 1.5, 1.5, 'F');
      }

      y += 14;
    }
  }

  drawFooter(doc);
}

function drawRecommendationsPage(doc: jsPDF, data: ReportData) {
  // Header
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, PAGE_WIDTH, 15, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'bold');
  doc.text('Strengths, Weaknesses & Recommendations', PAGE_WIDTH / 2, 10, { align: 'center' });

  let y = 30;

  // Strengths
  doc.setTextColor(...COLORS.green);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('Strengths', MARGIN, y);
  y += 8;

  if (data.strengths.length === 0) {
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text('Complete more sessions to identify strengths', MARGIN + 5, y + 5);
    y += 12;
  } else {
    for (const s of data.strengths) {
      doc.setFillColor(...COLORS.greenLight);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 3, 3, 'F');
      doc.setTextColor(...COLORS.green);
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`+ ${s}`, MARGIN + 5, y + 7);
      y += 13;
    }
  }

  y += 10;

  // Weaknesses
  doc.setTextColor(...COLORS.red);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('Areas for Improvement', MARGIN, y);
  y += 8;

  if (data.weaknesses.length === 0) {
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text('Complete more sessions to identify areas for improvement', MARGIN + 5, y + 5);
    y += 12;
  } else {
    for (const w of data.weaknesses) {
      doc.setFillColor(...COLORS.redLight);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 3, 3, 'F');
      doc.setTextColor(...COLORS.red);
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`! ${w}`, MARGIN + 5, y + 7);
      y += 13;
    }
  }

  y += 10;

  // Recommendations
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('Recommendations', MARGIN, y);
  y += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  for (let i = 0; i < data.recommendations.length; i++) {
    doc.setFillColor(...COLORS.goldLight);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 3, 3, 'F');
    doc.text(`${i + 1}. ${data.recommendations[i]}`, MARGIN + 5, y + 7);
    y += 13;
  }

  y += 15;

  // Badges section
  if (data.stats.badges.length > 0) {
    doc.setTextColor(...COLORS.green);
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.text('Earned Badges', MARGIN, y);
    y += 10;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    for (const badge of data.stats.badges) {
      const info = BADGE_MAP[badge] ?? { name: badge, icon: '*' };
      doc.text(`${info.icon} ${info.name}`, MARGIN + 5, y);
      y += 8;
    }
  }

  drawFooter(doc);
}

function drawFooter(doc: jsPDF) {
  doc.setDrawColor(...COLORS.green);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, PAGE_HEIGHT - 20, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 20);

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('Bunyan - bunyan.guru', PAGE_WIDTH / 2, PAGE_HEIGHT - 14, { align: 'center' });
  doc.text('"Every building starts with a brick"', PAGE_WIDTH / 2, PAGE_HEIGHT - 9, { align: 'center' });
}
