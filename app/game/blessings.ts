import type { BlessingId } from "./types.ts";

export type BlessingDefinition = {
  id: BlessingId;
  name: string;
  icon: string;
  polarity: "buff" | "debuff";
  description: (stacks: number) => string;
};

export const BLESSINGS: BlessingDefinition[] = [
  { id: "harvest", name: "Moonbloom Covenant", icon: "🌸", polarity: "buff", description: stacks => `+${stacks * 5} petals after every wave for the rest of this run` },
  { id: "warden", name: "Oath of the Deep Roots", icon: "🌳", polarity: "buff", description: stacks => `+${stacks * 5}% guardian damage for the rest of this run` },
];

export const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(blessing => [blessing.id, blessing])) as Record<BlessingId, BlessingDefinition>;

export const emptyBlessings = () => ({ harvest: 0, warden: 0 });
