import type { ChapterConfig, Critter, StarterStats } from "./types.ts";

export const BOARD_SIZE = 8;
export const WAVES_PER_CHAPTER = 10;
export const META_SAVE_KEY = "critter-keepers-save";
export const RUN_SAVE_KEY = "critter-keepers-run";

export const CRITTERS: Critter[] = [
  { id: "emberfox", name: "Emberfox", title: "Tiny Flame", icon: "🦊", color: "#ff8a5b", cost: 40, damage: 18, speed: 2, range: 2, rarity: "Common", tier: 1, starterEligible: true, faction: "emberkin", ability: "burn", skill: "Kindle: burns its target for 20% damage over 3 ticks.", sprite: "./critters/emberfox-sprite.png" },
  { id: "bubblefin", name: "Bubblefin", title: "Puddle Pal", icon: "🐟", sprite: "./critters/bubblefin-sprite.png", color: "#54bde8", cost: 55, damage: 12, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, faction: "tidekin", ability: "splash", skill: "Bubble Burst: splashes its target and nearby enemies in a small area." },
  { id: "mossback", name: "Mossback", title: "Gentle Guard", icon: "🐢", sprite: "./critters/mossback-sprite.png", color: "#6fc174", cost: 65, damage: 32, speed: 5, range: 1, rarity: "Common", tier: 1, starterEligible: true, faction: "rootbound", ability: "slow", skill: "Root Slam: slows its target by 45% for 4 ticks." },
  { id: "sparkit", name: "Sparkit", title: "Storm Kitten", icon: "🐱", sprite: "./critters/sparkit-sprite.png", color: "#f5c84b", cost: 75, damage: 23, speed: 3, range: 2, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, faction: "stormborn", ability: "lightning", skill: "Chain Spark: arcs to 2 additional enemies, losing damage with every jump." },
  { id: "bloomwing", name: "Bloomwing", title: "Garden Sprite", icon: "🦋", sprite: "./critters/bloomwing-sprite.png", color: "#e982b5", cost: 80, damage: 28, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, faction: "cloudkin", ability: "push", skill: "Gust Bloom: pushes its target backwards along the path." },
  { id: "moonowl", name: "Moonowl", title: "Star Watcher", icon: "🦉", sprite: "./critters/moonowl-sprite.png", color: "#9b88e8", cost: 95, damage: 48, speed: 5, range: 4, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, faction: "starborn", ability: "piercing", skill: "Starlance: ignores shields and strikes health directly." },
  { id: "cinderpup", name: "Cinderpup", title: "Blazing Scout", icon: "🐕", color: "#f36f45", cost: 70, damage: 27, speed: 2, range: 2, rarity: "Rare", tier: 2, faction: "emberkin", ability: "burn", skill: "Bright Kindle: burns for 25% damage over 4 ticks.", evolutionPath: "core", upgradeOf: "emberfox", sprite: "./critters/cinderpup-sprite.png" },
  { id: "ripplefin", name: "Ripplefin", title: "River Dancer", icon: "🐠", sprite: "./critters/ripplefin-sprite.png", color: "#3db6df", cost: 82, damage: 18, speed: 3, range: 3, rarity: "Rare", tier: 2, faction: "tidekin", ability: "splash", skill: "Ripple Burst: creates a wider splash with stronger secondary damage.", evolutionPath: "core", upgradeOf: "bubblefin" },
  { id: "thornshell", name: "Thornshell", title: "Bramble Bulwark", icon: "🦔", sprite: "./critters/thornshell-sprite.png", color: "#58a45f", cost: 92, damage: 45, speed: 4, range: 2, rarity: "Rare", tier: 2, faction: "rootbound", ability: "slow", skill: "Bramble Slam: slows enemies by 53% for 5 ticks.", evolutionPath: "core", upgradeOf: "mossback" },
  { id: "voltlynx", name: "Voltlynx", title: "Thunder Prowler", icon: "🐈", sprite: "./critters/voltlynx-sprite.png", color: "#eab72f", cost: 100, damage: 33, speed: 3, range: 3, rarity: "Rare", tier: 2, faction: "stormborn", ability: "lightning", skill: "Forked Spark: chains to 3 additional enemies and retains more damage.", evolutionPath: "core", upgradeOf: "sparkit" },
  { id: "briarwing", name: "Briarwing", title: "Thorn Dancer", icon: "🦋", sprite: "./critters/briarwing-sprite.png", color: "#d95d9d", cost: 105, damage: 40, speed: 3, range: 4, rarity: "Rare", tier: 2, faction: "cloudkin", ability: "push", skill: "Briar Gust: pushes enemies farther backwards along the path.", evolutionPath: "core", upgradeOf: "bloomwing" },
  { id: "duskowl", name: "Duskowl", title: "Twilight Seer", icon: "🦉", sprite: "./critters/duskowl-sprite.png", color: "#7967cf", cost: 120, damage: 66, speed: 4, range: 4, rarity: "Rare", tier: 2, faction: "starborn", ability: "piercing", skill: "Dusk Lance: ignores shields and deals bonus damage to shielded foes.", evolutionPath: "core", upgradeOf: "moonowl" },
  { id: "embermane", name: "Embermane", title: "Wildfire Heir", icon: "🐺", color: "#f04f45", cost: 112, damage: 40, speed: 2, range: 3, rarity: "Legendary", tier: 3, faction: "emberkin", ability: "burn", skill: "Wildfire: burns for 30% damage over 5 ticks.", evolutionPath: "core", upgradeOf: "cinderpup", sprite: "./critters/embermane-sprite.png" },
  { id: "tidecaller", name: "Tidecaller", title: "Ocean Oracle", icon: "🐬", sprite: "./critters/tidecaller-sprite.png", color: "#279fd1", cost: 122, damage: 28, speed: 2, range: 4, rarity: "Legendary", tier: 3, faction: "tidekin", ability: "splash", skill: "Tidal Burst: creates the largest splash with powerful secondary damage.", evolutionPath: "core", upgradeOf: "ripplefin" },
  { id: "eldermoss", name: "Eldermoss", title: "Ancient Grove", icon: "🦕", sprite: "./critters/eldermoss-sprite.png", color: "#438f58", cost: 132, damage: 62, speed: 4, range: 2, rarity: "Legendary", tier: 3, faction: "rootbound", ability: "slow", skill: "Worldroot Slam: slows its target by 60% for 6 ticks.", evolutionPath: "core", upgradeOf: "thornshell" },
  { id: "stormsabre", name: "Stormsabre", title: "Skyfang Regent", icon: "🐯", sprite: "./critters/stormsabre-sprite.png", color: "#d99b1f", cost: 138, damage: 48, speed: 2, range: 3, rarity: "Legendary", tier: 3, faction: "stormborn", ability: "lightning", skill: "Tempest Chain: arcs through 5 enemies while retaining most of its power.", evolutionPath: "core", upgradeOf: "voltlynx" },
  { id: "crownwing", name: "Crownwing", title: "Royal Petalblade", icon: "🦚", sprite: "./critters/crownwing-sprite.png", color: "#bd4b91", cost: 142, damage: 58, speed: 3, range: 4, rarity: "Legendary", tier: 3, faction: "cloudkin", ability: "push", skill: "Crown Gale: powerfully pushes enemies backwards; bosses resist half the distance.", evolutionPath: "core", upgradeOf: "briarwing" },
  { id: "celestowl", name: "Celestowl", title: "Astral Witness", icon: "🦅", sprite: "./critters/celestowl-sprite.png", color: "#6552bb", cost: 155, damage: 86, speed: 4, range: 5, rarity: "Legendary", tier: 3, faction: "starborn", ability: "piercing", skill: "Starfall Lance: ignores shields and punishes shielded enemies for 30% bonus damage.", evolutionPath: "core", upgradeOf: "duskowl" },
];

