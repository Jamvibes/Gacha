import { WAVES_PER_CHAPTER } from "./content.ts";
import { ENEMY_BY_ID, ENEMY_DEFINITIONS, enemyHealth, type EnemyDefinition, type EnemyId } from "./enemies.ts";

export type WavePlan = { chapter: number; wave: number; difficulty: number; enemyIds: EnemyId[]; budget: number };
export type WaveGroup = { definition: EnemyDefinition; count: number; hp: number; shield: number };

export function endlessDifficulty(wave: number) {
  const safeWave = Math.max(1, Math.floor(wave));
  return safeWave + Math.floor(safeWave / 10) * 2;
}

export function isEndlessBossWave(wave: number) {
  return wave > 0 && wave % 10 === 0;
}

export function isRecruitmentWave(mode: "campaign" | "endless", wave: number) {
  return [1, 3, 6].includes(wave) || (mode === "endless" && wave > 6 && wave % 10 === 5);
}

const CHAPTER_ONE_INTRO: Record<number, EnemyId[]> = {
  1: ["gloomling", "gloomling", "gloomling", "gloomling", "gloomling", "gloomling", "gloomling"],
  2: ["gloomling", "gloomling", "gloomling", "mossmaw", "gloomling", "gloomling", "gloomling"],
  3: ["gloomling", "mossmaw", "gloomling", "gloomling", "mossmaw", "gloomling"],
  4: ["gloomling", "whispling", "gloomling", "whispling", "gloomling", "whispling", "gloomling", "whispling"],
  5: ["gloomling", "bramble-brute", "gloomling", "gloomling", "bramble-brute", "gloomling", "gloomling"],
  6: ["gloomling", "shadepod", "gloomling", "gloomling", "shadepod", "gloomling"],
  7: ["gloomling", "whispling", "gloomling", "mender-moth", "mossmaw", "gloomling", "whispling"],
  8: ["bramble-brute", "gloomling", "whispling", "shadepod", "gloomling", "mossmaw", "gloomling"],
  9: ["whispling", "bramble-brute", "gloomling", "mender-moth", "shadepod", "mossmaw", "gloomling", "whispling"],
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function generatedComposition(chapter: number, wave: number, seed: number) {
  const difficulty = (chapter - 1) * WAVES_PER_CHAPTER + wave;
  const random = seededRandom(seed ^ Math.imul(chapter, 0x9e3779b9) ^ Math.imul(wave, 0x85ebca6b));
  const budget = 7 + difficulty * 1.65;
  const enemies: EnemyId[] = [];
  let remaining = budget;
  let healerCount = 0;
  let splitterCount = 0;
  while (remaining >= 1 && enemies.length < 30) {
    const eligible = ENEMY_DEFINITIONS.filter(enemy => enemy.pool !== false && enemy.minDifficulty <= difficulty && enemy.budget <= remaining && (enemy.ability !== "heal" || healerCount < 1) && (enemy.ability !== "split" || splitterCount < 3));
    const basicsPreferred = enemies.length < Math.ceil(budget * 0.3);
    const candidates = basicsPreferred ? eligible.filter(enemy => enemy.id === "gloomling") : eligible;
    const pool = candidates.length ? candidates : eligible;
    if (!pool.length) break;
    const chosen = pool[Math.floor(random() * pool.length)];
    enemies.push(chosen.id);
    remaining -= chosen.budget;
    if (chosen.ability === "heal") healerCount++;
    if (chosen.ability === "split") splitterCount++;
  }
  return { enemies, budget };
}

export function createWavePlan({ chapter, wave, seed, extraEnemies = 0 }: { chapter: number; wave: number; seed: number; extraEnemies?: number }): WavePlan {
  const difficulty = (chapter - 1) * WAVES_PER_CHAPTER + wave;
  if (wave === WAVES_PER_CHAPTER) {
    const bossId: EnemyId = chapter === 1 ? "thornmaw" : chapter === 2 ? "mire-monarch" : "hollow-crown";
    return { chapter, wave, difficulty, enemyIds: [bossId], budget: 0 };
  }
  const intro = chapter === 1 ? CHAPTER_ONE_INTRO[wave] : undefined;
  const generated = intro ? { enemies: [...intro], budget: intro.reduce((total, id) => total + ENEMY_BY_ID[id].budget, 0) } : generatedComposition(chapter, wave, seed);
  return { chapter, wave, difficulty, enemyIds: [...generated.enemies, ...Array.from({ length: Math.max(0, extraEnemies) }, () => "gloomling" as EnemyId)], budget: generated.budget + Math.max(0, extraEnemies) };
}

export function createEndlessWavePlan({ chapter, wave, seed, extraEnemies = 0 }: { chapter: number; wave: number; seed: number; extraEnemies?: number }): WavePlan {
  const difficulty = endlessDifficulty(wave);
  if (isEndlessBossWave(wave)) {
    const bosses: EnemyId[] = ["thornmaw", "mire-monarch", "hollow-crown"];
    const bossId = bosses[(Math.floor(wave / 10) - 1) % bosses.length];
    return { chapter, wave, difficulty, enemyIds: [bossId], budget: 0 };
  }
  const random = seededRandom(seed ^ Math.imul(wave, 0x85ebca6b));
  const budget = 8 + difficulty * 1.7;
  const enemies: EnemyId[] = [];
  let remaining = budget;
  let healerCount = 0;
  let splitterCount = 0;
  const healerLimit = wave >= 35 ? 2 : 1;
  while (remaining >= 1 && enemies.length < 36) {
    const eligible = ENEMY_DEFINITIONS.filter(enemy => enemy.pool !== false && enemy.minDifficulty <= difficulty && enemy.budget <= remaining && (enemy.ability !== "heal" || healerCount < healerLimit) && (enemy.ability !== "split" || splitterCount < 4));
    const basicsPreferred = enemies.length < Math.ceil(budget * 0.25);
    const candidates = basicsPreferred ? eligible.filter(enemy => enemy.id === "gloomling") : eligible;
    const pool = candidates.length ? candidates : eligible;
    if (!pool.length) break;
    const chosen = pool[Math.floor(random() * pool.length)];
    enemies.push(chosen.id);
    remaining -= chosen.budget;
    if (chosen.ability === "heal") healerCount++;
    if (chosen.ability === "split") splitterCount++;
  }
  return { chapter, wave, difficulty, enemyIds: [...enemies, ...Array.from({ length: Math.max(0, extraEnemies) }, () => "gloomling" as EnemyId)], budget: budget + Math.max(0, extraEnemies) };
}

export function groupWavePlan(plan: WavePlan, hpMultiplier = 1, shieldMultiplier = 1): WaveGroup[] {
  const counts = new Map<EnemyId, number>();
  for (const id of plan.enemyIds) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].map(([id, count]) => {
    const definition = ENEMY_BY_ID[id];
    const hp = enemyHealth(definition, plan.difficulty, plan.chapter, hpMultiplier);
    return { definition, count, hp, shield: Math.round(hp * definition.shieldRatio * shieldMultiplier) };
  });
}
