"use client";

import { useMemo, useReducer } from "react";
import { createInitialRunState, runReducer } from "./run";
import type { RunState } from "./run";
import type { EventChoiceDefinition } from "./events";
import type { Critter, GameMode, RestoredRun } from "./types";

export function useRunState() {
  const [state, dispatch] = useReducer(runReducer, undefined, createInitialRunState);

  const setters = useMemo(() => {
    const setter = <Key extends keyof RunState>(field: Key) => (value: RunState[Key] | ((current: RunState[Key]) => RunState[Key])) => dispatch({ type: "SET_FIELD", field, value });
    return {
      setDewshards: setter("dewshards"),
      setLives: setter("lives"),
      setWave: setter("wave"),
      setChapter: setter("chapter"),
      setMapSeed: setter("mapSeed"),
      setMapVersion: setter("mapVersion"),
      setTowers: setter("towers"),
      setSelected: setter("selected"),
      setStarterId: setter("starterId"),
      setEventOpen: setter("eventOpen"),
      setNextWaveNote: setter("nextWaveNote"),
      setRunUnlocked: setter("runUnlocked"),
      setGuardianCopies: setter("guardianCopies"),
      setGuardianForms: setter("guardianForms"),
      setRecruitChoices: setter("recruitChoices"),
      setBossRewardOpen: setter("bossRewardOpen"),
      setAdventureComplete: setter("adventureComplete"),
      setGameSpeed: setter("gameSpeed"),
      setBlessings: setter("blessings"),
      setStarCharmCount: setter("starCharmCount"),
    };
  }, []);

  const actions = useMemo(() => ({
    restoreRun: (restored: RestoredRun) => dispatch({ type: "RESTORE_RUN", restored }),
    startRun: (starterId: string, mapSeed: number, gameMode: GameMode) => dispatch({ type: "START_RUN", starterId, mapSeed, gameMode }),
    recruitRunGuardian: (critter: Critter) => dispatch({ type: "RECRUIT_GUARDIAN", critter }),
    evolveRunGuardian: (slot: number, evolution: Critter) => dispatch({ type: "EVOLVE_GUARDIAN", slot, evolution }),
    grantRosterCopies: () => dispatch({ type: "GRANT_ROSTER_COPIES" }),
    resolveRunEvent: (choice: EventChoiceDefinition, selectedName: string, rewardGuardianId?: string) => dispatch({ type: "RESOLVE_EVENT", choice, selectedName, rewardGuardianId }),
    finishRunWave: (boss: boolean, recruitChoices: Critter[] = [], eventId: string | null = null) => dispatch({ type: "FINISH_WAVE", boss, recruitChoices, eventId }),
    enterRunChapter: (chapter: number) => dispatch({ type: "ENTER_CHAPTER", chapter }),
    enterEndlessRegion: (chapter: number) => dispatch({ type: "ENTER_ENDLESS_REGION", chapter }),
    completeRun: () => dispatch({ type: "COMPLETE_ADVENTURE" }),
    resetRun: () => dispatch({ type: "RESET_RUN" }),
  }), []);

  return { state, setters, actions };
}
