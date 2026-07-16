export type StarterEffect =
  | { type: "startingLives"; amount: number }
  | { type: "startingCopy"; amount: number }
  | { type: "damageMultiplier"; multiplier: number }
  | { type: "range"; amount: number }
  | { type: "attackSpeed"; amount: number }
  | { type: "enemyShieldMultiplier"; multiplier: number }
  | { type: "periodicBurn"; intervalTicks: number; burnTicks: number; damage: number }
  | { type: "splashDamageMultiplier"; multiplier: number }
  | { type: "slowDurationMultiplier"; multiplier: number }
  | { type: "chainDamageMultiplier"; multiplier: number }
  | { type: "periodicPush"; intervalTicks: number; distance: number }
  | { type: "piercingCriticalMultiplier"; multiplier: number };

export type StarterBonusDefinition = {
  description: string;
  effects: StarterEffect[];
};

export const BASE_STARTING_LIVES = 10;
export const BASE_STARTING_COPIES = 1;

export const STARTER_BONUSES: Record<string, StarterBonusDefinition> = {
  emberfox: { description: "Every 5 ticks, 1 random enemy is burned", effects: [{ type: "periodicBurn", intervalTicks: 5, burnTicks: 3, damage: 4 }] },
  bubblefin: { description: "Splash damage is 10% stronger", effects: [{ type: "splashDamageMultiplier", multiplier: 1.1 }] },
  mossback: { description: "Slow effects last 20% longer", effects: [{ type: "slowDurationMultiplier", multiplier: 1.2 }] },
  sparkit: { description: "Chain effects deal 10% more damage", effects: [{ type: "chainDamageMultiplier", multiplier: 1.1 }] },
  bloomwing: { description: "Every 10 ticks, 1 random enemy is pushed back", effects: [{ type: "periodicPush", intervalTicks: 10, distance: 0.75 }] },
  moonowl: { description: "Piercing critical strikes deal 2.5× damage", effects: [{ type: "piercingCriticalMultiplier", multiplier: 2.5 }] },
};

const effectsFor = (starterId: string | null | undefined) => starterId ? STARTER_BONUSES[starterId]?.effects ?? [] : [];

const totalAmount = (starterId: string | null | undefined, type: "startingLives" | "startingCopy" | "range" | "attackSpeed") =>
  effectsFor(starterId).reduce((total, effect) => total + (effect.type === type && "amount" in effect ? effect.amount : 0), 0);

const totalMultiplier = (starterId: string | null | undefined, type: "damageMultiplier" | "enemyShieldMultiplier") =>
  effectsFor(starterId).reduce((total, effect) => total * (effect.type === type && "multiplier" in effect ? effect.multiplier : 1), 1);

const multiplierEffect = (starterId: string | null | undefined, type: "splashDamageMultiplier" | "slowDurationMultiplier" | "chainDamageMultiplier") =>
  effectsFor(starterId).reduce((total, effect) => total * (effect.type === type && "multiplier" in effect ? effect.multiplier : 1), 1);

export const starterBlessing = (starterId: string) => STARTER_BONUSES[starterId]?.description ?? "No additional starter bonus";
export const starterStartingLives = (starterId: string) => BASE_STARTING_LIVES + totalAmount(starterId, "startingLives");
export const starterStartingCopies = (starterId: string) => BASE_STARTING_COPIES + totalAmount(starterId, "startingCopy");
export const starterDamageMultiplier = (starterId: string | null | undefined) => totalMultiplier(starterId, "damageMultiplier");
export const starterRangeBonus = (starterId: string | null | undefined) => totalAmount(starterId, "range");
export const starterAttackSpeedBonus = (starterId: string | null | undefined) => totalAmount(starterId, "attackSpeed");
export const starterEnemyShieldMultiplier = (starterId: string | null | undefined) => totalMultiplier(starterId, "enemyShieldMultiplier");
export const starterSplashDamageMultiplier = (starterId: string | null | undefined) => multiplierEffect(starterId, "splashDamageMultiplier");
export const starterSlowDurationMultiplier = (starterId: string | null | undefined) => multiplierEffect(starterId, "slowDurationMultiplier");
export const starterChainDamageMultiplier = (starterId: string | null | undefined) => multiplierEffect(starterId, "chainDamageMultiplier");
export const starterPiercingCriticalMultiplier = (starterId: string | null | undefined) => {
  const effect = effectsFor(starterId).find((candidate): candidate is Extract<StarterEffect, { type: "piercingCriticalMultiplier" }> => candidate.type === "piercingCriticalMultiplier");
  return effect?.multiplier ?? 2;
};
export const starterPeriodicBurn = (starterId: string | null | undefined) =>
  effectsFor(starterId).find((effect): effect is Extract<StarterEffect, { type: "periodicBurn" }> => effect.type === "periodicBurn") ?? null;
export const starterPeriodicPush = (starterId: string | null | undefined) =>
  effectsFor(starterId).find((effect): effect is Extract<StarterEffect, { type: "periodicPush" }> => effect.type === "periodicPush") ?? null;
