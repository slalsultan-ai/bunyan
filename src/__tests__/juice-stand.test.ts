import { describe, expect, it } from 'vitest';
import { advance, chooseEvent, choosePrice, chooseStock, createJuiceStand, type JuiceStandState } from '@/lib/simulations/juice-stand';

function runDay(stock: number, price: number, event: 'restock' | 'hold' | 'umbrella' | 'discount' | 'extra_stock') {
  let state = advance(createJuiceStand());
  state = chooseStock(state, stock);
  state = choosePrice(state, price);
  return chooseEvent(state, event);
}

describe('juice stand simulation', () => {
  it('is deterministic for the same decisions', () => {
    expect(runDay(6, 4, 'hold')).toEqual(runDay(6, 4, 'hold'));
  });

  it('charges production and prevents unaffordable stock', () => {
    const state = chooseStock({ ...advance(createJuiceStand()), cash: 7 }, 4);
    expect(state.cash).toBe(7);
    expect(state.inventory).toBe(0);
  });

  it('makes price change demand and never sells past inventory', () => {
    expect(runDay(8, 3, 'hold').sold).toBeGreaterThan(runDay(8, 5, 'hold').sold);
    expect(runDay(4, 3, 'hold').sold).toBeLessThanOrEqual(4);
  });

  it('carries cash and reputation into the next day', () => {
    const afterDayOne = runDay(6, 4, 'hold');
    const dayTwo = advance(afterDayOne);
    expect(dayTwo.day).toBe(2);
    expect(dayTwo.cash).toBe(afterDayOne.cash);
    expect(dayTwo.reputation).toBe(afterDayOne.reputation);
  });

  it('allows a low-cash project to complete all days', () => {
    let state: JuiceStandState = { ...createJuiceStand(), cash: 0, stage: 'summary' };
    state = advance(state);
    state = { ...state, stage: 'summary' };
    state = advance(state);
    state = { ...state, stage: 'summary' };
    expect(advance(state).stage).toBe('complete');
  });
});
