'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  advance, affordableStock, availableEventChoices, chooseEvent, choosePrice, chooseStock,
  createJuiceStand, expectedDemand, finalInsight, type EventChoice, type JuiceStandState, type Weather,
} from '@/lib/simulations/juice-stand';
import { useSound } from '@/hooks/useSound';

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
  umbrella: { title: 'ضع مظلة للعربة', text: 'تكلفة 3 ريالات. تحمي البيع من المطر.' },
  discount: { title: 'خفّض السعر قطعة واحدة', text: 'قد يجذب مزيداً من الزبائن.' },
  extra_stock: { title: 'جهّز كوبين للفعالية', text: 'تكلفة 4 ريالات. الحديقة مزدحمة اليوم.' },
};

function riyals(value: number) { return value === 1 ? 'ريال واحد' : value === 2 ? 'ريالان' : `${value} ريالات`; }

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
  const { playCorrect, playFanfare, playNext, playWrong } = useSound(muted);

  useEffect(() => { setState(loadState()); setReady(true); }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);

  const update = (next: JuiceStandState, sound: 'next' | 'positive' | 'quiet' = 'next') => {
    if (sound === 'positive') playCorrect();
    else if (sound === 'quiet') playWrong();
    else playNext();
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
          <div className="relative z-10 grid grid-cols-4 gap-2 sm:max-w-md">
            <Stat icon="🪙" label="المال المتاح" value={riyals(state.cash)} />
            <Stat icon="🥤" label="الأكواب الجاهزة" value={state.inventory} />
            <Stat icon="😊" label="الرضا" value={state.reputation >= 2 ? 'عالٍ' : state.reputation < 0 ? 'يحتاج تحسن' : 'جيد'} />
            <Stat icon="🗑️" label="الهدر" value={state.waste} />
          </div>
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
            {state.stage === 'selling_first' && <Selling state={state} reducedMotion={reducedMotion} onContinue={() => update(advance(state), 'positive')} />}
            {state.stage === 'event' && <Event state={state} onChoose={(choice) => update(chooseEvent(state, choice))} />}
            {state.stage === 'selling_second' && <Selling state={state} reducedMotion={reducedMotion} onContinue={() => update(advance(state), 'positive')} final />}
            {state.stage === 'summary' && <Summary state={state} onContinue={() => update(advance(state))} />}
            {state.stage === 'complete' && <Final state={state} onRestart={restart} onCelebrate={playFanfare} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) { return <div className="text-center"><span className="text-5xl">🍊</span><p className="mt-3 text-sm font-black text-[#117a58]">قصتك: الحديقة تحتاج عربة عصير اليوم</p><h1 className="mt-2 text-2xl font-black text-[#174835]">أنت مدير عربة العصير</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">ستدير عربتك لثلاثة أيام. لديك 24 ريالاً لتجهز العصير، تختار سعر الكوب، ثم تشاهد الزبائن يشترون أو يغادرون.</p><div className="mx-auto mt-5 grid max-w-lg grid-cols-3 gap-2 text-right text-sm"><div className="rounded-2xl bg-emerald-50 p-3"><span className="text-xl">1️⃣</span><p className="mt-1 font-bold text-[#174835]">خطّط</p><p className="text-xs text-slate-600">اختر الكمية والسعر</p></div><div className="rounded-2xl bg-amber-50 p-3"><span className="text-xl">2️⃣</span><p className="mt-1 font-bold text-[#174835]">شاهد</p><p className="text-xs text-slate-600">راقب البيع والزبائن</p></div><div className="rounded-2xl bg-sky-50 p-3"><span className="text-xl">3️⃣</span><p className="mt-1 font-bold text-[#174835]">قرّر</p><p className="text-xs text-slate-600">تصرّف عند المفاجآت</p></div></div><div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-3 text-sm text-[#174835]"><b>هدفك:</b> حافظ على مال العربة ورضا الزبائن. لا توجد إجابة واحدة صحيحة؛ جرّب خطتك وتعلّم من النتيجة.</div><button onClick={onStart} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">أنا جاهز لإدارة العربة</button></div>; }
function Stock({ state, onChoose }: { state: JuiceStandState; onChoose: (cups: number) => void }) { const dayNote = state.day === 1 ? 'اليوم الأول مشمس، والزوار يتجولون في الحديقة.' : state.day === 2 ? 'اليوم الثاني ممطر، وقد يقل عدد الزبائن.' : 'اليوم الثالث فيه فعالية، وقد يزداد عدد الزبائن.'; return <div><div className="mb-4 rounded-2xl bg-[#174835] p-3 text-center text-white"><p className="font-black">دورك الآن: خطّط ليومك</p><p className="mt-1 text-sm text-emerald-100">{dayNote}</p></div><Decision title="كم كوباً تريد أن تجهز؟" hint="تجهيز كل كوب يكلف ريالين. سترى الأكواب على العربة قبل البيع." options={[4, 6, 8].map((cups) => ({ value: cups, title: `${cups} أكواب`, detail: `التكلفة: ${riyals(cups * 2)}`, disabled: !affordableStock(state).includes(cups) }))} onChoose={onChoose} /></div>; }
function Price({ onChoose }: { onChoose: (price: number) => void }) { return <Decision title="بكم ستبيع الكوب؟" hint="السعر الأقل قد يجذب زبائن أكثر، والسعر الأعلى يزيد مال كل كوب يباع." options={[3, 4, 5].map((price) => ({ value: price, title: riyals(price), detail: price === 3 ? 'سعر لطيف' : price === 4 ? 'سعر متوازن' : 'مال أكثر لكل كوب' }))} onChoose={onChoose} />; }
function Event({ state, onChoose }: { state: JuiceStandState; onChoose: (choice: EventChoice) => void }) { const title = state.day === 1 ? 'هناك زبائن قادمون، ماذا تفعل؟' : state.day === 2 ? 'المطر يغيّر حركة الحديقة.' : 'بدأت الفعالية والحديقة ازدحمت!'; return <Decision title={title} hint="قرارك سيغير ما يحدث في بقية اليوم." options={availableEventChoices(state).map((choice) => ({ value: choice, title: eventCopy[choice].title, detail: eventCopy[choice].text }))} onChoose={onChoose} />; }
function Selling({ state, reducedMotion, onContinue, final = false }: { state: JuiceStandState; reducedMotion: boolean; onContinue: () => void; final?: boolean }) {
  const expected = expectedDemand(state);
  const current = state.currentSold;
  const projected = Math.min(state.inventory, Math.max(0, Math.round(expected * (final ? 0.45 : 0.55))));
  const willMiss = Math.max(0, Math.round(expected * (final ? 0.45 : 0.55)) - state.inventory);
  return <div className="text-center"><div className={`mx-auto flex max-w-md items-end justify-center gap-2 text-4xl ${reducedMotion ? '' : 'animate-[bounce_1.2s_ease-in-out_infinite]'}`}><span>🧒</span><span>🥤</span><span>🪙</span><span>👧</span></div><h2 className="mt-3 text-2xl font-black text-[#174835]">{final ? 'نكمل البيع بعد قرارك' : 'الزبائن بدأوا يصلون!'}</h2><p className="mx-auto mt-2 max-w-lg leading-7 text-slate-600">نتوقع نحو {expected} زبائن اليوم. في هذه الجولة سيبيع مشروعك {projected} {projected === 1 ? 'كوباً' : 'أكواباً'}{willMiss ? '، وقد يغادر بعض الزبائن إذا نفد العصير.' : '.'}</p><div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-[#174835]">المبيعات حتى الآن: {current} كوب · المال لا يتغير إلا عند إتمام البيع</div><button onClick={onContinue} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">{final ? 'أتمّ البيع وشاهد النتيجة' : 'شاهد البيع'}</button></div>;
}
function Decision<T extends string | number>({ title, hint, options, onChoose }: { title: string; hint: string; options: { value: T; title: string; detail: string; disabled?: boolean }[]; onChoose: (value: T) => void }) { return <div><h2 className="text-center text-xl font-black text-[#174835]">{title}</h2><p className="mt-2 text-center text-sm text-slate-500">{hint}</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={String(option.value)} disabled={option.disabled} onClick={() => onChoose(option.value)} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 text-right transition hover:border-[#117a58] hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><p className="font-black text-[#174835]">{option.title}</p><p className="mt-1 text-sm text-[#117a58]">{option.detail}</p></button>)}</div></div>; }
function Summary({ state, onContinue }: { state: JuiceStandState; onContinue: () => void }) { const day = state.history.at(-1)!; return <div className="text-center"><span className="text-4xl">{day.sold >= 5 ? '🎉' : '🌿'}</span><h2 className="mt-2 text-2xl font-black text-[#174835]">انتهى اليوم {day.day}</h2><div className="mt-5 grid grid-cols-4 gap-2 text-sm"><Stat icon="🥤" label="المباع" value={day.sold} /><Stat icon="🪙" label="المبيعات" value={riyals(day.revenue)} /><Stat icon="🧾" label="التكلفة" value={riyals(day.expenses)} /><Stat icon="📈" label="الربح" value={day.profit >= 0 ? riyals(day.profit) : `-${riyals(Math.abs(day.profit))}`} /></div><div className="mt-5 rounded-2xl bg-amber-50 p-4 text-right text-amber-900"><p className="font-black">كيف حدث ذلك؟</p><p className="mt-1 leading-7">دفعت {riyals(day.expenses)} لتجهيز العصير، وحصلت على {riyals(day.revenue)} من المبيعات، لذلك كان ربح اليوم {day.profit >= 0 ? riyals(day.profit) : `خسارة ${riyals(Math.abs(day.profit))}`}.</p></div><p className="mt-4 text-slate-600">{day.missedSales ? 'نفد العصير، وما زال هناك زبائن ينتظرون.' : day.waste ? 'بقيت أكواب لم تُبع اليوم، فأصبحت هدراً.' : 'استخدمت كل ما جهزته اليوم.'}</p><button onClick={onContinue} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">{state.day === 3 ? 'شاهد النتيجة' : 'ابدأ اليوم التالي'}</button></div>; }
function Final({ state, onRestart, onCelebrate }: { state: JuiceStandState; onRestart: () => void; onCelebrate: () => void }) { useEffect(() => { onCelebrate(); }, [onCelebrate]); return <div className="text-center"><span className="text-5xl">🏆</span><h1 className="mt-3 text-3xl font-black text-[#174835]">أكملت مشروعك!</h1><div className="mt-6 grid grid-cols-4 gap-2"><Stat icon="🪙" label="المال المتاح" value={riyals(state.cash)} /><Stat icon="🥤" label="المباع" value={state.sold} /><Stat icon="😊" label="السمعة" value={state.reputation} /><Stat icon="🗑️" label="الهدر" value={state.waste} /></div><div className="mt-6 rounded-2xl bg-amber-50 p-4 text-right"><p className="font-black text-amber-900">أهم ما تعلمته</p><p className="mt-1 leading-7 text-amber-800">{finalInsight(state)}</p></div><p className="mt-5 font-bold text-[#174835]">لو بدأت من جديد، ماذا ستغيّر؟</p><div className="mt-3 flex flex-wrap justify-center gap-2 text-sm"><span className="rounded-full bg-emerald-50 px-3 py-2">كمية العصير</span><span className="rounded-full bg-emerald-50 px-3 py-2">السعر</span><span className="rounded-full bg-emerald-50 px-3 py-2">التعامل مع الطقس</span></div><button onClick={onRestart} className="mt-5 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">أعد التجربة</button></div>; }
