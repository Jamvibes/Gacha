import { emptyBlessings } from "./blessings.ts";
import { formatEventText } from "./events.ts";
import { starterStartingCopies, starterStartingLives } from "./starter-bonuses.ts";
import type { EventChoiceDefinition } from "./events.ts";
import type { BlessingCounts, Critter, RestoredRun, Tower } from "./types.ts";

export type RunState = {
  dewshards: number;
  lives: number;
  wave: number;
  chapter: number;
  mapSeed: number;
  mapVersion: 1 | 2;
  towers: Tower[];
  selected: string;
  starterId: string | null;
  eventOpen: boolean;
  nextWaveNote: string;
  runUnlocked: string[];
  guardianCopies: Record<string, number>;
  recruitChoices: Critter[];
  bossRewardOpen: boolean;
  adventureComplete: boolean;
  gameSpeed: 1 | 2;
  blessings: BlessingCounts;
  activeEventId: string | null;
  recentEventIds: string[];
  starCharmCount: number;
};

export const createInitialRunState = (): RunState => ({
  dewshards: 0,
  lives: 10,
  wave: 0,
  chapter: 1,
  mapSeed: 0,
  mapVersion: 2,
  towers: [],
  selected: "emberfox",
  starterId: null,
  eventOpen: false,
  nextWaveNote: "No special conditions",
  runUnlocked: [],
  guardianCopies: {},
  recruitChoices: [],
  bossRewardOpen: false,
  adventureComplete: false,
  gameSpeed: 1,
  blessings: emptyBlessings(),
  activeEventId: null,
  recentEventIds: [],
  starCharmCount: 0,
});

export type RunAction =
  | { type: "SET_FIELD"; field: keyof RunState; value: unknown }
  | { type: "RESTORE_RUN"; restored: RestoredRun }
  | { type: "START_RUN"; starterId: string; mapSeed: number }
  | { type: "RECRUIT_GUARDIAN"; critter: Critter }
  | { type: "RESOLVE_EVENT"; choice: EventChoiceDefinition; selectedName: string }
  | { type: "FINISH_WAVE"; boss: boolean; recruitChoices: Critter[]; eventId: string | null }
  | { type: "ENTER_CHAPTER"; chapter: number }
  | { type: "COMPLETE_ADVENTURE" }
  | { type: "RESET_RUN" };

export function runReducer(state: RunState, action: RunAction): RunState {
  if (action.type === "SET_FIELD") {
    const current = state[action.field];
    const value = typeof action.value === "function" ? (action.value as (value: typeof current) => typeof current)(current) : action.value;
    return { ...state, [action.field]: value };
  }

  if (action.type === "RESTORE_RUN") {
    const restored = action.restored;
    return {
      ...createInitialRunState(),
      dewshards: restored.dewshards,
      lives: restored.lives,
      wave: restored.wave,
      chapter: restored.chapter,
      mapSeed: restored.mapSeed,
      mapVersion: restored.mapVersion,
      towers: restored.towers,
      selected: restored.selected,
      starterId: restored.starterId,
      eventOpen: restored.eventOpen,
      nextWaveNote: restored.nextWaveNote,
      runUnlocked: restored.runUnlocked,
      guardianCopies: restored.guardianCopies,
      recruitChoices: restored.recruitChoices,
      bossRewardOpen: restored.bossRewardOpen,
      gameSpeed: restored.gameSpeed,
      blessings: restored.blessings,
      activeEventId: restored.activeEventId,
      recentEventIds: restored.recentEventIds,
      starCharmCount: restored.starCharmCount,
    };
  }

  if (action.type === "START_RUN") {
    return {
      ...createInitialRunState(),
      starterId: action.starterId,
      selected: action.starterId,
      mapSeed: action.mapSeed,
      lives: starterStartingLives(action.starterId),
      runUnlocked: [action.starterId],
      guardianCopies: { [action.starterId]: starterStartingCopies(action.starterId) },
    };
  }

  if (action.type === "RECRUIT_GUARDIAN") {
    const id = action.critter.id;
    return {
      ...state,
      runUnlocked: state.runUnlocked.includes(id) ? state.runUnlocked : [...state.runUnlocked, id],
      guardianCopies: { ...state.guardianCopies, [id]: (state.guardianCopies[id] || 0) + 1 },
      selected: id,
      recruitChoices: [],
      nextWaveNote: `${action.critter.name} granted an extra guardian copy`,
    };
  }

  if (action.type === "RESOLVE_EVENT") {
    const recentEventIds = state.activeEventId ? [...state.recentEventIds, state.activeEventId].slice(-3) : state.recentEventIds;
    let next = { ...state, eventOpen: false, activeEventId: null, recentEventIds };
    for (const effect of action.choice.effects) {
      if (effect.type === "dewshards") next = { ...next, dewshards: next.dewshards + effect.amount };
      if (effect.type === "guardianCopy") next = { ...next, guardianCopies: { ...next.guardianCopies, [next.selected]: (next.guardianCopies[next.selected] || 0) + effect.amount } };
      if (effect.type === "heal") next = { ...next, lives: Math.min(20, next.lives + effect.amount) };
      if (effect.type === "blessing") next = { ...next, blessings: { ...next.blessings, [effect.blessingId]: next.blessings[effect.blessingId] + effect.amount } };
      if (effect.type === "nextWave") next = { ...next, nextWaveNote: formatEventText(effect.note, action.selectedName) };
    }
    return next;
  }

  if (action.type === "FINISH_WAVE") {
    if (action.boss) return { ...state, bossRewardOpen: true, eventOpen: false, activeEventId: null, recruitChoices: [] };
    if (action.recruitChoices.length) return { ...state, bossRewardOpen: false, eventOpen: false, activeEventId: null, recruitChoices: action.recruitChoices };
    return { ...state, bossRewardOpen: false, eventOpen: Boolean(action.eventId), activeEventId: action.eventId, recruitChoices: [] };
  }

  if (action.type === "ENTER_CHAPTER") {
    return {
      ...state,
      chapter: action.chapter,
      wave: 0,
      towers: [],
      eventOpen: false,
      activeEventId: null,
      recruitChoices: [],
      bossRewardOpen: false,
      nextWaveNote: "A new region awaits",
    };
  }

  if (action.type === "COMPLETE_ADVENTURE") return { ...state, bossRewardOpen: false, eventOpen: false, activeEventId: null, adventureComplete: true };
  return createInitialRunState();
}
