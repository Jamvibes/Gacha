import type { EnemyDefinition } from "./enemies.ts";
import type { Enemy } from "./types.ts";

export type EnemyStatus = {
  id: "shield" | "burn" | "slow" | "heal" | "split" | "fast" | "boss";
  icon: string;
  label: string;
  detail: string;
};

export function getEnemyStatuses(enemy: Enemy, definition: EnemyDefinition): EnemyStatus[] {
  const statuses: EnemyStatus[] = [];
  if (enemy.shield > 0) statuses.push({ id: "shield", icon: "🛡️", label: "Shielded", detail: `${Math.ceil(enemy.shield)} shield remaining` });
  if ((enemy.burnTicks || 0) > 0) statuses.push({ id: "burn", icon: "🔥", label: "Burning", detail: `${Math.ceil(enemy.burnTicks || 0)} ticks • ${enemy.burnDamage || 0} damage each` });
  if ((enemy.slowTicks || 0) > 0) statuses.push({ id: "slow", icon: "❄️", label: "Slowed", detail: `${Math.ceil(enemy.slowTicks || 0)} ticks • ${Math.round((enemy.slowFactor || 0.45) * 100)}% slower` });
  if (definition.ability === "heal") statuses.push({ id: "heal", icon: "💚", label: "Healer", detail: "Periodically heals nearby allies" });
  if (definition.ability === "split" && !enemy.splitTriggered) statuses.push({ id: "split", icon: "✦", label: "Splitter", detail: "Creates two Gloomlets when defeated" });
  if (definition.ability === "fast") statuses.push({ id: "fast", icon: "💨", label: "Fast", detail: `${Math.round((definition.speedMultiplier - 1) * 100)}% faster than normal` });
  if (enemy.boss) statuses.push({ id: "boss", icon: "👑", label: "Boss", detail: "Resists half of all push-back" });
  return statuses;
}
