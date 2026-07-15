import type { BlessingCounts, Critter, EventChoice, RestoredRun, Tower } from "./types.ts";

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
  eventBuffs: BlessingCounts;
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
  eventBuffs: { harvest: 0, spring: 0, warden: 0 },
  starCharmCount: 0,
});

export type RunAction =
  | { type: "SET_FIELD"; field: keyof RunState; value: unknown }
  | { type: "RESTORE_RUN"; restored: RestoredRun }
  | { type: "START_RUN"; starterId: string; mapSeed: number }
  | { type: "RECRUIT_GUARDIAN"; critter: Critter }
  | { type: "GAIN_BLESSING"; choice: EventChoice; selectedName: string }
  | { type: "FINISH_WAVE"; boss: boolean; recruitChoices: Critter[] }
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
      eventBuffs: restored.eventBuffs,
      starCharmCount: restored.starCharmCount,
    };
  }

  if (action.type === "START_RUN") {
    return {
      ...createInitialRunState(),
      starterId: action.starterId,
      selected: action.starterId,
      mapSeed: action.mapSeed,
      lives: action.starterId === "bubblefin" ? 13 : 10,
      runUnlocked: [action.starterId],
      guardianCopies: { [action.starterId]: action.starterId === "emberfox" ? 2 : 1 },
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

  if (action.type === "GAIN_BLESSING") {
    const eventBuffs = { ...state.eventBuffs, [action.choice]: state.eventBuffs[action.choice] + 1 };
    if (action.choice === "harvest") {
      return { ...state, dewshards: state.dewshards + 2, eventBuffs, eventOpen: false, nextWaveNote: "Gloomblessing: enemies have 35% more health • +25 clear reward" };
    }
    if (action.choice === "spring") {
      return {
        ...state,
        dewshards: state.dewshards + 1,
        guardianCopies: { ...state.guardianCopies, [state.selected]: (state.guardianCopies[state.selected] || 0) + 1 },
        eventBuffs,
        eventOpen: false,
        nextWaveNote: `${action.selectedName}'s echo: +1 placeable copy • normal enemy strength`,
      };
    }
    return {
      ...state,
      lives: Math.min(20, state.lives + 2),
      dewshards: state.dewshards + 1,
      eventBuffs,
      eventOpen: false,
      nextWaveNote: "Root pact: +2 Heart Tree health • 3 extra enemies • +20 clear reward",
    };
  }

  if (action.type === "FINISH_WAVE") {
    if (action.boss) return { ...state, bossRewardOpen: true, eventOpen: false, recruitChoices: [] };
    if (action.recruitChoices.length) return { ...state, bossRewardOpen: false, eventOpen: false, recruitChoices: action.recruitChoices };
    return { ...state, bossRewardOpen: false, eventOpen: true, recruitChoices: [] };
  }

  if (action.type === "ENTER_CHAPTER") {
    return {
      ...state,
      chapter: action.chapter,
      wave: 0,
      towers: [],
      eventOpen: false,
      recruitChoices: [],
      bossRewardOpen: false,
      nextWaveNote: "A new region awaits",
    };
  }

  if (action.type === "COMPLETE_ADVENTURE") return { ...state, bossRewardOpen: false, adventureComplete: true };
  return createInitialRunState();
}
