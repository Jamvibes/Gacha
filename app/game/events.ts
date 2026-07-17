import { CRITTERS } from "./content.ts";
import type { BlessingId, Critter } from "./types.ts";

export type EventEffect =
  | { type: "dewshards"; amount: number }
  | { type: "guardianCopy"; amount: number; target: "selected" }
  | { type: "heal"; amount: number }
  | { type: "blessing"; blessingId: BlessingId; amount: number }
  | { type: "nextWave"; hpMultiplier: number; extraEnemies: number; note: string }
  | { type: "runDamageMultiplier"; multiplier: number }
  | { type: "sendGuardian"; guardianId: string; waves: number }
  | { type: "temporaryDamage"; multiplier: number; waves: 1 }
  | { type: "returnAidGuardian" }
  | { type: "randomTierGuardian"; tier: 2; fallbackDewshards: number };

export type EventRequirement = { type: "unplacedGuardianCopy" };

export type EventChoiceDefinition = {
  id: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  resultMessage: string;
  effects: EventEffect[];
};

export type EventDefinition = {
  id: string;
  icon: string;
  title: string;
  description: string;
  weight: number;
  pool?: boolean;
  minChapter?: number;
  maxChapter?: number;
  minWave?: number;
  maxWave?: number;
  scheduled?: { chapter?: number; wave: number }[];
  repeatable?: boolean;
  requirements?: EventRequirement[];
  dynamicChoices?: "sendUnplacedGuardians";
  choices: EventChoiceDefinition[];
};

export type EventSelectionContext = {
  chapter: number;
  wave: number;
  seed: number;
  recentEventIds: string[];
  resolvedEventIds?: string[];
  unplacedGuardianIds?: string[];
};

