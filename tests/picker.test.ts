import { describe, expect, it } from 'vitest';
import { draw, emptyBag, reconcile, type BagState } from '../lib/picker';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i}`);

function drawMany(all: string[], count: number, state: BagState = emptyBag()) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = draw(state, all)!;
    out.push(r.id);
    state = r.state;
  }
  return { out, state };
}

describe('draw', () => {
  it('returns null on an empty catalog', () => {
    expect(draw(emptyBag(), [])).toBeNull();
  });

  it('plays every episode once before any repeat', () => {
    const all = ids(50);
    for (let run = 0; run < 20; run++) {
      const { out } = drawMany(all, 150);
      for (let cycle = 0; cycle < 3; cycle++) {
        expect(new Set(out.slice(cycle * 50, cycle * 50 + 50)).size).toBe(50);
      }
    }
  });

  it('never repeats the same episode twice in a row across cycles', () => {
    const all = ids(3);
    for (let run = 0; run < 200; run++) {
      const { out } = drawMany(all, 30);
      for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
    }
  });

  it('works with a single episode', () => {
    expect(drawMany(['only'], 3).out).toEqual(['only', 'only', 'only']);
  });
});

describe('reconcile', () => {
  it('drops removed episodes and adds new ones to the current cycle', () => {
    const state: BagState = { remaining: ['a', 'b'], seen: ['c', 'gone'] };
    const next = reconcile(state, ['a', 'b', 'c', 'new']);
    expect(next.seen).toEqual(['c']);
    expect([...next.remaining].sort()).toEqual(['a', 'b', 'new']);
  });

  it('does not replay already seen episodes after a sync', () => {
    let { state } = drawMany(ids(10), 5);
    const seen = [...state.seen];
    const all = [...ids(10), 'x', 'y'];
    const { out } = drawMany(all, 7, state);
    expect(out.some((id) => seen.includes(id))).toBe(false);
    expect(new Set(out).size).toBe(7);
  });
});
