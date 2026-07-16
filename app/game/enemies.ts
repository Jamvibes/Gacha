import type { Enemy, EnemyCodexEntry } from "./types.ts";

export type EnemyId = "gloomling" | "gloomlet" | "mossmaw" | "bramble-brute" | "whispling" | "shadepod" | "mender-moth" | "thornmaw" | "mire-monarch" | "hollow-crown";
export type EnemyAbilityId = "basic" | "tank" | "shield" | "fast" | "split" | "heal" | "boss";

export type EnemyDefinition = {
  id: EnemyId;
  name: string;
  title: string;
  icon: string;
  sprite?: string;
  role: string;
  chapter: string;
  defence: string;
  abilityText: string;
  color: string;
  ability: EnemyAbilityId;
  budget: number;
  minDifficulty: number;
  hpMultiplier: number;
  speedMultiplier: number;
  shieldRatio: number;
  pool?: boolean;
  boss?: boolean;
  splitInto?: number;
};

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  { id: "gloomling", name: "Gloomling", title: "Restless Shadow", icon: "👾", sprite: "./enemies/gloomling-sprite.png", role: "Basic foe", chapter: "All chapters", defence: "No shield", abilityText: "Skitter: steady movement with no special protection.", color: "#816d9d", ability: "basic", budget: 1, minDifficulty: 1, hpMultiplier: 1, speedMultiplier: 1, shieldRatio: 0 },
  { id: "gloomlet", name: "Gloomlet", title: "Freshly Split Shadow", icon: "▪️", role: "Split offspring", chapter: "All chapters", defence: "Very fragile", abilityText: "A small fragment created by a defeated Shadepod.", color: "#9a89b3", ability: "fast", budget: 0, minDifficulty: 1, hpMultiplier: 0.32, speedMultiplier: 1.25, shieldRatio: 0, pool: false },
  { id: "mossmaw", name: "Mossmaw", title: "Stubborn Stomper", icon: "🪨", role: "Extra-health foe", chapter: "All chapters", defence: "Very high health", abilityText: "Thick Hide: carries more than twice the health of a Gloomling but moves slowly.", color: "#6f8059", ability: "tank", budget: 2.5, minDifficulty: 2, hpMultiplier: 2.25, speedMultiplier: 0.72, shieldRatio: 0 },
  { id: "bramble-brute", name: "Bramble Brute", title: "Armoured Thicket", icon: "👹", sprite: "./enemies/bramble-brute-sprite.png", role: "Shielded foe", chapter: "All chapters", defence: "Barkshield: 35% shield", abilityText: "Barkshield adds a protective barrier that piercing attacks can ignore.", color: "#71824e", ability: "shield", budget: 2.5, minDifficulty: 5, hpMultiplier: 1.35, speedMultiplier: 0.88, shieldRatio: 0.35 },
  { id: "whispling", name: "Whispling", title: "Hurrying Wisp", icon: "💨", role: "Fast fragile foe", chapter: "All chapters", defence: "Low health", abilityText: "Tailwind: moves 70% faster than a Gloomling but has much less health.", color: "#79a7b6", ability: "fast", budget: 1, minDifficulty: 4, hpMultiplier: 0.55, speedMultiplier: 1.7, shieldRatio: 0 },
  { id: "shadepod", name: "Shadepod", title: "Hatching Gloom", icon: "🫐", role: "Splitting foe", chapter: "All chapters", defence: "Moderate health", abilityText: "Gloom Hatch: splits into two fast Gloomlets when defeated. Gloomlets grant no extra rewards.", color: "#73567f", ability: "split", budget: 3, minDifficulty: 6, hpMultiplier: 1.15, speedMultiplier: 0.86, shieldRatio: 0, splitInto: 2 },
  { id: "mender-moth", name: "Mender Moth", title: "Gloom Caretaker", icon: "🦋", role: "Healing support", chapter: "All chapters", defence: "Low health", abilityText: "Mending Dust: periodically restores nearby non-healer enemies, but cannot heal itself.", color: "#b171a5", ability: "heal", budget: 4, minDifficulty: 7, hpMultiplier: 0.8, speedMultiplier: 0.78, shieldRatio: 0 },
  { id: "thornmaw", name: "The Thornmaw", title: "Meadow Devourer", icon: "🐲", sprite: "./enemies/thornmaw-sprite.png", role: "Boss", chapter: "Chapter 1 · Sundew Meadow", defence: "Royal Ward: 20% shield", abilityText: "A colossal creature with exceptional health, a protective ward, and resistance to push-back.", color: "#9a5b69", ability: "boss", budget: 0, minDifficulty: 10, hpMultiplier: 1, speedMultiplier: 0.72, shieldRatio: 0.2, pool: false, boss: true },
  { id: "mire-monarch", name: "The Mire Monarch", title: "Sovereign of the Mist", icon: "🐙", sprite: "./enemies/mire-monarch-sprite.png", role: "Boss", chapter: "Chapter 2 · Moonpetal Marsh", defence: "Royal Ward: 20% shield", abilityText: "Rules the marsh with colossal health, a protective ward, and resistance to push-back.", color: "#567d83", ability: "boss", budget: 0, minDifficulty: 20, hpMultiplier: 1, speedMultiplier: 0.72, shieldRatio: 0.2, pool: false, boss: true },
  { id: "hollow-crown", name: "The Hollow Crown", title: "Starless Usurper", icon: "👑", sprite: "./enemies/hollow-crown-sprite.png", role: "Final boss", chapter: "Chapter 3 · Starlight Canopy", defence: "Royal Ward: 20% shield", abilityText: "The final guardian of the Gloom, fortified by colossal health and resistance to push-back.", color: "#6e588d", ability: "boss", budget: 0, minDifficulty: 30, hpMultiplier: 1, speedMultiplier: 0.72, shieldRatio: 0.2, pool: false, boss: true },
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMY_DEFINITIONS.map(enemy => [enemy.id, enemy])) as Record<EnemyId, EnemyDefinition>;
export const ENEMY_SPRITES = Object.fromEntries(ENEMY_DEFINITIONS.filter(enemy => enemy.sprite).map(enemy => [enemy.name, enemy.sprite!])) as Record<string, string>;
export const ENEMY_CODEX: EnemyCodexEntry[] = ENEMY_DEFINITIONS.map(enemy => ({ name: enemy.name, title: enemy.title, icon: enemy.icon, chapter: enemy.chapter, role: enemy.role, defence: enemy.defence, ability: enemy.abilityText, color: enemy.color, boss: enemy.boss }));

