import {beforeEach, describe, expect, test} from 'bun:test';

// Polyfill window & localStorage for test environment before loading state module
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.localStorage = mockLocalStorage as unknown as Storage;
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: globalThis.localStorage,
    location: {href: 'http://localhost:5173/vote', pathname: '/vote'},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
}

import {
  addSyntheticVotes,
  castVote,
  computeSummary,
  getDefaultState,
  loadState,
  resetVotes,
  saveState,
} from './state';
import type {PollState} from './types';

describe('Room Pulse - Poll State & Tallying Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Initial state is empty with 0 total votes and no leader', () => {
    const state = getDefaultState();
    const summary = computeSummary(state);

    expect(summary.totalVotes).toBe(0);
    expect(summary.hasVotes).toBe(false);
    expect(summary.leaderId).toBeNull();
    expect(summary.isTie).toBe(false);
    expect(summary.syntheticVotesCount).toBe(0);
    expect(summary.tally.every(t => t.count === 0 && t.percentage === 0)).toBe(
      true,
    );
  });

  test('Casting a vote updates tally, total votes, and percentage', () => {
    let state = getDefaultState();
    state = castVote(state, 'bike-repair');
    const summary = computeSummary(state);

    expect(summary.totalVotes).toBe(1);
    expect(summary.userVotesCount).toBe(1);
    expect(summary.hasVotes).toBe(true);
    expect(summary.leaderId).toBe('bike-repair');
    expect(summary.isTie).toBe(false);

    const bikeTally = summary.tally.find(t => t.optionId === 'bike-repair')!;
    expect(bikeTally.count).toBe(1);
    expect(bikeTally.percentage).toBe(100);
    expect(bikeTally.isLeader).toBe(true);
  });

  test('Single browser profile changing vote maintains 1 total vote', () => {
    let state = getDefaultState();
    state = castVote(state, 'food-truck');
    expect(computeSummary(state).totalVotes).toBe(1);

    // Same voter changes vote to home-services
    state = castVote(state, 'home-services');
    const summary = computeSummary(state);

    expect(summary.totalVotes).toBe(1);
    expect(summary.leaderId).toBe('home-services');
    expect(summary.tally.find(t => t.optionId === 'food-truck')!.count).toBe(0);
    expect(summary.tally.find(t => t.optionId === 'home-services')!.count).toBe(
      1,
    );
  });

  test('Synthetic demo votes add labeled synthetic votes deterministically', () => {
    let state = getDefaultState();
    state = addSyntheticVotes(state);
    const summary = computeSummary(state);

    expect(summary.totalVotes).toBe(10);
    expect(summary.syntheticVotesCount).toBe(10);
    expect(summary.userVotesCount).toBe(0);

    const bikeCount = summary.tally.find(
      t => t.optionId === 'bike-repair',
    )!.count;
    const foodCount = summary.tally.find(
      t => t.optionId === 'food-truck',
    )!.count;
    expect(bikeCount).toBe(3);
    expect(foodCount).toBe(4);
    expect(summary.leaderId).toBe('food-truck');
  });

  test('Tie condition correctly identifies multiple leading options without single leader', () => {
    const state: PollState = {
      votes: [
        {
          id: 'v1',
          optionId: 'bike-repair',
          timestamp: Date.now(),
          isSynthetic: true,
          voterId: 's1',
        },
        {
          id: 'v2',
          optionId: 'food-truck',
          timestamp: Date.now(),
          isSynthetic: true,
          voterId: 's2',
        },
      ],
      lastUpdated: Date.now(),
    };

    const summary = computeSummary(state);
    expect(summary.totalVotes).toBe(2);
    expect(summary.isTie).toBe(true);
    expect(summary.leaderId).toBeNull();
    expect(summary.tiedOptionIds).toEqual(['bike-repair', 'food-truck']);
    expect(summary.tally.filter(t => t.isLeader).length).toBe(0);
  });

  test('Resetting votes clears all votes back to initial state', () => {
    let state = getDefaultState();
    state = castVote(state, 'community-events');
    state = addSyntheticVotes(state);
    expect(computeSummary(state).totalVotes).toBeGreaterThan(0);

    const resetState = resetVotes();
    const summary = computeSummary(resetState);

    expect(summary.totalVotes).toBe(0);
    expect(summary.hasVotes).toBe(false);
    expect(summary.leaderId).toBeNull();
  });

  test('LocalStorage persistence roundtrip correctly restores state', () => {
    let state = getDefaultState();
    state = castVote(state, 'food-truck');
    saveState(state);

    const reloaded = loadState();
    expect(reloaded.votes.length).toBe(1);
    expect(reloaded.votes[0]!.optionId).toBe('food-truck');
  });
});
