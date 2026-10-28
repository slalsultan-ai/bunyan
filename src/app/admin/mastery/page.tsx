'use client';
import { useCallback, useEffect, useState } from 'react';
import { questionAgeGroupLabel, questionSkillAreaLabel } from '@/lib/question-taxonomy';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Decision {
  rule: string;
  message: string;
  skillKey?: string;
  values?: Record<string, number | string | boolean | null>;
}

interface SkillState {
  skillKey: string;
  pKnown: number;
  status: 'learning' | 'testing' | 'mastered' | 'deferred';
  observations: number;
  attemptsInStatus: number;
  testResults: boolean[];
  reviewStage: number;
  nextReviewAt: string | null;
  deferredReason: string | null;
  remediationFor: string | null;
  masteredAt: string | null;
}

interface SkillRow {
  key: string;
  nameAr: string;
  area: string;
  order: number;
  prerequisites: string[];
  questionCount: number;
  eligible: boolean;
  unlocked: boolean;
  state: SkillState | null;
}

interface Attempt {
  id: number;
  sessionId: number | null;
  questionId: string;
  skillKey: string;
  purpose: string;
  isCorrect: boolean;
  pBefore: number;
  pAfter: number;
  statusBefore: string;
  statusAfter: string;
  selectionReason: (Decision & { difficulty?: string; pick?: string }) | null;
  decisions: Decision[] | null;
  createdAt: string;
  selectedOption?: number | null;
  selectedText?: string | null;
  correctIndex?: number | null;
  correctText?: string | null;
  questionText?: string | null;
}

interface ChildReport {
  child: { id: string; name: string; age: number; ageGroup: string };
  supported: boolean;
  trackAttempts?: Record<string, number>;
  skills?: SkillRow[];
  attempts?: Attempt[];
}

interface GapSkill {
  key: string;
  nameAr: string;
  area: string;
  count: number;
  duplicates: number;
  missing: number;
  eligible: boolean;
  byDifficulty: Record<string, number>;
  sources: string[];
}

interface Overview {
  recent: Array<{ childId: string; lastUpdate: string; mastered: number; child: { name: string; email: string; ageGroup: string } | null }>;
  gaps: { minQuestionsPerSkill: number; skills: GapSkill[]; unmapped: Array<{ skillArea: string; subSkill: string; count: number }> };
  config: Record<string, unknown>;
  defaults: Record<string, unknown>;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  learning: { label: 'جارية', cls: 'bg-blue-100 text-blue-700' },
  testing: { label: 'اختبار موازٍ', cls: 'bg-amber-100 text-amber-700' },
  mastered: { label: 'مُتقنة', cls: 'bg-emerald-100 text-emerald-700' },
  deferred: { label: 'مؤجلة', cls: 'bg-slate-200 text-slate-700' },
};

const PURPOSE_LABEL: Record<string, string> = {
  practice: 'تمرين',
  diagnostic: 'تشخيص',
  test: 'اختبار موازٍ',
  review: 'مراجعة',
};

const CONFIG_LABELS: Record<string, string> = {
  masteryThreshold: 'عتبة P(L) لبدء الاختبار الموازي',
  testSize: 'عدد أسئلة الاختبار الموازي',
  testPassCount: 'الحد الأدنى للنجاح في الاختبار',
  minPracticeBeforeRetest: 'تمارين مطلوبة قبل إعادة الاختبار',
  stuckAttempts: 'قاعدة التعثّر: عدد الإجابات',
  stuckPKnown: 'قاعدة التعثّر: P(L) أقل من',
  reviewIntervalsDays: 'فترات المراجعة (أيام، مفصولة بفواصل)',
  reviewWrongsToRelapse: 'أخطاء المراجعة قبل الانتكاس',
  relapsePKnown: 'P(L) بعد الانتكاس',
  easyBelow: 'سهل إذا P(L) أقل من',
  hardAbove: 'صعب إذا P(L) أكبر من',
  sessionSize: 'طول الجلسة',
  maxReviewsPerSession: 'أقصى مراجعات في الجلسة',
  maxDiagnosticsPerSession: 'أقصى أسئلة تشخيص في الجلسة',
  maxPracticePerSkillPerSession: 'أقصى تمارين لمهارة واحدة في الجلسة',
  diagnosticPerSkill: 'أسئلة التشخيص لكل مهارة',
  minQuestionsPerSkill: 'أقل عدد أسئلة لدخول المهارة',
  recentExcludeDays: 'استبعاد الأسئلة المكررة خلال (أيام)',
  defaultPInit: 'BKT: المعرفة المسبقة P(L₀)',
  defaultPTransit: 'BKT: احتمال التعلّم T',
  defaultPSlip: 'BKT: احتمال الزلّة S',
  maxPGuess: 'BKT: أقصى احتمال تخمين G',
};