export function enemyHealth(definition: EnemyDefinition, difficulty: number, chapter: number, hpMultiplier = 1) {
  const base = definition.boss ? 1200 + chapter * 800 : 58 + difficulty * 18;
  return Math.round(base * definition.hpMultiplier * hpMultiplier);
}

export function createEnemy(definition: EnemyDefinition, instanceId: number, difficulty: number, chapter: number, hpMultiplier = 1, shieldMultiplier = 1, step = 0): Enemy {
  const hp = enemyHealth(definition, difficulty, chapter, hpMultiplier);
  const shield = Math.round(hp * definition.shieldRatio * shieldMultiplier);
  return { id: instanceId, definitionId: definition.id, step, hp, maxHp: hp, shield, maxShield: shield, kind: definition.name, icon: definition.icon, boss: definition.boss, speedMultiplier: definition.speedMultiplier, splitInto: definition.splitInto, healCooldown: definition.ability === "heal" ? 6 : undefined };
}

export function applyHealerPulse(enemies: Enemy[], healer: Enemy) {
  if (ENEMY_BY_ID[healer.definitionId as EnemyId]?.ability !== "heal" || healer.hp <= 0) return [];
  healer.healCooldown = Math.max(0, (healer.healCooldown || 0) - 1);
  if (healer.healCooldown > 0) return [];
  const healed = enemies
    .filter(ally => ally.id !== healer.id && ally.hp > 0 && ally.hp < ally.maxHp && ENEMY_BY_ID[ally.definitionId as EnemyId]?.ability !== "heal" && Math.abs(ally.step - healer.step) <= 2)
    .slice(0, 3)
    .map(enemy => {
      const amount = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.round(enemy.maxHp * 0.08)));
      enemy.hp += amount;
      return { enemy, amount };
    });
  healer.healCooldown = 8;
  return healed;
}

export function createSplitOffspring(parent: Enemy, nextId: () => number, difficulty: number, chapter: number, hpMultiplier = 1) {
  if (parent.hp > 0 || !parent.splitInto || parent.splitTriggered) return [];
  parent.splitTriggered = true;
  return Array.from({ length: parent.splitInto }, (_, index) => createEnemy(ENEMY_BY_ID.gloomlet, nextId(), difficulty, chapter, hpMultiplier, 1, Math.max(0, parent.step - index * 0.08)));
}
