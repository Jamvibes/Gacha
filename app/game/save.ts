import { BOARD_SIZE, CHAPTERS, CRITTERS, META_SAVE_KEY, RUN_SAVE_KEY, WAVES_PER_CHAPTER, emptyStarterStats, rootCritterId } from "./content.ts";
import { generateChapterPath } from "./map.ts";
import type { MetaProgress, RestoredRun, RunSave, StarterStats, Tower } from "./types.ts";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type RunSaveInput = Omit<RunSave, "version" | "savedAt">;

const nonNegativeNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
};

const positiveNumber = (value: unknown, fallback = 1) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0.1, number) : fallback;
};

const count = (value: unknown) => Math.floor(nonNegativeNumber(value));

function normalizeStats(value: unknown): Record<string, StarterStats> {
  const defaults = emptyStarterStats();
  if (!value || typeof value !== "object") return defaults;
  const saved = value as Record<string, Partial<StarterStats>>;
  return Object.fromEntries(Object.entries(defaults).map(([id, fallback]) => {
    const record = saved[id];
    return [id, record ? {
      runs: count(record.runs),
      victories: count(record.victories),
      bossesDefeated: count(record.bossesDefeated),
      wavesCleared: count(record.wavesCleared),
      highestChapter: Math.min(CHAPTERS.length, count(record.highestChapter)),
    } : fallback];
  }));
}

export function defaultMetaProgress(): MetaProgress {
  return { version: 1, owned: [], petals: 240, stats: emptyStarterStats() };
}

export function readMetaProgress(storage: StorageLike): MetaProgress {
  const raw = storage.getItem(META_SAVE_KEY);
  if (!raw) return defaultMetaProgress();
  try {
    const data = JSON.parse(raw) as Partial<MetaProgress>;
    const owned = Array.isArray(data.owned)
      ? Array.from(new Set(data.owned.filter((id): id is string => typeof id === "string" && CRITTERS.some(critter => critter.id === id))))
      : [];
    return {
      version: 1,
      owned,
      petals: nonNegativeNumber(data.petals, 240),
      stats: normalizeStats(data.stats),
    };
  } catch {
    return defaultMetaProgress();
  }
}

export function writeMetaProgress(storage: StorageLike, progress: Omit<MetaProgress, "version">) {
  storage.setItem(META_SAVE_KEY, JSON.stringify({ version: 1, ...progress } satisfies MetaProgress));
}

export function parseRunProgress(raw: string): RestoredRun | null {
  try {
    const data = JSON.parse(raw) as Partial<RunSave>;
    if (data.version !== 1 && data.version !== 2) return null;
    const starter = CRITTERS.find(critter => critter.id === data.starterId && critter.starterEligible);
    if (!starter) return null;

    const chapter = Math.min(CHAPTERS.length, Math.max(1, count(data.chapter) || 1));
    const mapSeed = count(data.mapSeed);
    const mapVersion: 1 | 2 = data.mapVersion === 2 ? 2 : 1;
    const bossRewardOpen = Boolean(data.bossRewardOpen);
    const wave = Math.min(bossRewardOpen ? WAVES_PER_CHAPTER : WAVES_PER_CHAPTER - 1, count(data.wave));
    const runUnlocked = Array.from(new Set([starter.id, ...(Array.isArray(data.runUnlocked) ? data.runUnlocked : [])]))
      .filter((id): id is string => typeof id === "string" && CRITTERS.some(critter => critter.id === id));
    const path = generateChapterPath(mapSeed, chapter, mapVersion);
    const savedTowers = Array.isArray(data.towers) ? data.towers : [];
    const towers = savedTowers.map(tower => {
      if (!tower || typeof tower !== "object") return null;
      const critter = CRITTERS.find(option => option.id === tower.critterId);
      const savedSlot = Number(tower.slot);
      if (!Number.isInteger(savedSlot) || savedSlot < 0) return null;
      const slot = data.version === 1 ? CHAPTERS[chapter - 1].slots[savedSlot] : savedSlot;
      const sourceId = typeof tower.sourceId === "string" && runUnlocked.includes(tower.sourceId) ? tower.sourceId : rootCritterId(String(tower.critterId));
      return critter && slot >= 0 && slot < BOARD_SIZE * BOARD_SIZE && !path.includes(slot) ? { slot, critter, cooldown: 0, sourceId } satisfies Tower : null;
    }).filter((tower): tower is Tower => tower !== null);
    const savedCopies = data.guardianCopies && typeof data.guardianCopies === "object" ? data.guardianCopies : {};
    const guardianCopies = runUnlocked.reduce<Record<string, number>>((copies, id) => {
      const placed = towers.filter(tower => tower.sourceId === id).length;
      copies[id] = Math.max(1, count(savedCopies[id]), placed);
      return copies;
    }, {});
    const eventBuffs = data.eventBuffs;

    return {
      starterId: starter.id,
      selected: typeof data.selected === "string" && runUnlocked.includes(data.selected) ? data.selected : starter.id,
      chapter,
      wave,
      mapSeed,
      mapVersion,
      lives: count(data.lives),
      dewshards: count(data.dewshards),
      towers,
      runUnlocked,
      guardianCopies,
      eventBuffs: {
        harvest: count(eventBuffs?.harvest),
        spring: count(eventBuffs?.spring),
        warden: count(eventBuffs?.warden),
      },
      starCharmCount: count(data.starCharmCount),
      nextWaveNote: typeof data.nextWaveNote === "string" && data.nextWaveNote ? data.nextWaveNote : "No special conditions",
      eventOpen: Boolean(data.eventOpen),
      recruitChoices: (Array.isArray(data.recruitChoices) ? data.recruitChoices : []).map(id => CRITTERS.find(critter => critter.id === id)).filter((critter): critter is NonNullable<typeof critter> => Boolean(critter)),
      bossRewardOpen,
      gameSpeed: data.gameSpeed === 2 ? 2 : 1,
      waveHpMultiplier: positiveNumber(data.waveHpMultiplier),
      waveExtraEnemies: count(data.waveExtraEnemies),
      wavePetalBonus: count(data.wavePetalBonus),
      runDamageMultiplier: positiveNumber(data.runDamageMultiplier),
    };
  } catch {
    return null;
  }
}

export function readRunProgress(storage: StorageLike): RestoredRun | null {
  const raw = storage.getItem(RUN_SAVE_KEY);
  if (!raw) return null;
  const restored = parseRunProgress(raw);
  if (!restored) storage.removeItem(RUN_SAVE_KEY);
  return restored;
}

export function writeRunProgress(storage: StorageLike, input: RunSaveInput, savedAt = Date.now()) {
  const save: RunSave = { ...input, version: 2, savedAt };
  storage.setItem(RUN_SAVE_KEY, JSON.stringify(save));
}

export function clearRunProgress(storage: StorageLike) {
  storage.removeItem(RUN_SAVE_KEY);
}
