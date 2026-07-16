import { BOARD_SIZE } from "./content.ts";
import type { AbilityId, Enemy } from "./types.ts";

export const BASE_CRITICAL_CHANCE = 0.1;
export const CRITICAL_DAMAGE_MULTIPLIER = 2;

export function rangeIndicatorDiameter(range: number, boardSize: number) {
  return ((range + 0.65) * 2 / boardSize) * 100;
}

export type AbilityHit = { enemy: Enemy; multiplier: number };

const cellDistance = (first: number, second: number) => {
  const columnGap = first % BOARD_SIZE - second % BOARD_SIZE;
  const rowGap = Math.floor(first / BOARD_SIZE) - Math.floor(second / BOARD_SIZE);
  return Math.hypot(columnGap, rowGap);
};

export function selectAbilityHits(ability: AbilityId, tier: 1 | 2 | 3, enemies: Enemy[], targetsInRange: Enemy[], primary: Enemy, path: number[]): AbilityHit[] {
  const rank = tier - 1;
  if (ability === "splash") {
    const targetCell = path[Math.min(path.length - 1, Math.floor(primary.step))];
    const radius = 1.45 + rank * 0.3;
    const limit = 4 + rank;
    const secondaryMultiplier = 0.65 + rank * 0.075;
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
    return targetsInRange.slice(0, 3 + rank).map((enemy, index) => ({ enemy, multiplier: retention ** index }));
  }
  return [{ enemy: primary, multiplier: 1 }];
}

export function rollCritical(random = Math.random) {
  return random() < BASE_CRITICAL_CHANCE;
}

export function calculateHitDamage(baseDamage: number, hitMultiplier: number, critical: boolean, piercingBonus = 1) {
  return Math.round(baseDamage * hitMultiplier * piercingBonus * (critical ? CRITICAL_DAMAGE_MULTIPLIER : 1));
}

export function pushBackDistance(tier: 1 | 2 | 3, boss = false) {
  const distance = 0.75 + (tier - 1) * 0.35;
  return boss ? distance * 0.5 : distance;
}
