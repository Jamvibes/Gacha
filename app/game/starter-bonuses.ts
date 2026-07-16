export type StarterEffect =
  | { type: "startingLives"; amount: number }
  | { type: "startingCopy"; amount: number }
  | { type: "damageMultiplier"; multiplier: number }
  | { type: "range"; amount: number }
  | { type: "attackSpeed"; amount: number }
  | { type: "enemyShieldMultiplier"; multiplier: number };

export type StarterBonusDefinition = {
  description: string;
  effects: StarterEffect[];
};

export const BASE_STARTING_LIVES = 10;
export const BASE_STARTING_COPIES = 1;

export const STARTER_BONUSES: Record<string, StarterBonusDefinition> = {
  emberfox: { description: "+1 extra Emberfox copy", effects: [{ type: "startingCopy", amount: 1 }] },
  bubblefin: { description: "+3 Heart Tree health", effects: [{ type: "startingLives", amount: 3 }] },
  mossback: { description: "+15% guardian damage", effects: [{ type: "damageMultiplier", multiplier: 1.15 }] },
  sparkit: { description: "+1 attack speed for all guardians", effects: [{ type: "attackSpeed", amount: 1 }] },
  bloomwing: { description: "+1 range for all guardians", effects: [{ type: "range", amount: 1 }] },
  moonowl: { description: "Enemy shields are 25% weaker", effects: [{ type: "enemyShieldMultiplier", multiplier: 0.75 }] },
};

const effectsFor = (starterId: string | null | undefined) => starterId ? STARTER_BONUSES[starterId]?.effects ?? [] : [];

const totalAmount = (starterId: string | null | undefined, type: "startingLives" | "startingCopy" | "range" | "attackSpeed") =>
  effectsFor(starterId).reduce((total, effect) => total + (effect.type === type && "amount" in effect ? effect.amount : 0), 0);

const totalMultiplier = (starterId: string | null | undefined, type: "damageMultiplier" | "enemyShieldMultiplier") =>
  effectsFor(starterId).reduce((total, effect) => total * (effect.type === type && "multiplier" in effect ? effect.multiplier : 1), 1);

export const starterBlessing = (starterId: string) => STARTER_BONUSES[starterId]?.description ?? "No additional starter bonus";
export const starterStartingLives = (starterId: string) => BASE_STARTING_LIVES + totalAmount(starterId, "startingLives");
export const starterStartingCopies = (starterId: string) => BASE_STARTING_COPIES + totalAmount(starterId, "startingCopy");
export const starterDamageMultiplier = (starterId: string | null | undefined) => totalMultiplier(starterId, "damageMultiplier");
export const starterRangeBonus = (starterId: string | null | undefined) => totalAmount(starterId, "range");
export const starterAttackSpeedBonus = (starterId: string | null | undefined) => totalAmount(starterId, "attackSpeed");
export const starterEnemyShieldMultiplier = (starterId: string | null | undefined) => totalMultiplier(starterId, "enemyShieldMultiplier");
