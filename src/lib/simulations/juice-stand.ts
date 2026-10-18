export type Weather = 'sunny' | 'rain' | 'festival';
export type Stage = 'intro' | 'stock' | 'price' | 'selling_first' | 'event' | 'selling_second' | 'summary' | 'complete';
export type EventChoice = 'restock' | 'hold' | 'umbrella' | 'discount' | 'extra_stock';

export interface DayResult {
  day: number;
  weather: Weather;
  produced: number;
  sold: number;
  missedSales: number;
  waste: number;
  revenue: number;
  expenses: number;
  profit: number;
  price: number;
  priceLostDemand: number;
  event: EventChoice | null;
}

export interface JuiceStandState {
  day: 1 | 2 | 3;
  stage: Stage;
  cash: number;
  inventory: number;
  price: number;
  reputation: number;
  waste: number;
  sold: number;
  salesRevenue: number;
  productionCost: number;
  extraExpenses: number;
  unserved: number;
  umbrella: boolean;
  currentProduced: number;
  currentExpenses: number;
  currentSold: number;
  currentMissedSales: number;
  currentRevenue: number;
  currentPriceLostDemand: number;
  event: EventChoice | null;
  history: DayResult[];
}

const COST_PER_CUP = 2;
const weatherForDay = (day: number): Weather => day === 1 ? 'sunny' : day === 2 ? 'rain' : 'festival';

export function createJuiceStand(): JuiceStandState {
  return {
    day: 1, stage: 'intro', cash: 24, inventory: 0, price: 4, reputation: 1,
    waste: 0, sold: 0, salesRevenue: 0, productionCost: 0, extraExpenses: 0, unserved: 0, umbrella: false, currentProduced: 0, currentExpenses: 0,
    currentSold: 0, currentMissedSales: 0, currentRevenue: 0, currentPriceLostDemand: 0, event: null, history: [],
  };
}

export function affordableStock(state: JuiceStandState): number[] {
  const standard = [4, 6, 8].filter((cups) => cups * COST_PER_CUP <= state.cash);
  return standard.length ? standard : state.cash >= 4 ? [2] : [0];
}

export function chooseStock(state: JuiceStandState, cups: number): JuiceStandState {
  if (state.stage !== 'stock' || !affordableStock(state).includes(cups)) return state;
  const cost = cups * COST_PER_CUP;
  return { ...state, cash: state.cash - cost, inventory: state.inventory + cups, productionCost: state.productionCost + cost, currentProduced: cups, currentExpenses: cost, stage: 'price' };
}

export function choosePrice(state: JuiceStandState, price: number): JuiceStandState {
  if (state.stage !== 'price' || ![3, 4, 5].includes(price)) return state;
  return { ...state, price, stage: 'selling_first' };
}

export function expectedDemand(state: JuiceStandState): number {
  return demandForSegment(state, 1);
}

function priceModifier(price: number) { return price === 2 ? 2 : price === 3 ? 1 : price === 5 ? -1 : 0; }
function demandForSegment(state: JuiceStandState, segment: 1 | 2) {
  const base = [[3, 4], [2, 2], [5, 6]][state.day - 1][segment - 1];
  const reputationModifier = state.reputation === 0 ? -1 : state.reputation === 2 ? 1 : 0;
  const umbrellaModifier = state.day === 2 && segment === 2 && state.umbrella ? 2 : 0;
  return Math.max(0, base + priceModifier(state.price) + reputationModifier + umbrellaModifier);
}

