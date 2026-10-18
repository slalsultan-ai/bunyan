'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  advance, affordableStock, availableEventChoices, chooseEvent, choosePrice, chooseStock,
  createJuiceStand, expectedDemand, finalInsight, type EventChoice, type JuiceStandState, type Weather,
} from '@/lib/simulations/juice-stand';
import { useSound } from '@/hooks/useSound';
import { formatCups, formatCustomers, formatRiyals } from '@/lib/arabic-count';

// A new introduction needs a fresh session so returning testers do not skip it.
const STORAGE_KEY = 'bunyan:simulation:juice-stand:v2';
const backgrounds: Record<Weather, string> = {
  sunny: '/assets/simulations/juice-stand/backgrounds/park_day1_sunny.png',
  rain: '/assets/simulations/juice-stand/backgrounds/park_day2_rain.png',
  festival: '/assets/simulations/juice-stand/backgrounds/park_day3_festival.png',
};
const weatherLabel: Record<Weather, string> = { sunny: 'مشمس', rain: 'ممطر', festival: 'يوم فعالية' };
const eventCopy: Record<EventChoice, { title: string; text: string }> = {
  restock: { title: 'جهّز كوبين إضافيين', text: 'تكلفة 4 ريالات. ستلحق بالزبائن القادمين.' },
  hold: { title: 'أكمل بما لديك', text: 'لا تكلفة إضافية. راقب ما يحدث.' },
  umbrella: { title: 'اشترِ مظلة للعربة', text: 'تكلفة 5 ريالات. تساعد الزبائن على الوصول في المطر.' },
  discount: { title: 'خفّض سعر الكوب ريالاً واحداً', text: 'قد يجذب مزيداً من زبائن المهرجان.' },
  extra_stock: { title: 'جهّز كوبين للفعالية', text: 'تكلفة 4 ريالات. الحديقة مزدحمة اليوم.' },
};

function loadState(): JuiceStandState {
  if (typeof window === 'undefined') return createJuiceStand();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as JuiceStandState : createJuiceStand();
  } catch { return createJuiceStand(); }
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-center shadow-sm backdrop-blur"><div className="text-lg">{icon}</div><div className="text-xs font-bold text-slate-500">{label}</div><div className="font-black text-[#174835]">{value}</div></div>;
}