const pct = (p: number) => `${Math.round(p * 100)}%`;
const LETTERS_AR = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

// ─── Page ────────────────────────────────────────────────────────────────────

const TRACKS = [
  { key: '6-9', label: 'المسار الذكي (6–9)' },
  { key: 'mawhiba_l1', label: 'مسار موهبة ١' },
  { key: 'mawhiba_l2', label: 'مسار موهبة ٢' },
] as const;
type Track = (typeof TRACKS)[number]['key'];

export default function AdminMasteryPage() {
  const [tab, setTab] = useState<'child' | 'gaps' | 'config'>('child');
  const [track, setTrack] = useState<Track>('6-9');
  // Child to reopen after an automatic switch to the track that holds their data.
  const [carryChild, setCarryChild] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const res = await fetch(`/api/admin/mastery?track=${track}`);
    if (!res.ok) { setError('تعذّر التحميل'); return; }
    setOverview(await res.json());
  }, [track]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">محرك الإتقان</h1>
      <p className="text-slate-500 text-sm mb-6">
        نموذج BKT لكل طفل ومهارة، وقواعد الإتقان، وسبب كل قرار اتخذه المحرك. (العلم: <code>adaptive_mastery</code>)
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {TRACKS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTrack(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${track === t.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {([['child', 'قرارات طفل'], ['gaps', 'نواقص المحتوى'], ['config', 'الإعدادات']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === key ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {tab === 'child' && (
        <ChildTab
          key={track}
          overview={overview}
          track={track}
          initialChildId={carryChild}
          onSwitchTrack={(t, childId) => { setCarryChild(childId); setTrack(t); }}
        />
      )}
      {tab === 'gaps' && overview && <GapsTab gaps={overview.gaps} />}
      {tab === 'config' && overview && <ConfigTab overview={overview} onSaved={loadOverview} />}
    </div>
  );
}

// ─── Child decisions ─────────────────────────────────────────────────────────

function ChildTab({ overview, track, initialChildId, onSwitchTrack }: {
  overview: Overview | null;
  track: Track;
  initialChildId: string | null;
  onSwitchTrack: (track: Track, childId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<Array<{ id: string; name: string; age: number; ageGroup: string }> | null>(null);
  const [report, setReport] = useState<ChildReport | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!email.trim()) return;
    const res = await fetch(`/api/admin/mastery?email=${encodeURIComponent(email.trim())}`);
    const data = await res.json();
    setFound(data.children ?? []);
  };

  const openChild = useCallback(async (childId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/mastery?childId=${childId}&track=${track}`);
    const data: ChildReport | null = res.ok ? await res.json() : null;
    setLoading(false);
    // Nothing here but data in the other track → jump there instead of showing an empty page.
    const counts = data?.trackAttempts ?? {};
    const hereCount = counts[track] ?? 0;
    const other = TRACKS.find((t) => t.key !== track && (counts[t.key] ?? 0) > 0);
    if (data && other && (!data.supported || hereCount === 0)) {
      onSwitchTrack(other.key, childId);
      return;
    }
    setReport(data);
  }, [track, onSwitchTrack]);

  useEffect(() => {
    if (initialChildId) openChild(initialChildId);
  }, [initialChildId, openChild]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="إيميل ولي الأمر"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm"
            dir="ltr"
          />
          <button onClick={search} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold">بحث</button>
        </div>
        {found && (
          <div className="mt-3 flex flex-wrap gap-2">
            {found.length === 0 && <p className="text-slate-500 text-sm">لا يوجد أطفال لهذا الحساب</p>}
            {found.map((c) => (
              <button key={c.id} onClick={() => openChild(c.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm hover:bg-slate-200">
                {c.name} · {c.age} سنوات
              </button>
            ))}
          </div>
        )}
        {overview && overview.recent.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">آخر الأطفال نشاطًا في المحرك</p>
            <div className="flex flex-wrap gap-2">
              {overview.recent.map((r) => (
                <button key={r.childId} onClick={() => openChild(r.childId)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-sm hover:bg-emerald-100">
                  {r.child?.name ?? r.childId.slice(0, 8)} · {r.mastered} مُتقنة
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-slate-500">جارٍ التحميل…</p>}
      {report && !report.supported && (
        <p className="text-amber-700 bg-amber-50 rounded-xl p-4">
          {report.child.name} من فئة {questionAgeGroupLabel(report.child.ageGroup)}، والمحرك يدعم فئة 6-9 فقط حاليًا.
        </p>
      )}
      {report?.supported && report.skills && (
        <>
          <SkillsTable skills={report.skills} />
          <AttemptsLog attempts={report.attempts ?? []} skills={report.skills} />
        </>
      )}
    </div>
  );
}

function SkillsTable({ skills }: { skills: SkillRow[] }) {
  const sorted = [...skills].sort((a, b) => a.order - b.order);
  const name = new Map(skills.map((s) => [s.key, s.nameAr]));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-right p-3">المهارة</th>
            <th className="text-right p-3">الحالة</th>
            <th className="text-right p-3">P(L)</th>
            <th className="text-right p-3">إجابات</th>
            <th className="text-right p-3">المتطلبات</th>
            <th className="text-right p-3">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const st = s.state;
            const status = !s.eligible ? null : st ? STATUS_LABEL[st.status] : null;
            return (
              <tr key={s.key} className="border-t border-slate-100">
                <td className="p-3 font-medium">{s.nameAr}<div className="text-xs text-slate-400" dir="ltr">{s.key}</div></td>
                <td className="p-3">
                  {!s.eligible ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600">مستبعدة ({s.questionCount} سؤال)</span>
                  ) : (
                    <>
                      {status && <span className={`px-2 py-0.5 rounded-full text-xs ${status.cls}`}>{status.label}</span>}
                      {!s.unlocked && <span className="mr-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">🔒 مقفلة</span>}
                    </>
                  )}
                </td>
                <td className="p-3">
                  {st && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${st.pKnown >= 0.8 ? 'bg-emerald-500' : st.pKnown >= 0.5 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: pct(st.pKnown) }} />
                      </div>
                      <span className="tabular-nums">{st.pKnown.toFixed(3)}</span>
                    </div>
                  )}
                </td>
                <td className="p-3 tabular-nums">{st?.observations ?? 0}</td>
                <td className="p-3 text-xs text-slate-500">{s.prerequisites.map((p) => name.get(p) ?? p).join('، ') || '—'}</td>
                <td className="p-3 text-xs text-slate-500">
                  {st?.status === 'testing' && `الاختبار: ${st.testResults.filter(Boolean).length}/${st.testResults.length}`}
                  {st?.status === 'mastered' && st.nextReviewAt && `مراجعة: ${st.nextReviewAt.slice(0, 10)}`}
                  {st?.deferredReason && `سبب التأجيل: ${st.deferredReason}`}
                  {st?.remediationFor && ` علاج لـ ${name.get(st.remediationFor) ?? st.remediationFor}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttemptsLog({ attempts, skills }: { attempts: Attempt[]; skills: SkillRow[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const name = new Map(skills.map((s) => [s.key, s.nameAr]));
  if (attempts.length === 0) {
    return <p className="text-slate-500 text-sm">لا توجد إجابات في المحرك بعد.</p>;
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <h2 className="font-bold p-4 border-b border-slate-100">سجل القرارات (الأحدث أولًا)</h2>
      <ul>
        {attempts.map((a) => (
          <li key={a.id} className="border-b border-slate-50 last:border-0">
            <button onClick={() => setOpen(open === a.id ? null : a.id)} className="w-full text-right p-3 hover:bg-slate-50 flex flex-wrap items-center gap-3 text-sm">
              <span className={a.isCorrect ? 'text-emerald-600' : 'text-red-500'}>{a.isCorrect ? '✓' : '✗'}</span>
              <span className="font-medium">{name.get(a.skillKey) ?? a.skillKey}</span>
              <span className="text-xs bg-slate-100 rounded px-2 py-0.5">{PURPOSE_LABEL[a.purpose] ?? a.purpose}</span>
              <span className="tabular-nums text-slate-600" dir="ltr">{a.pBefore.toFixed(3)} → {a.pAfter.toFixed(3)}</span>
              {a.selectedText != null && (
                <span className="text-xs text-slate-500">
                  اختار ({LETTERS_AR[a.selectedOption ?? 0]}) {a.selectedText}
                  {!a.isCorrect && a.correctText != null && <> · الصحيح ({LETTERS_AR[a.correctIndex ?? 0]}) {a.correctText}</>}
                </span>
              )}
              {a.statusBefore !== a.statusAfter && (
                <span className="text-xs text-amber-700">{STATUS_LABEL[a.statusBefore]?.label} ← {STATUS_LABEL[a.statusAfter]?.label}</span>
              )}
              <span className="text-xs text-slate-400 mr-auto">{a.createdAt}</span>
            </button>
            {open === a.id && (
              <div className="px-4 pb-4 space-y-2 text-sm">
                {a.questionText && (
                  <p className="whitespace-pre-line rounded-lg bg-white p-3 text-slate-700 ring-1 ring-slate-100">{a.questionText}</p>
                )}
                {a.selectionReason && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="font-bold text-indigo-800 mb-1">لماذا اختير هذا السؤال؟</p>
                    <DecisionLine d={a.selectionReason} />
                    {a.selectionReason.pick && <p className="text-xs text-indigo-600 mt-1" dir="ltr">pick: {a.selectionReason.pick}</p>}
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <p className="font-bold text-slate-800">القواعد التي انطبقت</p>
                  {(a.decisions ?? []).map((d, i) => <DecisionLine key={i} d={d} />)}
                </div>
                <p className="text-xs text-slate-400" dir="ltr">question: {a.questionId} · session: {a.sessionId}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DecisionLine({ d }: { d: Decision }) {
  return (
    <div>
      <p><code className="text-xs bg-white rounded px-1 ml-2" dir="ltr">{d.rule}</code>{d.message}</p>
      {d.values && (
        <p className="text-xs text-slate-500 mt-0.5" dir="ltr">
          {Object.entries(d.values).map(([k, v]) => `${k}=${v}`).join('  ·  ')}
        </p>
      )}
    </div>
  );
}

// ─── Content gaps ────────────────────────────────────────────────────────────

function GapsTab({ gaps }: { gaps: Overview['gaps'] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <p className="p-4 text-sm text-slate-600 border-b border-slate-100">
          المهارة تدخل المحرك إذا كان فيها {gaps.minQuestionsPerSkill} سؤالًا نشطًا مختلف النص على الأقل في هذا المسار (النسخ المكررة تُحسب مرة واحدة).
        </p>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right p-3">المهارة</th>
              <th className="text-right p-3">الأسئلة</th>
              <th className="text-right p-3">نسخ مكررة</th>
              <th className="text-right p-3">سهل / متوسط / صعب</th>
              <th className="text-right p-3">الناقص</th>
              <th className="text-right p-3">المصادر (skill_area / sub_skill)</th>
            </tr>
          </thead>
          <tbody>
            {gaps.skills.map((s) => (
              <tr key={s.key} className={`border-t border-slate-100 ${s.eligible ? '' : 'bg-red-50/40'}`}>
                <td className="p-3 font-medium">{s.nameAr}</td>
                <td className="p-3 tabular-nums">{s.count}</td>
                <td className="p-3 tabular-nums">{s.duplicates > 0 ? <span className="text-amber-700">{s.duplicates}</span> : '—'}</td>
                <td className="p-3 tabular-nums">{s.byDifficulty.easy ?? 0} / {s.byDifficulty.medium ?? 0} / {s.byDifficulty.hard ?? 0}</td>
                <td className="p-3">{s.eligible ? <span className="text-emerald-600">✓</span> : <span className="text-red-600 font-bold">{s.missing}</span>}</td>
                <td className="p-3 text-xs text-slate-500">{s.sources.join('، ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-bold mb-2">مهارات فرعية غير مربوطة بالتصنيف</h2>
        {gaps.unmapped.length === 0 ? (
          <p className="text-sm text-slate-500">كل الأسئلة مربوطة.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {gaps.unmapped.map((u) => (
              <li key={`${u.skillArea}/${u.subSkill}`}>{questionSkillAreaLabel(u.skillArea)} / {u.subSkill} — {u.count} سؤال</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Config ──────────────────────────────────────────────────────────────────

function ConfigTab({ overview, onSaved }: { overview: Overview; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(overview.config).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])),
  );
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    const config: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      config[k] = k === 'reviewIntervalsDays' ? v.split(',').map((x) => Number(x.trim())) : Number(v);
    }
    const res = await fetch('/api/admin/mastery/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    const data = await res.json();
    if (res.ok) { setMessage('تم الحفظ'); onSaved(); }
    else setMessage(`${data.error}: ${(data.rejected ?? []).map((k: string) => CONFIG_LABELS[k] ?? k).join('، ')}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.keys(CONFIG_LABELS).map((key) => {
          const def = overview.defaults[key];
          const defStr = Array.isArray(def) ? def.join(',') : String(def);
          const changed = draft[key] !== defStr;
          return (
            <label key={key} className="block">
              <span className="text-sm text-slate-700">{CONFIG_LABELS[key]}</span>
              <input
                value={draft[key] ?? ''}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className={`mt-1 w-full border rounded-xl px-3 py-2 text-sm tabular-nums ${changed ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}
                dir="ltr"
              />
              <span className="text-xs text-slate-400">الافتراضي: {defStr}</span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-sm">حفظ</button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
