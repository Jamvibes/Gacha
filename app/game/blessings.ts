import type { BlessingId } from "./types.ts";

export type BlessingDefinition = {
  id: BlessingId;
  name: string;
  icon: string;
  description: (stacks: number) => string;
};

export const BLESSINGS: BlessingDefinition[] = [
  { id: "harvest", name: "Moonbloom Covenant", icon: "🌸", description: stacks => `+${stacks * 5} petals after every wave` },
  { id: "spring", name: "Echoing Spring", icon: "💧", description: stacks => `${stacks} extra guardian ${stacks === 1 ? "copy" : "copies"} granted` },
  { id: "warden", name: "Oath of the Deep Roots", icon: "🌳", description: stacks => `+${stacks * 5}% guardian damage` },
];

export const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(blessing => [blessing.id, blessing])) as Record<BlessingId, BlessingDefinition>;

export const emptyBlessings = () => ({ harvest: 0, spring: 0, warden: 0 });