export const CHAPTERS: ChapterConfig[] = [
  { number: 1, region: "Sundew Meadow", title: "Whispers in the Clover", theme: "chapter-one", path: [8,9,10,11,19,27,26,25,24,32,40,41,42,43,44,36,28,20,21,22,23,31,39,47,46,45,53,54,55,63], slots: [2,5,13,17,30,34,38,49,51,60], bossName: "The Thornmaw", bossIcon: "🐲", goalIcon: "🌳", goalName: "HEART TREE" },
  { number: 2, region: "Moonpetal Marsh", title: "Lanterns in the Mist", theme: "chapter-two", path: [0,8,16,17,18,10,11,12,20,28,36,35,34,42,50,51,52,53,45,37,38,39,47,55,63], slots: [2,6,14,22,25,30,41,44,49,60], bossName: "The Mire Monarch", bossIcon: "🐙", goalIcon: "🪷", goalName: "MOON LOTUS" },
  { number: 3, region: "Starlight Canopy", title: "The Crown Above", theme: "chapter-three", path: [56,48,40,41,42,34,26,18,19,20,21,29,37,45,46,47,39,31,23,15,7], slots: [49,58,33,36,43,51,27,30,14,5], bossName: "The Hollow Crown", bossIcon: "👑", goalIcon: "💎", goalName: "STAR CRYSTAL" },
];

export const STARTER_IDS = CRITTERS.filter(critter => critter.starterEligible).map(critter => critter.id);

export function rootCritterId(id: string): string {
  const critter = CRITTERS.find(option => option.id === id);
  return critter?.upgradeOf ? rootCritterId(critter.upgradeOf) : id;
}

export const starterBlessing = (id: string) => id === "emberfox" ? "+1 extra Emberfox copy" : id === "bubblefin" ? "+3 Heart Tree health" : id === "mossback" ? "+15% guardian damage" : id === "sparkit" ? "+1 attack speed for all guardians" : id === "bloomwing" ? "+1 range for all guardians" : "Enemy shields are 25% weaker";

export const emptyStarterStats = (): Record<string, StarterStats> => Object.fromEntries(STARTER_IDS.map(id => [id, { runs: 0, victories: 0, bossesDefeated: 0, wavesCleared: 0, highestChapter: 0 }]));