export const EVENTS: EventDefinition[] = [
  {
    id: "call-for-aid",
    icon: "📯",
    title: "Should we call for aid?",
    description: "A distant signal could bring reinforcements, but one unplaced guardian must carry the call through the wilds.",
    weight: 2,
    repeatable: false,
    requirements: [{ type: "unplacedGuardianCopy" }],
    dynamicChoices: "sendUnplacedGuardians",
    choices: [
      { id: "cannot-spare-anyone", icon: "🛡️", label: "HOLD THE LINE", title: "We can't spare anyone", description: "Gain 1 Dewshard. All guardians deal 10% more damage during the next wave.", resultMessage: "The guardians close ranks and prepare to strike harder.", effects: [{ type: "dewshards", amount: 1 }, { type: "temporaryDamage", multiplier: 1.1, waves: 1 }] },
    ],
  },
  {
    id: "aid-answered",
    icon: "✨",
    title: "They've answered the call",
    description: "Your messenger returns with a new ally from deeper in the wilds.",
    weight: 0,
    pool: false,
    repeatable: false,
    choices: [
      { id: "welcome-reinforcements", icon: "🌟", label: "REINFORCEMENTS", title: "Welcome the reinforcements", description: "Your sent guardian returns with a random unlocked Tier 2 guardian you have not gained during this run. If none remain, gain 2 Dewshards instead.", resultMessage: "{guardian} returns with {reward}, who joins the run.", effects: [{ type: "returnAidGuardian" }, { type: "randomTierGuardian", tier: 2, fallbackDewshards: 2 }] },
    ],
  },
  {
    id: "heart-tree-whisper",
    icon: "🌳",
    title: "A whisper beneath the Heart Tree",
    description: "At this familiar turning point, the ancient roots offer strength—but every promise shapes the next battle.",
    weight: 1,
    choices: [
      { id: "accept-rootward", icon: "🌿", label: "STEADY • 💠 1", title: "Accept the rootward", description: "Heal 2 objective health, gain 1 Dewshard, and receive the Oath of the Deep Roots. The next wave has 2 extra enemies.", resultMessage: "The Heart Tree answers with patient strength.", effects: [{ type: "heal", amount: 2 }, { type: "dewshards", amount: 1 }, { type: "blessing", blessingId: "warden", amount: 1 }, { type: "runDamageMultiplier", multiplier: 1.05 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 2, note: "Rootward promise: +2 health • 2 extra enemies" }] },
      { id: "gather-heart-sap", icon: "💠", label: "BOLD • 💠 2", title: "Gather shimmering heart-sap", description: "Gain 2 Dewshards. The next wave has 20% more health.", resultMessage: "The heart-sap hardens into two bright Dewshards.", effects: [{ type: "dewshards", amount: 2 }, { type: "nextWave", hpMultiplier: 1.2, extraEnemies: 0, note: "Heart-sap trial: enemies have 20% more health" }] },
    ],
  },
  {
    id: "moonlit-crossroads",
    icon: "🌙",
    title: "Moonlight at the old crossroads",
    description: "The forest offers three paths. Every gift has a consequence.",
    weight: 4,
    choices: [
      { id: "harvest-moonpetals", icon: "💠", label: "RISKY • 💠 2", title: "Gather moonlit dew", description: "Gain 2 Dewshards. The next wave has 35% more health.", resultMessage: "Moonlit dew gathers into two bright Dewshards.", effects: [{ type: "dewshards", amount: 2 }, { type: "nextWave", hpMultiplier: 1.35, extraEnemies: 0, note: "Moonlit trial: enemies have 35% more health" }] },
      { id: "listen-to-spring", icon: "💧", label: "SAFE • 💠 1", title: "Listen to the echoing spring", description: "Gain 1 Dewshard and an additional copy of your selected guardian.", resultMessage: "The Echoing Spring created one additional {guardian} copy for this run.", effects: [{ type: "dewshards", amount: 1 }, { type: "guardianCopy", target: "selected", amount: 1 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 0, note: "{guardian}'s echo: +1 placeable copy • normal enemy strength" }] },
      { id: "make-root-pact", icon: "🌳", label: "TACTICAL • 💠 1", title: "Make a root pact", description: "Heal 2 objective health, gain 1 Dewshard, and receive the Oath of the Deep Roots. Face 3 extra enemies next wave.", resultMessage: "The Oath of the Deep Roots strengthens every guardian.", effects: [{ type: "heal", amount: 2 }, { type: "dewshards", amount: 1 }, { type: "blessing", blessingId: "warden", amount: 1 }, { type: "runDamageMultiplier", multiplier: 1.05 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 3, note: "Root pact: +2 Heart Tree health • 3 extra enemies" }] },
    ],
  },
  {
    id: "mushroom-circle",
    icon: "🍄",
    title: "The lantern mushroom circle",
    description: "Tiny lights dance between the caps, inviting you to join their peculiar ritual.",
    weight: 3,
    maxChapter: 2,
    choices: [
      { id: "dance-for-petals", icon: "✨", label: "MERRY • 💠 1", title: "Dance with the lanterns", description: "Gain 1 Dewshard. Two curious gloomlings follow the music into the next wave.", resultMessage: "The mushroom lanterns leave a bead of silver dew behind.", effects: [{ type: "dewshards", amount: 1 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 2, note: "Lantern procession: 2 extra enemies" }] },
      { id: "drink-spore-dew", icon: "💧", label: "CURIOUS • 💠 1", title: "Drink the silver spore-dew", description: "Gain 1 Dewshard and another copy of your selected guardian.", resultMessage: "Silver dew forms an echo of {guardian}.", effects: [{ type: "dewshards", amount: 1 }, { type: "guardianCopy", target: "selected", amount: 1 }, { type: "nextWave", hpMultiplier: 1.1, extraEnemies: 0, note: "Spore-dew dream: +1 {guardian} copy • enemies have 10% more health" }] },
    ],
  },
  {
    id: "fallen-star",
    icon: "🌠",
    title: "A fallen star in the reeds",
    description: "The fragment hums with a melody that only guardians seem to understand.",
    weight: 2,
    minChapter: 2,
    choices: [
      { id: "split-starlight", icon: "⚡", label: "POWER • 💠 2", title: "Split the starlight", description: "Gain 2 Dewshards and permanently increase guardian damage by 5%. The next wave has 3 extra enemies.", resultMessage: "Starlight settles into every guardian's heart.", effects: [{ type: "dewshards", amount: 2 }, { type: "blessing", blessingId: "warden", amount: 1 }, { type: "runDamageMultiplier", multiplier: 1.05 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 3, note: "Starwake: +5% guardian damage • 3 extra enemies" }] },
      { id: "reflect-guardian", icon: "🪞", label: "ECHO • 💠 1", title: "Show it your guardian", description: "Gain 1 Dewshard and another copy of your selected guardian. The next wave is normal.", resultMessage: "The star remembers {guardian} and creates a luminous echo.", effects: [{ type: "dewshards", amount: 1 }, { type: "guardianCopy", target: "selected", amount: 1 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 0, note: "Starlit echo: +1 {guardian} copy • normal enemy strength" }] },
    ],
  },
  {
    id: "gloom-toll",
    icon: "🔔",
    title: "The bell beneath the canopy",
    description: "A hollow bell asks for courage, then promises to repay it with forgotten treasure.",
    weight: 1,
    minChapter: 3,
    choices: [
      { id: "ring-the-bell", icon: "🔔", label: "DARING • 💠 2", title: "Ring the hollow bell", description: "Gain 2 Dewshards. The next wave has 50% more health.", resultMessage: "The bell wakes old power—and something deeper in the Gloom.", effects: [{ type: "dewshards", amount: 2 }, { type: "nextWave", hpMultiplier: 1.5, extraEnemies: 0, note: "Hollow toll: enemies have 50% more health" }] },
      { id: "muffle-the-bell", icon: "🌿", label: "CAREFUL • HEAL 4", title: "Muffle it with living vines", description: "Heal 4 objective health. The next wave has one extra enemy.", resultMessage: "The canopy quiets, and the Heart Tree breathes easier.", effects: [{ type: "heal", amount: 4 }, { type: "nextWave", hpMultiplier: 1, extraEnemies: 1, note: "Quiet canopy: +4 health • 1 extra enemy" }] },
    ],
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(event => [event.id, event])) as Record<string, EventDefinition>;

export function formatEventText(text: string, selectedName: string, rewardName = "a Tier 2 guardian") {
  return text.replaceAll("{guardian}", selectedName).replaceAll("{reward}", rewardName);
}

export function isEventEligible(event: EventDefinition, context: EventSelectionContext) {
  if (context.chapter < (event.minChapter ?? 1) || context.chapter > (event.maxChapter ?? Number.POSITIVE_INFINITY) || context.wave < (event.minWave ?? 1) || context.wave > (event.maxWave ?? Number.POSITIVE_INFINITY)) return false;
  if (event.repeatable === false && context.resolvedEventIds?.includes(event.id)) return false;
  return !(event.requirements ?? []).some(requirement => requirement.type === "unplacedGuardianCopy" && !context.unplacedGuardianIds?.length);
}

export function selectScheduledEvent(context: EventSelectionContext) {
  return EVENTS.find(event => isEventEligible(event, context) && event.scheduled?.some(schedule => schedule.wave === context.wave && (schedule.chapter === undefined || schedule.chapter === context.chapter))) ?? null;
}

function seededRandom({ chapter, wave, seed, recentEventIds }: EventSelectionContext) {
  let state = (seed ^ Math.imul(chapter, 0x9e3779b9) ^ Math.imul(wave, 0x85ebca6b)) >>> 0;
  for (const id of recentEventIds) for (const character of id) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function eligiblePoolEvents(context: EventSelectionContext) {
  return EVENTS.filter(event => event.pool !== false && isEventEligible(event, context));
}

export function choicesForEvent(event: EventDefinition, unplacedGuardians: Critter[]) {
  if (event.dynamicChoices !== "sendUnplacedGuardians") return event.choices;
  const sendChoices: EventChoiceDefinition[] = unplacedGuardians.map(guardian => ({
    id: `send-${guardian.id}`,
    icon: guardian.icon,
    label: "SEND FOR AID",
    title: `Send ${guardian.name}`,
    description: `${guardian.name} leaves your available copies for 2 completed waves, then returns with reinforcements.`,
    resultMessage: `${guardian.name} carries the call into the wilds.`,
    effects: [{ type: "sendGuardian", guardianId: guardian.id, waves: 2 }],
  }));
  return [...sendChoices, ...event.choices];
}

export function eligibleAidTierTwoGuardians(ownedIds: string[], guardianForms: Record<string, number>) {
  return CRITTERS.filter(critter => critter.tier === 2 && ownedIds.includes(critter.id) && (guardianForms[critter.id] || 0) === 0);
}

export function tierTwoAidReward(seed: number, chapter: number, wave: number, guardianId: string, candidateIds: string[]) {
  const candidates = CRITTERS.filter(critter => critter.tier === 2 && candidateIds.includes(critter.id));
  if (!candidates.length) return null;
  let state = (seed ^ Math.imul(chapter, 0x9e3779b9) ^ Math.imul(wave, 0x85ebca6b)) >>> 0;
  for (const character of guardianId) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return candidates[state % candidates.length];
}

export function selectPooledEvent(context: EventSelectionContext, random = seededRandom(context)) {
  const eligible = eligiblePoolEvents(context);
  if (!eligible.length) return null;
  const blocked = new Set(context.recentEventIds.slice(-2));
  const fresh = eligible.filter(event => !blocked.has(event.id));
  const candidates = fresh.length ? fresh : eligible;
  const totalWeight = candidates.reduce((total, event) => total + Math.max(0, event.weight), 0);
  if (totalWeight <= 0) return candidates[0];
  let roll = random() * totalWeight;
  for (const event of candidates) {
    roll -= Math.max(0, event.weight);
    if (roll < 0) return event;
  }
  return candidates.at(-1) ?? null;
}

export function selectEventForWave(context: EventSelectionContext) {
  return selectScheduledEvent(context) ?? selectPooledEvent(context);
}
