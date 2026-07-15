"use client";

import { useMemo, useReducer } from "react";
import { createInitialRunState, runReducer } from "./run";
import type { RunState } from "./run";
import type { Critter, EventChoice, RestoredRun } from "./types";

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
      setRecruitChoices: setter("recruitChoices"),
      setBossRewardOpen: setter("bossRewardOpen"),
      setAdventureComplete: setter("adventureComplete"),
      setGameSpeed: setter("gameSpeed"),
      setEventBuffs: setter("eventBuffs"),
      setStarCharmCount: setter("starCharmCount"),
    };
  }, []);

  const actions = useMemo(() => ({
    restoreRun: (restored: RestoredRun) => dispatch({ type: "RESTORE_RUN", restored }),
    startRun: (starterId: string, mapSeed: number) => dispatch({ type: "START_RUN", starterId, mapSeed }),
    recruitRunGuardian: (critter: Critter) => dispatch({ type: "RECRUIT_GUARDIAN", critter }),
    gainRunBlessing: (choice: EventChoice, selectedName: string) => dispatch({ type: "GAIN_BLESSING", choice, selectedName }),
    finishRunWave: (boss: boolean, recruitChoices: Critter[] = []) => dispatch({ type: "FINISH_WAVE", boss, recruitChoices }),
    enterRunChapter: (chapter: number) => dispatch({ type: "ENTER_CHAPTER", chapter }),
    completeRun: () => dispatch({ type: "COMPLETE_ADVENTURE" }),
    resetRun: () => dispatch({ type: "RESET_RUN" }),
  }), []);

  return { state, setters, actions };
}