export function resolveSales(state: JuiceStandState, portion: number, nextStage: Stage): JuiceStandState {
  const segment = portion >= 0.5 ? 1 : 2;
  const demand = demandForSegment(state, segment);
  const demandAtPrice3 = Math.max(0, demand - priceModifier(state.price) + 1);
  const sold = Math.min(state.inventory, demand);
  const missedSales = Math.max(0, demand - sold);
  return {
    ...state,
    cash: state.cash + sold * state.price,
    inventory: state.inventory - sold,
    sold: state.sold + sold,
    salesRevenue: state.salesRevenue + sold * state.price,
    unserved: state.unserved + missedSales,
    currentSold: state.currentSold + sold,
    currentMissedSales: state.currentMissedSales + missedSales,
    currentRevenue: state.currentRevenue + sold * state.price,
    currentPriceLostDemand: state.currentPriceLostDemand + Math.max(0, demandAtPrice3 - demand),
    stage: nextStage,
  };
}

export function availableEventChoices(state: JuiceStandState): EventChoice[] {
  if (state.day === 1) return state.cash >= 4 ? ['restock', 'hold'] : ['hold'];
  if (state.day === 2) return !state.umbrella && state.cash >= 5 ? ['umbrella', 'hold'] : ['hold'];
  return ['discount', 'hold'];
}

export function chooseEvent(state: JuiceStandState, choice: EventChoice): JuiceStandState {
  if (state.stage !== 'event' || !availableEventChoices(state).includes(choice)) return state;
  let next = { ...state, event: choice };
  if (choice === 'restock') next = { ...next, cash: next.cash - 4, inventory: next.inventory + 2, currentProduced: next.currentProduced + 2, currentExpenses: next.currentExpenses + 4 };
  if (choice === 'umbrella') next = { ...next, cash: next.cash - 5, umbrella: true, extraExpenses: next.extraExpenses + 5, currentExpenses: next.currentExpenses + 5 };
  if (choice === 'discount') next = { ...next, price: Math.max(2, next.price - 1) };
  if (choice === 'extra_stock') next = { ...next, cash: next.cash - 4, inventory: next.inventory + 2, currentProduced: next.currentProduced + 2, currentExpenses: next.currentExpenses + 4 };
  return { ...next, stage: 'selling_second' };
}

function finishDay(state: JuiceStandState): JuiceStandState {
  const waste = state.inventory;
  const reputationDelta = state.currentMissedSales >= 3 ? -1 : state.currentSold >= 3 && state.currentMissedSales === 0 ? 1 : 0;
  const result: DayResult = {
    day: state.day, weather: weatherForDay(state.day), produced: state.currentProduced,
    sold: state.currentSold, missedSales: state.currentMissedSales, waste,
    revenue: state.currentRevenue, expenses: state.currentExpenses,
    profit: state.currentRevenue - state.currentExpenses, price: state.price, priceLostDemand: state.currentPriceLostDemand, event: state.event,
  };
  return { ...state, inventory: 0, waste: state.waste + waste, reputation: Math.max(0, Math.min(2, state.reputation + reputationDelta)), history: [...state.history, result] };
}

export function advance(state: JuiceStandState): JuiceStandState {
  if (state.stage === 'intro') return { ...state, stage: 'stock' };
  if (state.stage === 'selling_first') return resolveSales(state, 0.55, 'event');
  if (state.stage === 'selling_second') return finishDay(resolveSales(state, 0.45, 'summary'));
  if (state.stage !== 'summary') return state;
  if (state.day === 3) return { ...state, stage: 'complete' };
  return { ...state, day: (state.day + 1) as 1 | 2 | 3, stage: 'stock', currentProduced: 0, currentExpenses: 0, currentSold: 0, currentMissedSales: 0, currentRevenue: 0, currentPriceLostDemand: 0, event: null };
}

export function finalInsight(state: JuiceStandState): string {
  if (state.waste >= 5) return 'حضّرت كمية كبيرة، فبقيت أكواب لم تُبع. جرّب كمية أقرب للطلب.';
  if (state.reputation >= 2) return 'رضا الزبائن ساعد مشروعك في اليوم الأخير.';
  if (state.cash < 24) return 'واصلت المشروع حتى مع المال القليل. في المرة القادمة جرّب سعراً أو كمية مختلفة.';
  return 'وازنت بين الكمية والسعر، وكل يوم أعطاك معلومة جديدة.';
}
