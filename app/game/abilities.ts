import { BOARD_SIZE } from "./content.ts";
import type { AbilityId, Critter, Enemy, Tower } from "./types.ts";
import type { FactionBondLevel } from "./factions.ts";

export const BASE_CRITICAL_CHANCE = 0.1;
export const CRITICAL_DAMAGE_MULTIPLIER = 2;

export function rangeIndicatorDiameter(range: number, boardSize: number) {
  return ((range + 0.65) * 2 / boardSize) * 100;
}

export type AbilityHit = { enemy: Enemy; multiplier: number };
export type AbilityHitModifiers = { splashDamageMultiplier?: number; chainDamageMultiplier?: number };

const cellDistance = (first: number, second: number) => {
  const columnGap = first % BOARD_SIZE - second % BOARD_SIZE;
  const rowGap = Math.floor(first / BOARD_SIZE) - Math.floor(second / BOARD_SIZE);
  return Math.hypot(columnGap, rowGap);
};

export function selectAbilityHits(ability: AbilityId, tier: 1 | 2 | 3, enemies: Enemy[], targetsInRange: Enemy[], primary: Enemy, path: number[], bondLevel: FactionBondLevel = 0, modifiers: AbilityHitModifiers = {}): AbilityHit[] {
  const rank = tier - 1;
  if (ability === "splash") {
    const targetCell = path[Math.min(path.length - 1, Math.floor(primary.step))];
    const radius = 1.45 + rank * 0.3 + bondLevel * 0.5;
    const limit = 4 + rank;
    const secondaryMultiplier = (0.65 + rank * 0.075) * (modifiers.splashDamageMultiplier ?? 1);
    const nearby = enemies
      .filter(enemy => enemy.id !== primary.id && enemy.hp > 0)
      .map(enemy => ({ enemy, distance: cellDistance(path[Math.min(path.length - 1, Math.floor(enemy.step))], targetCell) }))
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance || b.enemy.step - a.enemy.step)
      .slice(0, limit - 1)
      .map(item => ({ enemy: item.enemy, multiplier: secondaryMultiplier }));
    return [{ enemy: primary, multiplier: 1 }, ...nearby];
  }
  if (ability === "lightning") {
    const retention = 0.72 + rank * 0.06;
    return targetsInRange.slice(0, 3 + rank + bondLevel).map((enemy, index) => ({ enemy, multiplier: retention ** index * (index > 0 ? modifiers.chainDamageMultiplier ?? 1 : 1) }));
  }
  return [{ enemy: primary, multiplier: 1 }];
}

export function criticalChanceBonus(bondLevel: FactionBondLevel) {
  return bondLevel * 0.05;
}

export function rollCritical(random = Math.random, bonusChance = 0) {
  return random() < BASE_CRITICAL_CHANCE + bonusChance;
}

export function calculateHitDamage(baseDamage: number, hitMultiplier: number, critical: boolean, piercingBonus = 1, criticalMultiplier = CRITICAL_DAMAGE_MULTIPLIER) {
  return Math.round(baseDamage * hitMultiplier * piercingBonus * (critical ? criticalMultiplier : 1));
}

export function guardianCriticalDamageMultiplier(critter: Critter, piercingStarterMultiplier = CRITICAL_DAMAGE_MULTIPLIER) {
  return Math.max(CRITICAL_DAMAGE_MULTIPLIER, critter.criticalDamageMultiplier ?? CRITICAL_DAMAGE_MULTIPLIER, critter.ability === "piercing" ? piercingStarterMultiplier : CRITICAL_DAMAGE_MULTIPLIER);
}

export function guardianCriticalChance(critter: Critter, bondLevel: FactionBondLevel = 0) {
  return BASE_CRITICAL_CHANCE + (critter.criticalChanceBonus ?? 0) + (critter.faction === "starborn" ? criticalChanceBonus(bondLevel) : 0);
}

export function advanceFocusAttack(critter: Critter, targetId: number, tower: Pick<Tower, "focusTargetId" | "focusStacks" | "focusAttackProgress">) {
  if (!critter.focusAttackSpeedPerStack || !critter.focusMaxStacks) return null;
  const sameTarget = tower.focusTargetId === targetId;
  const focusStacks = sameTarget ? Math.min(critter.focusMaxStacks, (tower.focusStacks || 0) + 1) : 0;
  let focusAttackProgress = (sameTarget ? tower.focusAttackProgress || 0 : 0) + focusStacks * critter.focusAttackSpeedPerStack;
  const bonusAttacks = Math.floor(focusAttackProgress + 0.000001);
  focusAttackProgress -= bonusAttacks;
  return { focusTargetId: targetId, focusStacks, focusAttackProgress, bonusAttacks };
}

export function selectCriticalExtraTargets(critter: Critter, primary: Enemy, targetsInRange: Enemy[]) {
  return targetsInRange.filter(enemy => enemy.id !== primary.id && enemy.hp > 0).slice(0, critter.criticalExtraTargets ?? 0);
}

export function pushBackDistance(tier: 1 | 2 | 3, boss = false, bondLevel: FactionBondLevel = 0) {
  const distance = (0.75 + (tier - 1) * 0.35) * (1 + bondLevel * 0.25);
  return boss ? distance * 0.5 : distance;
}

export function burnEffect(baseDamage: number, tier: 1 | 2 | 3, bondLevel: FactionBondLevel = 0) {
  const rank = tier - 1;
  return {
    ticks: 3 + rank + (bondLevel > 0 ? 1 : 0),
    damage: Math.round(baseDamage * (0.2 + rank * 0.05)),
    spreadMultiplier: bondLevel === 2 ? 0.5 : 0,
  };
}

export function burnDamageMultiplierForEnemy(enemy: Enemy, towers: Tower[], path: number[], rangeBonus = 0) {
  const enemyCell = path[Math.min(path.length - 1, Math.floor(enemy.step))];
  return towers.reduce((strongest, tower) => {
    const multiplier = tower.critter.burnDamageTakenMultiplier;
    const auraRange = tower.critter.burnAuraRange ?? tower.critter.range;
    if (!multiplier || cellDistance(enemyCell, tower.slot) > auraRange + rangeBonus + 0.65) return strongest;
    return Math.max(strongest, multiplier);
  }, 1);
}

export function selectBurnSpreadTarget(enemies: Enemy[], primary: Enemy, path: number[]) {
  const targetCell = path[Math.min(path.length - 1, Math.floor(primary.step))];
  return enemies
    .filter(enemy => enemy.id !== primary.id && enemy.hp > 0)
    .map(enemy => ({ enemy, distance: cellDistance(path[Math.min(path.length - 1, Math.floor(enemy.step))], targetCell) }))
    .filter(item => item.distance <= 1.5)
    .sort((a, b) => a.distance - b.distance || b.enemy.step - a.enemy.step)[0]?.enemy ?? null;
}

export function slowEffect(tier: 1 | 2 | 3, bondLevel: FactionBondLevel = 0, durationMultiplier = 1) {
  const rank = tier - 1;
  return { ticks: (4 + rank) * durationMultiplier, factor: Math.min(0.85, 0.45 + rank * 0.075 + bondLevel * 0.1) };
}
