import type { AbilityId, FactionId, Tower } from "./types.ts";

export type FactionDefinition = {
  id: FactionId;
  name: string;
  icon: string;
  aesthetic: string;
  signatureAbility: AbilityId;
};

export const FACTIONS: FactionDefinition[] = [
  { id: "emberkin", name: "Emberkin", icon: "🔥", aesthetic: "Warm flame, glowing embers, ash markings, and sunlit fur", signatureAbility: "burn" },
  { id: "tidekin", name: "Tidekin", icon: "💧", aesthetic: "Clear water, bubbles, fins, shells, and flowing shapes", signatureAbility: "splash" },
  { id: "rootbound", name: "Rootbound", icon: "🌿", aesthetic: "Moss, stone, leaves, bark, and ancient forest growth", signatureAbility: "slow" },
  { id: "stormborn", name: "Stormborn", icon: "⚡", aesthetic: "Golden lightning, storm markings, dark clouds, and sharp silhouettes", signatureAbility: "lightning" },
  { id: "cloudkin", name: "Cloudkin", icon: "☁️", aesthetic: "Soft clouds, wind ribbons, pale skies, and airy rounded forms", signatureAbility: "push" },
  { id: "starborn", name: "Starborn", icon: "🌙", aesthetic: "Night skies, constellations, moonlight, and crystalline stars", signatureAbility: "piercing" },
];

export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map(faction => [faction.id, faction])) as Record<FactionId, FactionDefinition>;

export type FactionCountingMode = "copies" | "uniqueGuardians" | "uniqueFamilies";
export type FactionBondLevel = 0 | 1 | 2;
export type FactionBondState = { count: number; level: FactionBondLevel };

export const FACTION_COUNTING_MODE: FactionCountingMode = "copies";

export const FACTION_BONDS: Record<FactionId, { levelOne: string; levelTwo: string }> = {
  emberkin: { levelOne: "Burn lasts 1 additional tick.", levelTwo: "Burn also spreads to 1 nearby enemy at 50% damage." },
  tidekin: { levelOne: "Splash radius increases by half a tile.", levelTwo: "Splash radius increases by 1 tile in total." },
  rootbound: { levelOne: "Slow effects become 10% stronger.", levelTwo: "Slow effects become 20% stronger in total." },
  stormborn: { levelOne: "Lightning gains 1 additional chain.", levelTwo: "Lightning gains 2 additional chains in total." },
  cloudkin: { levelOne: "Push-back becomes 25% stronger.", levelTwo: "Push-back becomes 50% stronger in total." },
  starborn: { levelOne: "Critical-hit chance increases by 5%.", levelTwo: "Critical-hit chance increases by 10% in total." },
};

export function factionBondLevel(count: number): FactionBondLevel {
  return count >= 3 ? 2 : count >= 2 ? 1 : 0;
}

export function getFactionBondStates(towers: Tower[], mode: FactionCountingMode = FACTION_COUNTING_MODE) {
  const keys = Object.fromEntries(FACTIONS.map(faction => [faction.id, new Set<string>()])) as Record<FactionId, Set<string>>;
  for (const tower of towers) {
    const key = mode === "copies" ? `copy:${tower.slot}` : mode === "uniqueGuardians" ? `guardian:${tower.critter.id}` : `family:${tower.sourceId}`;
    keys[tower.critter.faction].add(key);
  }
  return Object.fromEntries(FACTIONS.map(faction => {
    const count = keys[faction.id].size;
    return [faction.id, { count, level: factionBondLevel(count) }];
  })) as Record<FactionId, FactionBondState>;
}