export default function JuiceStandGame() {
  const [state, setState] = useState<JuiceStandState>(createJuiceStand);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [transaction, setTransaction] = useState<{ kind: 'expense' | 'income'; amount: number; id: number } | null>(null);
  const { playCorrect, playFanfare, playNext, playWrong } = useSound(muted);

  useEffect(() => { setState(loadState()); setReady(true); }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);

  const update = (next: JuiceStandState, sound: 'next' | 'positive' | 'quiet' = 'next') => {
    if (sound === 'positive') playCorrect();
    else if (sound === 'quiet') playWrong();
    else playNext();
    const amount = next.cash - state.cash;
    if (amount !== 0 && !reducedMotion) {
      const effect = { kind: amount > 0 ? 'income' as const : 'expense' as const, amount: Math.abs(amount), id: Date.now() };
      setTransaction(effect);
      window.setTimeout(() => setTransaction((current) => current?.id === effect.id ? null : current), 1050);
    }
    setState(next);
  };
  const weather = state.day === 1 ? 'sunny' : state.day === 2 ? 'rain' : 'festival';
  const cart = state.umbrella ? 'cart_umbrella.png' : state.inventory <= 2 ? 'cart_nearly_empty.png' : 'cart_full.png';
  const restart = () => { window.localStorage.removeItem(STORAGE_KEY); setState(createJuiceStand()); playNext(); };

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#fff7e6] font-bold text-[#174835]">نجهّز الحديقة...</main>;

  return (
    <main className="min-h-screen bg-[#fff7e6] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/15">
        <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
          <Link href="/simulations" className="text-sm font-bold text-slate-500">خروج</Link>
          <div className="text-center"><p className="font-black text-[#174835]">عربة العصير</p><p className="text-xs text-slate-500">اليوم {state.day} من 3 · {weatherLabel[weather]}</p></div>
          <div className="flex gap-2"><button aria-pressed={muted} onClick={() => setMuted(!muted)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{muted ? '🔇' : '🔊'}</button><button onClick={() => setReducedMotion(!reducedMotion)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{reducedMotion ? 'حركة أقل' : 'حركة'}</button><button onClick={restart} className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">إعادة</button></div>
        </header>

        <section className="relative min-h-[300px] overflow-hidden bg-cover bg-center p-4 sm:min-h-[390px] sm:p-6" style={{ backgroundImage: `url(${backgrounds[weather]})` }}>
          <div className="absolute inset-0 bg-white/10" />
          {weather === 'rain' && <div aria-hidden="true" className={`absolute inset-0 text-2xl tracking-[1rem] text-sky-100/70 ${reducedMotion ? '' : 'animate-[pulse_2s_ease-in-out_infinite]'}`}>💧 💧 💧 💧 💧</div>}
          {weather === 'festival' && <div aria-hidden="true" className="absolute inset-x-0 top-16 text-center text-2xl tracking-[1.2rem]">🎈 🎉 🎪 🎉 🎈</div>}
          <div className="relative z-10 grid grid-cols-4 gap-2 sm:max-w-md">
            <Stat icon="🪙" label="المال المتاح" value={formatRiyals(state.cash)} />
            <Stat icon="🥤" label="الأكواب الجاهزة" value={state.inventory} />
            <Stat icon="😊" label="الرضا" value={state.reputation >= 2 ? 'عالٍ' : state.reputation < 0 ? 'يحتاج تحسن' : 'جيد'} />
            <Stat icon="🗑️" label="الهدر" value={state.waste} />
          </div>
          <div className="absolute left-5 top-24 z-20 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-center shadow-lg sm:left-8 sm:top-28">
            <div className="text-3xl">👛</div><div className="text-xs font-black text-amber-900">محفظة العربة</div>
          </div>
          {transaction && <div key={transaction.id} className={`pointer-events-none absolute left-10 top-24 z-30 ${transaction.kind === 'income' ? 'animate-[wallet-income_0.95s_ease-out_forwards]' : 'animate-[wallet-expense_0.95s_ease-in_forwards]'}`}>
            <div className="rounded-full bg-amber-300 px-2 py-1 text-lg shadow-lg">🪙<span className="mr-1 text-xs font-black text-amber-950">{transaction.amount}</span></div>
          </div>}
          {state.stage !== 'complete' && <>
            <img src={`/assets/simulations/juice-stand/sprites_png/${cart}`} alt="عربة العصير" className="absolute bottom-0 right-[10%] h-[52%] max-w-[55%] object-contain drop-shadow-xl sm:right-[18%]" />
            <img src="/assets/simulations/juice-stand/sprites_png/customer_boy_blue.png" alt="زبون ينتظر" className={`absolute bottom-0 left-[8%] h-[38%] object-contain sm:left-[17%] ${reducedMotion ? '' : 'animate-[pulse_2.5s_ease-in-out_infinite]'}`} />
            <img src="/assets/simulations/juice-stand/sprites_png/customer_girl_pink.png" alt="زبونة تنتظر" className="absolute bottom-0 left-[29%] hidden h-[31%] object-contain sm:block" />
          </>}
        </section>

        <section className="mx-auto -mt-4 max-w-3xl px-4 pb-7 sm:-mt-8 sm:px-6 sm:pb-10">
          <div className="relative rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-xl sm:p-7">
            {state.stage === 'intro' && <Intro onStart={() => update(advance(state))} />}
            {state.stage === 'stock' && <Stock state={state} onChoose={(cups) => update(chooseStock(state, cups))} />}
            {state.stage === 'price' && <Price onChoose={(price) => update(choosePrice(state, price))} />}
            {state.stage === 'selling_first' && <Selling state={state} reducedMotion={reducedMotion} onComplete={() => update(advance(state), 'positive')} />}
            {state.stage === 'event' && <Event state={state} onChoose={(choice) => update(chooseEvent(state, choice))} />}
            {state.stage === 'selling_second' && <Selling state={state} reducedMotion={reducedMotion} onComplete={() => update(advance(state), 'positive')} final />}
            {state.stage === 'summary' && <Summary state={state} onContinue={() => update(advance(state))} />}
            {state.stage === 'complete' && <Final state={state} onRestart={restart} onCelebrate={playFanfare} />}
          </div>
        </section>
      </div>
      <style jsx>{`
        @keyframes wallet-income {
          0% { opacity: 0; transform: translate(220px, 110px) scale(.55) rotate(-20deg); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translate(0, 0) scale(1.25) rotate(12deg); }
        }
        @keyframes wallet-expense {
          0% { opacity: 0; transform: translate(0, 0) scale(1.2) rotate(10deg); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(220px, 110px) scale(.55) rotate(-22deg); }
        }
      `}</style>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const [step, setStep] = useState(0);
  const prompts = ['بعد ثلاثة أيام سيبدأ مهرجان الحديقة! لخدمة أول زبون، المس إبريق العصير.', 'رائع! الآن المس الكوب لتمتلئه بالعصير.', 'أحسنت! المس سالم لتسلمه الكوب.'];
  if (step < 3) return <div className="text-center"><div className="rounded-3xl bg-gradient-to-b from-amber-50 to-emerald-50 p-5"><p className="text-sm font-black text-amber-800">🎪 المهرجان الكبير بعد 3 أيام</p><h1 className="mt-2 text-2xl font-black text-[#174835]">أنت صاحب عربة العصير</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">{prompts[step]}</p><div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 text-6xl"><button aria-label="إبريق العصير" onClick={() => step === 0 && setStep(1)} className={`rounded-3xl p-3 transition ${step === 0 ? 'bg-white shadow-lg hover:scale-110 active:scale-95' : 'opacity-40'}`}>🫗</button><button aria-label="كوب العصير" onClick={() => step === 1 && setStep(2)} className={`rounded-3xl p-3 transition ${step === 1 ? 'bg-white shadow-lg hover:scale-110 active:scale-95' : 'opacity-40'}`}>🥤</button><button aria-label="سالم الزبون" onClick={() => step === 2 && setStep(3)} className={`rounded-3xl p-3 transition ${step === 2 ? 'bg-white shadow-lg hover:scale-110 active:scale-95' : 'opacity-40'}`}>🧒</button></div><p className="mt-4 text-xs text-slate-500">خدمة تدريبية: لا تخصم من 24 ريالاً ولا تؤثر في نتيجة مشروعك.</p></div></div>;
  return <div className="text-center"><span className="text-5xl">😊🪙</span><h1 className="mt-3 text-2xl font-black text-[#174835]">سالم سعيد بالعصير!</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">هكذا تدير عربتك: تجهز العصير، تخدم الزبائن، ثم تخطط بمالك للمهرجان. الآن تبدأ رحلتك الرسمية بـ24 ريالاً.</p><div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-3 text-sm text-[#174835]"><b>هدفك:</b> استعد للمهرجان، ووازن بين مال العربة ورضا الزبائن.</div><button onClick={onStart} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">ابدأ مشروعك الحقيقي</button></div>;
}
function Stock({ state, onChoose }: { state: JuiceStandState; onChoose: (cups: number) => void }) { const dayNote = state.day === 1 ? 'اليوم الأول مشمس، والزوار يتجولون في الحديقة.' : state.day === 2 ? 'اليوم الثاني ممطر، وقد يقل عدد الزبائن.' : 'اليوم الثالث فيه فعالية، وقد يزداد عدد الزبائن.'; return <div><div className="mb-4 rounded-2xl bg-[#174835] p-3 text-center text-white"><p className="font-black">دورك الآن: خطّط ليومك</p><p className="mt-1 text-sm text-emerald-100">{dayNote}</p></div><Decision title="كم كوباً تريد أن تجهز؟" hint="تجهيز كل كوب يكلف ريالين. سترى الأكواب على العربة قبل البيع." options={[4, 6, 8].map((cups) => ({ value: cups, title: formatCups(cups), detail: `التكلفة: ${formatRiyals(cups * 2)}`, disabled: !affordableStock(state).includes(cups) }))} onChoose={onChoose} /></div>; }
function Price({ onChoose }: { onChoose: (price: number) => void }) { return <Decision title="بكم ستبيع الكوب؟" hint="السعر الأقل قد يجذب زبائن أكثر، والسعر الأعلى يزيد مال كل كوب يباع." options={[3, 4, 5].map((price) => ({ value: price, title: formatRiyals(price), detail: price === 3 ? 'سعر لطيف' : price === 4 ? 'سعر متوازن' : 'مال أكثر لكل كوب' }))} onChoose={onChoose} />; }
function Event({ state, onChoose }: { state: JuiceStandState; onChoose: (choice: EventChoice) => void }) { const title = state.day === 1 ? 'هناك زبائن قادمون، ماذا تفعل؟' : state.day === 2 ? 'المطر يغيّر حركة الحديقة.' : 'بدأت الفعالية والحديقة ازدحمت!'; return <Decision title={title} hint="قرارك سيغير ما يحدث في بقية اليوم." options={availableEventChoices(state).map((choice) => ({ value: choice, title: eventCopy[choice].title, detail: eventCopy[choice].text }))} onChoose={onChoose} />; }
function Selling({ state, reducedMotion, onComplete, final = false }: { state: JuiceStandState; reducedMotion: boolean; onComplete: () => void; final?: boolean }) {
  const [started, setStarted] = useState(false);
  const [fast, setFast] = useState(false);
  const [step, setStep] = useState(0);
  const after = advance(state);
  const sold = after.currentSold - state.currentSold;
  const unserved = after.currentMissedSales - state.currentMissedSales;
  const total = sold + unserved;
  const expected = expectedDemand(state);

  useEffect(() => {
    if (!started) return;
    if (total === 0) { const timer = window.setTimeout(onComplete, fast ? 80 : 500); return () => window.clearTimeout(timer); }
    if (step >= total) { const timer = window.setTimeout(onComplete, fast ? 80 : 420); return () => window.clearTimeout(timer); }
    const timer = window.setTimeout(() => setStep((value) => value + 1), fast ? 130 : 650);
    return () => window.clearTimeout(timer);
  }, [started, step, total, fast, onComplete]);

  const isSale = step > 0 && step <= sold;
  const isUnserved = step > sold;
  return <div className="text-center"><button onClick={() => setStarted(true)} disabled={started} className={`mx-auto flex max-w-md items-end justify-center gap-2 rounded-3xl border-2 border-dashed p-4 text-4xl transition ${started ? 'border-emerald-200 bg-emerald-50' : 'border-[#117a58] bg-emerald-50 hover:scale-105 active:scale-95'}`}><span className={reducedMotion ? '' : 'animate-[bounce_1.2s_ease-in-out_infinite]'}>{isUnserved ? '😕' : '🧒'}</span><span className={isSale && !reducedMotion ? 'animate-[bounce_0.5s_ease-in-out]' : ''}>{isSale ? '🥤' : '🧃'}</span><span>{isSale ? '🪙' : '👧'}</span></button><h2 className="mt-3 text-2xl font-black text-[#174835]">{final ? 'نكمل البيع بعد قرارك' : 'وصل أول الزبائن!'}</h2><p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">توقعنا اليوم: قد يزور العربة نحو {formatCustomers(expected)}. لا نعرف كم سيشتري حتى يبدأ البيع.</p>{!started ? <button onClick={() => setStarted(true)} className="mt-5 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">المس العربة وابدأ البيع</button> : <><div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-[#174835]">{step < total ? (isUnserved ? 'وصل زبون، لكن العصير نفد.' : 'تم تسليم كوب ودخلت نقود إلى المحفظة.') : 'اكتملت مجموعة الزبائن.'} <span className="mr-2 font-black">{step}/{total}</span></div><button onClick={() => setFast(true)} disabled={fast || step >= total} className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">{fast ? 'جارٍ التسريع...' : 'تسريع البيع'}</button></>}</div>;
}
function Decision<T extends string | number>({ title, hint, options, onChoose }: { title: string; hint: string; options: { value: T; title: string; detail: string; disabled?: boolean }[]; onChoose: (value: T) => void }) { return <div><h2 className="text-center text-xl font-black text-[#174835]">{title}</h2><p className="mt-2 text-center text-sm text-slate-500">{hint}</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={String(option.value)} disabled={option.disabled} onClick={() => onChoose(option.value)} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 text-right transition hover:border-[#117a58] hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><p className="font-black text-[#174835]">{option.title}</p><p className="mt-1 text-sm text-[#117a58]">{option.detail}</p></button>)}</div></div>; }
function Summary({ state, onContinue }: { state: JuiceStandState; onContinue: () => void }) { const day = state.history.at(-1)!; const reason = day.missedSales ? 'نفد العصير قبل وصول دور بعض الزبائن، لذلك لم تتمكن العربة من بيع المزيد.' : day.waste && day.weather === 'rain' ? 'كان اليوم ممطراً، فوصل زوار أقل وبقي عصير لم يُبع.' : day.waste && day.price === 5 ? 'اخترت سعراً مرتفعاً، فاشترى عدد أقل وبقي عصير لم يُبع.' : day.waste ? 'جهزت أكواباً أكثر مما احتاجه زوار الحديقة اليوم، فبقي عصير لم يُبع.' : day.price === 3 ? 'السعر اللطيف شجع الزبائن على الشراء واستخدمت ما جهزته.' : 'استخدمت كل ما جهزته اليوم.'; return <div className="text-center"><span className="text-4xl">{day.sold >= 5 ? '🎉' : '🌿'}</span><h2 className="mt-2 text-2xl font-black text-[#174835]">انتهى اليوم {day.day}</h2><div className="mt-5 grid grid-cols-4 gap-2 text-sm"><Stat icon="🥤" label="المباع" value={formatCups(day.sold)} /><Stat icon="🪙" label="المبيعات" value={formatRiyals(day.revenue)} /><Stat icon="🧾" label="التكلفة" value={formatRiyals(day.expenses)} /><Stat icon="📈" label="الربح" value={day.profit >= 0 ? formatRiyals(day.profit) : `خسارة ${formatRiyals(Math.abs(day.profit))}`} /></div><div className="mt-5 rounded-2xl bg-amber-50 p-4 text-right text-amber-900"><p className="font-black">كيف حدث ذلك؟</p><p className="mt-1 leading-7">دفعت {formatRiyals(day.expenses)} لتجهيز العصير، وحصلت على {formatRiyals(day.revenue)} من المبيعات، لذلك كان ربح اليوم {day.profit >= 0 ? formatRiyals(day.profit) : `خسارة ${formatRiyals(Math.abs(day.profit))}`}.</p></div><p className="mt-4 text-slate-600">{reason}</p><button onClick={onContinue} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">{state.day === 3 ? 'شاهد النتيجة' : 'ابدأ اليوم التالي'}</button></div>; }
function Final({ state, onRestart, onCelebrate }: { state: JuiceStandState; onRestart: () => void; onCelebrate: () => void }) { useEffect(() => { onCelebrate(); }, [onCelebrate]); return <div className="text-center"><span className="text-5xl">🏆</span><h1 className="mt-3 text-3xl font-black text-[#174835]">أكملت مشروعك!</h1><div className="mt-6 grid grid-cols-4 gap-2"><Stat icon="🪙" label="المال المتاح" value={formatRiyals(state.cash)} /><Stat icon="🥤" label="المباع" value={formatCups(state.sold)} /><Stat icon="😊" label="السمعة" value={state.reputation} /><Stat icon="🗑️" label="الهدر" value={formatCups(state.waste)} /></div><div className="mt-6 rounded-2xl bg-amber-50 p-4 text-right"><p className="font-black text-amber-900">أهم ما تعلمته</p><p className="mt-1 leading-7 text-amber-800">{finalInsight(state)}</p></div><p className="mt-5 font-bold text-[#174835]">لو بدأت من جديد، ماذا ستغيّر؟</p><div className="mt-3 flex flex-wrap justify-center gap-2 text-sm"><span className="rounded-full bg-emerald-50 px-3 py-2">كمية العصير</span><span className="rounded-full bg-emerald-50 px-3 py-2">السعر</span><span className="rounded-full bg-emerald-50 px-3 py-2">التعامل مع الطقس</span></div><button onClick={onRestart} className="mt-5 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">أعد التجربة</button></div>; }
