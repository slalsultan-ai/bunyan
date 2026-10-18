'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  advance, affordableStock, availableEventChoices, chooseEvent, choosePrice, chooseStock,
  createJuiceStand, finalInsight, type EventChoice, type JuiceStandState, type Weather,
} from '@/lib/simulations/juice-stand';

const STORAGE_KEY = 'bunyan:simulation:juice-stand:v1';
const backgrounds: Record<Weather, string> = {
  sunny: '/assets/simulations/juice-stand/backgrounds/park_day1_sunny.png',
  rain: '/assets/simulations/juice-stand/backgrounds/park_day2_rain.png',
  festival: '/assets/simulations/juice-stand/backgrounds/park_day3_festival.png',
};
const weatherLabel: Record<Weather, string> = { sunny: 'مشمس', rain: 'ممطر', festival: 'يوم فعالية' };
const eventCopy: Record<EventChoice, { title: string; text: string }> = {
  restock: { title: 'حضّر كوبين إضافيين', text: 'تكلفة 4 قطع. ستلحق بالزبائن القادمين.' },
  hold: { title: 'أكمل بما لديك', text: 'لا تكلفة إضافية. راقب ما يحدث.' },
  umbrella: { title: 'ضع مظلة للعربة', text: 'تكلفة 3 قطع. تحمي البيع من المطر.' },
  discount: { title: 'خفّض السعر قطعة واحدة', text: 'قد يجذب مزيداً من الزبائن.' },
  extra_stock: { title: 'حضّر كوبين للفعالية', text: 'تكلفة 4 قطع. الحديقة مزدحمة اليوم.' },
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

  useEffect(() => { setState(loadState()); setReady(true); }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);

  const update = (next: JuiceStandState) => setState(next);
  const weather = state.day === 1 ? 'sunny' : state.day === 2 ? 'rain' : 'festival';
  const cart = state.umbrella ? 'cart_umbrella.png' : state.inventory <= 2 ? 'cart_nearly_empty.png' : 'cart_full.png';
  const restart = () => { window.localStorage.removeItem(STORAGE_KEY); setState(createJuiceStand()); };

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#fff7e6] font-bold text-[#174835]">نجهّز الحديقة...</main>;

  return (
    <main className="min-h-screen bg-[#fff7e6] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/15">
        <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
          <Link href="/simulations" className="text-sm font-bold text-slate-500">خروج</Link>
          <div className="text-center"><p className="font-black text-[#174835]">عربة العصير</p><p className="text-xs text-slate-500">اليوم {state.day} من 3 · {weatherLabel[weather]}</p></div>
          <button onClick={restart} className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">إعادة</button>
        </header>

        <section className="relative min-h-[300px] overflow-hidden bg-cover bg-center p-4 sm:min-h-[390px] sm:p-6" style={{ backgroundImage: `url(${backgrounds[weather]})` }}>
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative z-10 grid grid-cols-4 gap-2 sm:max-w-md">
            <Stat icon="🪙" label="النقود" value={state.cash} />
            <Stat icon="🥤" label="الأكواب" value={state.inventory} />
            <Stat icon="😊" label="الرضا" value={state.reputation >= 2 ? 'عالٍ' : state.reputation < 0 ? 'يحتاج تحسن' : 'جيد'} />
            <Stat icon="🗑️" label="الهدر" value={state.waste} />
          </div>
          {state.stage !== 'complete' && <>
            <img src={`/assets/simulations/juice-stand/sprites_png/${cart}`} alt="عربة العصير" className="absolute bottom-0 right-[10%] h-[52%] max-w-[55%] object-contain drop-shadow-xl sm:right-[18%]" />
            <img src="/assets/simulations/juice-stand/sprites_png/customer_boy_blue.png" alt="زبون ينتظر" className="absolute bottom-0 left-[8%] h-[38%] animate-[pulse_2.5s_ease-in-out_infinite] object-contain sm:left-[17%]" />
            <img src="/assets/simulations/juice-stand/sprites_png/customer_girl_pink.png" alt="زبونة تنتظر" className="absolute bottom-0 left-[29%] hidden h-[31%] object-contain sm:block" />
          </>}
        </section>

        <section className="mx-auto -mt-4 max-w-3xl px-4 pb-7 sm:-mt-8 sm:px-6 sm:pb-10">
          <div className="relative rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-xl sm:p-7">
            {state.stage === 'intro' && <Intro onStart={() => update(advance(state))} />}
            {state.stage === 'stock' && <Stock state={state} onChoose={(cups) => update(chooseStock(state, cups))} />}
            {state.stage === 'price' && <Price onChoose={(price) => update(choosePrice(state, price))} />}
            {state.stage === 'event' && <Event state={state} onChoose={(choice) => update(chooseEvent(state, choice))} />}
            {state.stage === 'summary' && <Summary state={state} onContinue={() => update(advance(state))} />}
            {state.stage === 'complete' && <Final state={state} onRestart={restart} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) { return <div className="text-center"><span className="text-5xl">🍊</span><h1 className="mt-3 text-2xl font-black text-[#174835]">مشروعك يبدأ الآن!</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">لديك 24 قطعة. حضّر عصيراً، اختر سعراً، ثم راقب زبائن الحديقة لثلاثة أيام.</p><button onClick={onStart} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">افتح العربة</button></div>; }
function Stock({ state, onChoose }: { state: JuiceStandState; onChoose: (cups: number) => void }) { return <Decision title="كم كوباً تريد أن تحضّر؟" hint="تجهيز كل كوب يكلف قطعتين." options={[4, 6, 8].map((cups) => ({ value: cups, title: `${cups} أكواب`, detail: `${cups * 2} قطع`, disabled: !affordableStock(state).includes(cups) }))} onChoose={onChoose} />; }
function Price({ onChoose }: { onChoose: (price: number) => void }) { return <Decision title="بكم ستبيع الكوب؟" hint="السعر الأقل قد يجذب زبائن أكثر، والسعر الأعلى يزيد ربح كل كوب." options={[3, 4, 5].map((price) => ({ value: price, title: `${price} قطع`, detail: price === 3 ? 'سعر لطيف' : price === 4 ? 'سعر متوازن' : 'ربح أكبر' }))} onChoose={onChoose} />; }
function Event({ state, onChoose }: { state: JuiceStandState; onChoose: (choice: EventChoice) => void }) { const title = state.day === 1 ? 'هناك زبائن قادمون، ماذا تفعل؟' : state.day === 2 ? 'المطر يغيّر حركة الحديقة.' : 'بدأت الفعالية والحديقة ازدحمت!'; return <Decision title={title} hint="قرارك سيغير ما يحدث في بقية اليوم." options={availableEventChoices(state).map((choice) => ({ value: choice, title: eventCopy[choice].title, detail: eventCopy[choice].text }))} onChoose={onChoose} />; }
function Decision<T extends string | number>({ title, hint, options, onChoose }: { title: string; hint: string; options: { value: T; title: string; detail: string; disabled?: boolean }[]; onChoose: (value: T) => void }) { return <div><h2 className="text-center text-xl font-black text-[#174835]">{title}</h2><p className="mt-2 text-center text-sm text-slate-500">{hint}</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={String(option.value)} disabled={option.disabled} onClick={() => onChoose(option.value)} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 text-right transition hover:border-[#117a58] hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><p className="font-black text-[#174835]">{option.title}</p><p className="mt-1 text-sm text-[#117a58]">{option.detail}</p></button>)}</div></div>; }
function Summary({ state, onContinue }: { state: JuiceStandState; onContinue: () => void }) { const day = state.history.at(-1)!; return <div className="text-center"><span className="text-4xl">{day.sold >= 5 ? '🎉' : '🌿'}</span><h2 className="mt-2 text-2xl font-black text-[#174835]">انتهى اليوم {day.day}</h2><div className="mt-5 grid grid-cols-4 gap-2 text-sm"><Stat icon="🥤" label="بعت" value={day.sold} /><Stat icon="🪙" label="دخل" value={day.revenue} /><Stat icon="🗑️" label="هدر" value={day.waste} /><Stat icon="👋" label="فاتهم" value={day.missedSales} /></div><p className="mt-5 text-slate-600">{day.missedSales ? 'نفد العصير قبل أن يشتري بعض الزبائن.' : day.waste ? 'بقيت أكواب لم تُبع اليوم.' : 'استخدمت كل ما حضّرته اليوم.'}</p><button onClick={onContinue} className="mt-6 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">{state.day === 3 ? 'شاهد النتيجة' : 'ابدأ اليوم التالي'}</button></div>; }
function Final({ state, onRestart }: { state: JuiceStandState; onRestart: () => void }) { return <div className="text-center"><span className="text-5xl">🏆</span><h1 className="mt-3 text-3xl font-black text-[#174835]">أكملت مشروعك!</h1><div className="mt-6 grid grid-cols-4 gap-2"><Stat icon="🪙" label="النقود" value={state.cash} /><Stat icon="🥤" label="المباع" value={state.sold} /><Stat icon="😊" label="السمعة" value={state.reputation} /><Stat icon="🗑️" label="الهدر" value={state.waste} /></div><div className="mt-6 rounded-2xl bg-amber-50 p-4 text-right"><p className="font-black text-amber-900">أهم ما تعلمته</p><p className="mt-1 leading-7 text-amber-800">{finalInsight(state)}</p></div><p className="mt-5 font-bold text-[#174835]">لو بدأت من جديد، ما القرار الذي ستغيّره؟</p><button onClick={onRestart} className="mt-5 rounded-2xl bg-[#117a58] px-7 py-3 font-black text-white">أعد التجربة</button></div>; }
