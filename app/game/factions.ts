import type { AbilityId, FactionId } from "./types.ts";

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
