"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Critter = {
  id: string; name: string; title: string; icon: string; color: string;
  cost: number; damage: number; speed: number; range: number; rarity: "Common" | "Rare" | "Epic" | "Legendary"; skill: string;
  ability: "burn" | "waterSplash" | "slow" | "chain" | "shieldPierce" | "beam";
  tier: 1 | 2 | 3; starterEligible?: boolean; wishOnly?: boolean; upgradeOf?: string; evolutionPath?: "core" | "alternative"; sprite?: string;
};

type Enemy = { id: number; step: number; hp: number; maxHp: number; shield: number; maxShield: number; kind: string; icon: string; boss?: boolean; burnTicks?: number; burnDamage?: number; slowTicks?: number; slowFactor?: number };
type Tower = { slot: number; critter: Critter; cooldown: number; sourceId: string };
type EventChoice = "harvest" | "spring" | "warden";
type BossReward = "heartseed" | "embercore" | "starcharm";
type AttackFx = { id: number; from: number; to: number; color: string; critterId: string };
type CombatNumber = { id: number; cell: number; value: number; kind: "damage" | "heal" };
type StarterStats = { runs: number; victories: number; bossesDefeated: number; wavesCleared: number; highestChapter: number };
type ChapterConfig = { number: number; region: string; title: string; theme: string; path: number[]; slots: number[]; bossName: string; bossIcon: string; goalIcon: string; goalName: string };
type EnemyCodexEntry = { name: string; title: string; icon: string; chapter: string; role: string; defence: string; ability: string; color: string; boss?: boolean };
type RunSave = {
  version: 1 | 2; starterId: string; selected: string; chapter: number; wave: number;
  energy?: number; maxEnergy?: number; lives: number; dewshards: number;
  towers: { slot: number; critterId: string; sourceId?: string }[]; runUnlocked: string[]; guardianCopies?: Record<string, number>;
  mapSeed?: number;
  eventBuffs: { harvest: number; spring: number; warden: number }; starCharmCount: number;
  nextWaveNote: string; eventOpen: boolean; recruitChoices: string[]; bossRewardOpen: boolean;
  gameSpeed: 1 | 2; waveHpMultiplier: number; waveExtraEnemies: number;
  wavePetalBonus: number; runDamageMultiplier: number; savedAt: number;
};

const CRITTERS: Critter[] = [
  { id: "emberfox", name: "Emberfox", title: "Tiny Flame", icon: "🦊", color: "#ff8a5b", cost: 40, damage: 18, speed: 2, range: 2, rarity: "Common", tier: 1, starterEligible: true, ability: "burn", skill: "Kindle: burns its target for 20% damage over 3 ticks.", sprite: "./critters/emberfox-sprite.png" },
  { id: "bubblefin", name: "Bubblefin", title: "Puddle Pal", icon: "🐟", sprite: "./critters/bubblefin-sprite.png", color: "#54bde8", cost: 55, damage: 12, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, ability: "waterSplash", skill: "Bubble Burst: splashes its target and nearby enemies." },
  { id: "mossback", name: "Mossback", title: "Gentle Guard", icon: "🐢", sprite: "./critters/mossback-sprite.png", color: "#6fc174", cost: 65, damage: 32, speed: 5, range: 1, rarity: "Common", tier: 1, starterEligible: true, ability: "slow", skill: "Root Slam: slows its target by 45% for 4 ticks." },
  { id: "sparkit", name: "Sparkit", title: "Storm Kitten", icon: "🐱", sprite: "./critters/sparkit-sprite.png", color: "#f5c84b", cost: 75, damage: 23, speed: 3, range: 2, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "chain", skill: "Chain Spark: arcs to 2 additional enemies in range." },
  { id: "bloomwing", name: "Bloomwing", title: "Garden Sprite", icon: "🦋", sprite: "./critters/bloomwing-sprite.png", color: "#e982b5", cost: 80, damage: 28, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "shieldPierce", skill: "Petal Needle: pierces shields and strikes health directly." },
  { id: "moonowl", name: "Moonowl", title: "Star Watcher", icon: "🦉", sprite: "./critters/moonowl-sprite.png", color: "#9b88e8", cost: 95, damage: 48, speed: 5, range: 4, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "beam", skill: "Moonbeam: pierces up to 4 enemies with fading damage." },
  { id: "cinderpup", name: "Cinderpup", title: "Blazing Scout", icon: "🐕", color: "#f36f45", cost: 70, damage: 27, speed: 2, range: 2, rarity: "Rare", tier: 2, ability: "burn", skill: "Bright Kindle: burns for 25% damage over 4 ticks.", evolutionPath: "core", upgradeOf: "emberfox", sprite: "./critters/cinderpup-sprite.png" },
  { id: "ripplefin", name: "Ripplefin", title: "River Dancer", icon: "🐠", sprite: "./critters/ripplefin-sprite.png", color: "#3db6df", cost: 82, damage: 18, speed: 3, range: 3, rarity: "Rare", tier: 2, ability: "waterSplash", skill: "Ripple Burst: creates a wider splash with stronger secondary damage.", evolutionPath: "core", upgradeOf: "bubblefin" },
  { id: "thornshell", name: "Thornshell", title: "Bramble Bulwark", icon: "🦔", sprite: "./critters/thornshell-sprite.png", color: "#58a45f", cost: 92, damage: 45, speed: 4, range: 2, rarity: "Rare", tier: 2, ability: "slow", skill: "Bramble Slam: slows enemies by 53% for 5 ticks.", evolutionPath: "core", upgradeOf: "mossback" },
  { id: "voltlynx", name: "Voltlynx", title: "Thunder Prowler", icon: "🐈", sprite: "./critters/voltlynx-sprite.png", color: "#eab72f", cost: 100, damage: 33, speed: 3, range: 3, rarity: "Rare", tier: 2, ability: "chain", skill: "Forked Spark: chains to 3 additional enemies with stronger arcs.", evolutionPath: "core", upgradeOf: "sparkit" },
  { id: "briarwing", name: "Briarwing", title: "Thorn Dancer", icon: "🦋", sprite: "./critters/briarwing-sprite.png", color: "#d95d9d", cost: 105, damage: 40, speed: 3, range: 4, rarity: "Rare", tier: 2, ability: "shieldPierce", skill: "Briar Needle: bypasses shields and deals bonus damage to shielded foes.", evolutionPath: "core", upgradeOf: "bloomwing" },
  { id: "duskowl", name: "Duskowl", title: "Twilight Seer", icon: "🦉", sprite: "./critters/duskowl-sprite.png", color: "#7967cf", cost: 120, damage: 66, speed: 4, range: 4, rarity: "Rare", tier: 2, ability: "beam", skill: "Duskbeam: pierces 5 enemies and loses less damage between targets.", evolutionPath: "core", upgradeOf: "moonowl" },
  { id: "embermane", name: "Embermane", title: "Wildfire Heir", icon: "🐺", color: "#f04f45", cost: 112, damage: 40, speed: 2, range: 3, rarity: "Legendary", tier: 3, ability: "burn", skill: "Wildfire: burns for 30% damage over 5 ticks.", evolutionPath: "core", upgradeOf: "cinderpup", sprite: "./critters/embermane-sprite.png" },
  { id: "tidecaller", name: "Tidecaller", title: "Ocean Oracle", icon: "🐬", sprite: "./critters/tidecaller-sprite.png", color: "#279fd1", cost: 122, damage: 28, speed: 2, range: 4, rarity: "Legendary", tier: 3, ability: "waterSplash", skill: "Tidal Burst: creates the largest splash with powerful secondary damage.", evolutionPath: "core", upgradeOf: "ripplefin" },
  { id: "eldermoss", name: "Eldermoss", title: "Ancient Grove", icon: "🦕", sprite: "./critters/eldermoss-sprite.png", color: "#438f58", cost: 132, damage: 62, speed: 4, range: 2, rarity: "Legendary", tier: 3, ability: "slow", skill: "Worldroot Slam: slows its target by 60% for 6 ticks.", evolutionPath: "core", upgradeOf: "thornshell" },
  { id: "stormsabre", name: "Stormsabre", title: "Skyfang Regent", icon: "🐯", sprite: "./critters/stormsabre-sprite.png", color: "#d99b1f", cost: 138, damage: 48, speed: 2, range: 3, rarity: "Legendary", tier: 3, ability: "chain", skill: "Tempest Chain: arcs through 5 enemies while retaining most of its power.", evolutionPath: "core", upgradeOf: "voltlynx" },
  { id: "crownwing", name: "Crownwing", title: "Royal Petalblade", icon: "🦚", sprite: "./critters/crownwing-sprite.png", color: "#bd4b91", cost: 142, damage: 58, speed: 3, range: 4, rarity: "Legendary", tier: 3, ability: "shieldPierce", skill: "Crown Needle: ignores shields and punishes shielded enemies for 30% bonus damage.", evolutionPath: "core", upgradeOf: "briarwing" },
  { id: "celestowl", name: "Celestowl", title: "Astral Witness", icon: "🦅", sprite: "./critters/celestowl-sprite.png", color: "#6552bb", cost: 155, damage: 86, speed: 4, range: 5, rarity: "Legendary", tier: 3, ability: "beam", skill: "Starfall Beam: pierces 6 enemies with only slight damage falloff.", evolutionPath: "core", upgradeOf: "duskowl" },
];

const BOARD_SIZE = 8;
const WAVES_PER_CHAPTER = 10;
const META_SAVE_KEY = "critter-keepers-save";
const RUN_SAVE_KEY = "critter-keepers-run";
const STARTER_IDS = CRITTERS.filter(c => c.starterEligible).map(c => c.id);
const rootCritterId = (id: string): string => {
  const critter = CRITTERS.find(option => option.id === id);
  return critter?.upgradeOf ? rootCritterId(critter.upgradeOf) : id;
};
const starterBlessing = (id: string) => id === "emberfox" ? "+1 extra Emberfox copy" : id === "bubblefin" ? "+3 Heart Tree health" : id === "mossback" ? "+15% guardian damage" : id === "sparkit" ? "+1 attack speed for all guardians" : id === "bloomwing" ? "Enemy shields are 25% weaker" : "+1 range for all guardians";
const emptyStarterStats = (): Record<string, StarterStats> => Object.fromEntries(STARTER_IDS.map(id => [id, { runs: 0, victories: 0, bossesDefeated: 0, wavesCleared: 0, highestChapter: 0 }]));
const CHAPTERS: ChapterConfig[] = [
  {
    number: 1, region: "Sundew Meadow", title: "Whispers in the Clover", theme: "chapter-one",
    path: [8,9,10,11,19,27,26,25,24,32,40,41,42,43,44,36,28,20,21,22,23,31,39,47,46,45,53,54,55,63],
    slots: [2,5,13,17,30,34,38,49,51,60], bossName: "The Thornmaw", bossIcon: "🐲", goalIcon: "🌳", goalName: "HEART TREE",
  },
  {
    number: 2, region: "Moonpetal Marsh", title: "Lanterns in the Mist", theme: "chapter-two",
    path: [0,8,16,17,18,10,11,12,20,28,36,35,34,42,50,51,52,53,45,37,38,39,47,55,63],
    slots: [2,6,14,22,25,30,41,44,49,60], bossName: "The Mire Monarch", bossIcon: "🐙", goalIcon: "🪷", goalName: "MOON LOTUS",
  },
  {
    number: 3, region: "Starlight Canopy", title: "The Crown Above", theme: "chapter-three",
    path: [56,48,40,41,42,34,26,18,19,20,21,29,37,45,46,47,39,31,23,15,7],
    slots: [49,58,33,36,43,51,27,30,14,5], bossName: "The Hollow Crown", bossIcon: "👑", goalIcon: "💎", goalName: "STAR CRYSTAL",
  },
];

const ENEMY_SPRITES: Record<string, string> = {
  Gloomling: "./enemies/gloomling-sprite.png",
  "Bramble Brute": "./enemies/bramble-brute-sprite.png",
  "The Thornmaw": "./enemies/thornmaw-sprite.png",
  "The Mire Monarch": "./enemies/mire-monarch-sprite.png",
  "The Hollow Crown": "./enemies/hollow-crown-sprite.png",
};

const ENEMY_CODEX: EnemyCodexEntry[] = [
  { name: "Gloomling", title: "Restless Shadow", icon: "👾", chapter: "All chapters", role: "Common foe", defence: "No shield", ability: "Skitter: steady movement with no armour.", color: "#816d9d" },
  { name: "Bramble Brute", title: "Armoured Thicket", icon: "👹", chapter: "All chapters", role: "Shielded foe", defence: "Barkshield: 35% shield", ability: "Barkshield protects it until guardians break through the extra barrier.", color: "#71824e" },
  { name: "The Thornmaw", title: "Meadow Devourer", icon: "🐲", chapter: "Chapter 1 · Sundew Meadow", role: "Boss", defence: "Royal Ward: 20% shield", ability: "A colossal creature with exceptional health and a protective ward.", color: "#9a5b69", boss: true },
  { name: "The Mire Monarch", title: "Sovereign of the Mist", icon: "🐙", chapter: "Chapter 2 · Moonpetal Marsh", role: "Boss", defence: "Royal Ward: 20% shield", ability: "Rules the marsh with colossal health and a protective ward.", color: "#567d83", boss: true },
  { name: "The Hollow Crown", title: "Starless Usurper", icon: "👑", chapter: "Chapter 3 · Starlight Canopy", role: "Final boss", defence: "Royal Ward: 20% shield", ability: "The final guardian of the Gloom, fortified by colossal health and a protective ward.", color: "#6e588d", boss: true },
];

function generateChapterPath(seed: number, chapter: number) {
  if (!seed) return CHAPTERS[chapter - 1].path;
  let state = (seed ^ Math.imul(chapter, 0x9e3779b9)) >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  let row = Math.floor(random() * BOARD_SIZE);
  const basePath = [row * BOARD_SIZE];
  for (let column = 1; column < BOARD_SIZE; column++) {
    basePath.push(row * BOARD_SIZE + column);
    const candidates = [-2, -1, 1, 2].map(change => row + change).filter(nextRow => nextRow >= 0 && nextRow < BOARD_SIZE);
    const targetRow = candidates[Math.floor(random() * candidates.length)];
    while (row !== targetRow) {
      row += Math.sign(targetRow - row);
      basePath.push(row * BOARD_SIZE + column);
    }
  }
  const rotation = (seed + chapter) % 4;
  return basePath.map(cell => {
    const sourceRow = Math.floor(cell / BOARD_SIZE);
    const sourceColumn = cell % BOARD_SIZE;
    if (rotation === 1) return sourceColumn * BOARD_SIZE + (BOARD_SIZE - 1 - sourceRow);
    if (rotation === 2) return (BOARD_SIZE - 1 - sourceRow) * BOARD_SIZE + (BOARD_SIZE - 1 - sourceColumn);
    if (rotation === 3) return (BOARD_SIZE - 1 - sourceColumn) * BOARD_SIZE + sourceRow;
    return cell;
  });
}

const cellPoint = (cell: number) => ({
  x: (cell % BOARD_SIZE) * (100 / BOARD_SIZE) + 100 / BOARD_SIZE / 2,
  y: Math.floor(cell / BOARD_SIZE) * (100 / BOARD_SIZE) + 100 / BOARD_SIZE / 2,
});
const cellStyle = (cell: number) => {
  const point = cellPoint(cell);
  return { left: `${point.x}%`, top: `${point.y}%` } as React.CSSProperties;
};

function CritterArt({ critter, animated = false, attacking = false }: { critter: Critter; animated?: boolean; attacking?: boolean }) {
  if (!critter.sprite) return <span className="critterEmoji">{critter.icon}</span>;
  return <i className={`critterArt ${animated ? "animated" : ""} ${attacking ? "attacking" : ""}`} style={{ backgroundImage: `url(${critter.sprite})` }} role="img" aria-label={critter.name}/>;
}

function EnemyArt({ kind, icon, animated = false }: { kind: string; icon: string; animated?: boolean }) {
  const sprite = ENEMY_SPRITES[kind];
  if (!sprite) return <span className="enemyEmoji">{icon}</span>;
  return <i className={`enemyArt ${animated ? "animated" : ""}`} style={{ backgroundImage: `url(${sprite})` }} role="img" aria-label={kind}/>;
}

function LandmarkArt({ name, sprite }: { name: string; sprite: string }) {
  return <i className="landmarkArt animated" style={{ backgroundImage: `url(${sprite})` }} role="img" aria-label={name}/>;
}

export default function Home() {
  const [tab, setTab] = useState<"battle" | "collection" | "statistics" | "summon">("battle");
  const [owned, setOwned] = useState<string[]>([]);
  const [petals, setPetals] = useState(240);
  const [dewshards, setDewshards] = useState(0);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(0);
  const [chapter, setChapter] = useState(1);
  const [mapSeed, setMapSeed] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState("emberfox");
  const [message, setMessage] = useState("Choose a guardian, then place it on any tile away from the enemy path.");
  const [running, setRunning] = useState(false);
  const [summoned, setSummoned] = useState<Critter | null>(null);
  const [starterId, setStarterId] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [nextWaveNote, setNextWaveNote] = useState("No special conditions");
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [runUnlocked, setRunUnlocked] = useState<string[]>([]);
  const [guardianCopies, setGuardianCopies] = useState<Record<string, number>>({});
  const [recruitChoices, setRecruitChoices] = useState<Critter[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [attackFx, setAttackFx] = useState<AttackFx[]>([]);
  const [bossRewardOpen, setBossRewardOpen] = useState(false);
  const [adventureComplete, setAdventureComplete] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [inspectedTowerSlot, setInspectedTowerSlot] = useState<number | null>(null);
  const [combatNumbers, setCombatNumbers] = useState<CombatNumber[]>([]);
  const [stats, setStats] = useState<Record<string, StarterStats>>(emptyStarterStats);
  const [eventBuffs, setEventBuffs] = useState({ harvest: 0, spring: 0, warden: 0 });
  const [starCharmCount, setStarCharmCount] = useState(0);
  const enemyId = useRef(1);
  const attackId = useRef(1);
  const combatNumberId = useRef(1);
  const spawnQueue = useRef(0);
  const spawnTimer = useRef(0);
  const waveHpMultiplier = useRef(1);
  const waveExtraEnemies = useRef(0);
  const wavePetalBonus = useRef(0);
  const runDamageMultiplier = useRef(1);
  const activeChapter = CHAPTERS[chapter - 1];
  const activePath = useMemo(() => generateChapterPath(mapSeed, chapter), [mapSeed, chapter]);
  const placeableCells = useMemo(() => Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cell) => cell).filter(cell => !activePath.includes(cell)), [activePath]);

  useEffect(() => {
    const saved = localStorage.getItem(META_SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOwned(data.owned || owned);
        setPetals(data.petals ?? petals);
        if (data.stats) setStats({ ...emptyStarterStats(), ...data.stats });
      } catch { /* fresh save */ }
    }

    const savedRun = localStorage.getItem(RUN_SAVE_KEY);
    if (savedRun) {
      try {
        const data = JSON.parse(savedRun) as RunSave;
        const starter = CRITTERS.find(critter => critter.id === data.starterId && critter.starterEligible);
        if (!starter || ![1, 2].includes(data.version)) throw new Error("Invalid run save");
        const restoredChapter = Math.min(CHAPTERS.length, Math.max(1, Number(data.chapter) || 1));
        const restoredMapSeed = Math.max(0, Math.floor(Number(data.mapSeed) || 0));
        const restoredWave = Math.min(data.bossRewardOpen ? WAVES_PER_CHAPTER : WAVES_PER_CHAPTER - 1, Math.max(0, Number(data.wave) || 0));
        const unlockedIds = Array.from(new Set([starter.id, ...(data.runUnlocked || [])])).filter(id => CRITTERS.some(critter => critter.id === id));
        const restoredPath = generateChapterPath(restoredMapSeed, restoredChapter);
        const restoredTowers = (data.towers || []).map(tower => {
          const critter = CRITTERS.find(option => option.id === tower.critterId);
          const cell = data.version === 1 ? CHAPTERS[restoredChapter - 1].slots[tower.slot] : tower.slot;
          const sourceId = tower.sourceId && unlockedIds.includes(tower.sourceId) ? tower.sourceId : rootCritterId(tower.critterId);
          return critter && cell >= 0 && cell < BOARD_SIZE * BOARD_SIZE && !restoredPath.includes(cell) ? { slot: cell, critter, cooldown: 0, sourceId } : null;
        }).filter(Boolean) as Tower[];
        const restoredCopies = unlockedIds.reduce<Record<string, number>>((copies, id) => {
          const placed = restoredTowers.filter(tower => tower.sourceId === id).length;
          copies[id] = Math.max(1, Number(data.guardianCopies?.[id]) || 0, placed);
          return copies;
        }, {});
        setStarterId(starter.id);
        setSelected(CRITTERS.some(critter => critter.id === data.selected && unlockedIds.includes(critter.id)) ? data.selected : starter.id);
        setChapter(restoredChapter);
        setMapSeed(restoredMapSeed);
        setWave(restoredWave);
        setLives(Math.max(0, Number(data.lives) || 0));
        setDewshards(Math.max(0, Number(data.dewshards) || 0));
        setTowers(restoredTowers);
        setRunUnlocked(unlockedIds);
        setGuardianCopies(restoredCopies);
        setEventBuffs({ harvest: Math.max(0, data.eventBuffs?.harvest || 0), spring: Math.max(0, data.eventBuffs?.spring || 0), warden: Math.max(0, data.eventBuffs?.warden || 0) });
        setStarCharmCount(Math.max(0, Number(data.starCharmCount) || 0));
        setNextWaveNote(data.nextWaveNote || "No special conditions");
        setEventOpen(Boolean(data.eventOpen));
        setRecruitChoices((data.recruitChoices || []).map(id => CRITTERS.find(critter => critter.id === id)).filter(Boolean) as Critter[]);
        setBossRewardOpen(Boolean(data.bossRewardOpen));
        setGameSpeed(data.gameSpeed === 2 ? 2 : 1);
        waveHpMultiplier.current = Math.max(0.1, Number(data.waveHpMultiplier) || 1);
        waveExtraEnemies.current = Math.max(0, Number(data.waveExtraEnemies) || 0);
        wavePetalBonus.current = Math.max(0, Number(data.wavePetalBonus) || 0);
        runDamageMultiplier.current = Math.max(0.1, Number(data.runDamageMultiplier) || 1);
        setMessage(restoredWave ? `Saved run restored after Chapter ${restoredChapter}, Wave ${restoredWave}.` : `Saved run restored in Chapter ${restoredChapter}.`);
      } catch {
        localStorage.removeItem(RUN_SAVE_KEY);
      }
    }
    setSaveLoaded(true);
  }, []);

  useEffect(() => {
    if (saveLoaded) localStorage.setItem(META_SAVE_KEY, JSON.stringify({ owned, petals, stats }));
  }, [owned, petals, stats, saveLoaded]);

  useEffect(() => {
    if (!saveLoaded) return;
    if (!starterId || adventureComplete) {
      localStorage.removeItem(RUN_SAVE_KEY);
      return;
    }
    if (!running) saveRunState();
  }, [saveLoaded, starterId, selected, chapter, mapSeed, wave, lives, dewshards, towers, runUnlocked, guardianCopies, eventBuffs, starCharmCount, nextWaveNote, eventOpen, recruitChoices, bossRewardOpen, adventureComplete, gameSpeed, running]);

  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setInterval(() => {
      spawnTimer.current--;
      if (spawnQueue.current > 0 && spawnTimer.current <= 0) {
        const difficultyWave = (chapter - 1) * WAVES_PER_CHAPTER + wave;
        const boss = wave === WAVES_PER_CHAPTER && spawnQueue.current === 1;
        const tough = !boss && difficultyWave >= 3 && spawnQueue.current % 4 === 0;
        const hp = Math.round((boss ? 1200 + chapter * 800 : 58 + difficultyWave * 18 + (tough ? 55 : 0)) * waveHpMultiplier.current);
        const shield = Math.round(hp * (boss ? 0.2 : tough ? 0.35 : 0) * (starterId === "bloomwing" ? 0.75 : 1));
        setEnemies(es => [...es, { id: enemyId.current++, step: 0, hp, maxHp: hp, shield, maxShield: shield, kind: boss ? activeChapter.bossName : tough ? "Bramble Brute" : "Gloomling", icon: boss ? activeChapter.bossIcon : tough ? "👹" : "👾", boss }]);
        spawnQueue.current--;
        spawnTimer.current = 4;
      }

      setTowers(ts => ts.map(t => ({ ...t, cooldown: Math.max(0, t.cooldown - 1) })));
      setEnemies(current => {
        let next = current.map(e => {
          const burning = (e.burnTicks || 0) > 0;
          const burnDamage = burning ? e.burnDamage || 0 : 0;
          const currentCell = activePath[Math.min(activePath.length - 1, Math.floor(e.step))];
          if (burnDamage) addCombatNumber(currentCell, burnDamage, "damage");
          const shieldDamage = Math.min(e.shield, burnDamage);
          return { ...e, shield: e.shield - shieldDamage, hp: e.hp - (burnDamage - shieldDamage), burnTicks: Math.max(0, (e.burnTicks || 0) - 1), step: e.step + 0.14 * ((e.slowTicks || 0) > 0 ? 1 - (e.slowFactor || 0.45) : 1), slowTicks: Math.max(0, (e.slowTicks || 0) - 1) };
        });
        const escaped = next.filter(e => e.hp > 0 && e.step >= activePath.length - 1);
        if (escaped.length) setLives(v => Math.max(0, v - escaped.length));
        next = next.filter(e => e.hp <= 0 || e.step < activePath.length - 1);

        const readyTowers = towers.filter(t => t.cooldown <= 0);
        const fired: number[] = [];
        readyTowers.forEach(t => {
          const slotCell = t.slot;
          const targets = next.filter(e => e.hp > 0 && (() => {
            const targetCell = activePath[Math.floor(e.step)];
            const columnGap = targetCell % BOARD_SIZE - slotCell % BOARD_SIZE;
            const rowGap = Math.floor(targetCell / BOARD_SIZE) - Math.floor(slotCell / BOARD_SIZE);
            const effectiveRange = t.critter.range + (starterId === "moonowl" ? 1 : 0);
            return Math.hypot(columnGap, rowGap) <= effectiveRange + 0.65;
          })());
          const sortedTargets = targets.sort((a,b) => b.step - a.step);
          const target = sortedTargets[0];
          if (target) {
            const starterBoost = starterId === "mossback" ? 1.15 : 1;
            const baseDamage = Math.round(t.critter.damage * starterBoost * runDamageMultiplier.current);
            const abilityRank = t.critter.tier - 1;
            let hits: { enemy: Enemy; multiplier: number }[] = [{ enemy: target, multiplier: 1 }];
            if (t.critter.ability === "waterSplash") {
              const splashRadius = 1.6 + abilityRank * 0.35;
              const splashLimit = 4 + abilityRank;
              const splashDamage = 0.65 + abilityRank * 0.075;
              hits = sortedTargets.filter(enemy => Math.abs(enemy.step - target.step) <= splashRadius).slice(0, splashLimit).map((enemy, index) => ({ enemy, multiplier: index ? splashDamage : 1 }));
            } else if (t.critter.ability === "chain") {
              hits = sortedTargets.slice(0, 3 + abilityRank).map((enemy, index) => ({ enemy, multiplier: index ? 0.65 + abilityRank * 0.075 : 1 }));
            } else if (t.critter.ability === "beam") {
              hits = sortedTargets.slice(0, 4 + abilityRank).map((enemy, index) => ({ enemy, multiplier: Math.max(0.4, 1 - index * (0.18 - abilityRank * 0.03)) }));
            }
            if (t.critter.ability === "burn") {
              target.burnTicks = Math.max(target.burnTicks || 0, 3 + abilityRank);
              target.burnDamage = Math.max(target.burnDamage || 0, Math.round(baseDamage * (0.2 + abilityRank * 0.05)));
            } else if (t.critter.ability === "slow") {
              target.slowTicks = Math.max(target.slowTicks || 0, 4 + abilityRank);
              target.slowFactor = Math.max(target.slowFactor || 0, 0.45 + abilityRank * 0.075);
            }
            fired.push(t.slot);
            const newEffects: AttackFx[] = [];
            hits.forEach(hit => {
              const shieldPierceBonus = t.critter.ability === "shieldPierce" && hit.enemy.shield > 0 ? 1 + abilityRank * 0.15 : 1;
              const damage = Math.round(baseDamage * hit.multiplier * shieldPierceBonus);
              const targetCell = activePath[Math.min(activePath.length - 1, Math.floor(hit.enemy.step))];
              if (t.critter.ability === "shieldPierce") {
                hit.enemy.hp -= damage;
              } else {
                const shieldDamage = Math.min(hit.enemy.shield, damage);
                hit.enemy.shield -= shieldDamage;
                hit.enemy.hp -= damage - shieldDamage;
              }
              const fxId = attackId.current++;
              newEffects.push({ id: fxId, from: slotCell, to: targetCell, color: t.critter.color, critterId: t.critter.id });
              addCombatNumber(targetCell, damage, "damage");
              window.setTimeout(() => setAttackFx(fx => fx.filter(item => item.id !== fxId)), 520);
            });
            setAttackFx(fx => [...fx, ...newEffects]);
          }
        });
        if (fired.length) setTowers(ts => ts.map(t => fired.includes(t.slot) ? { ...t, cooldown: Math.max(1, t.critter.speed - (starterId === "sparkit" ? 1 : 0)) } : t));
        return next.filter(e => e.hp > 0);
      });
    }, 280 / gameSpeed);
    return () => clearInterval(timer);
  }, [running, towers, wave, starterId, paused, chapter, activeChapter, activePath, gameSpeed]);

  useEffect(() => {
    if (running && spawnQueue.current === 0 && enemies.length === 0) {
      const bossCleared = wave === WAVES_PER_CHAPTER;
      const reward = bossCleared ? 100 + chapter * 50 + wavePetalBonus.current + eventBuffs.harvest * 5 : 18 + wave * 3 + chapter * 5 + wavePetalBonus.current + eventBuffs.harvest * 5;
      setRunning(false);
      setPetals(p => p + reward);
      setMessage(bossCleared ? `${activeChapter.bossName} was defeated! Choose a relic before the journey continues.` : `Wave ${wave} cleared! Your critters found ${reward} petals.`);
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], wavesCleared: current[starterId].wavesCleared + 1, bossesDefeated: current[starterId].bossesDefeated + (bossCleared ? 1 : 0), highestChapter: Math.max(current[starterId].highestChapter, chapter) } }));
      wavePetalBonus.current = 0;
      if (bossCleared) {
        setBossRewardOpen(true);
      } else if (wave < WAVES_PER_CHAPTER) {
        if ([1, 3, 6].includes(wave)) {
          const available = CRITTERS.filter(c => c.tier === 1 && (!c.wishOnly || owned.includes(c.id))).sort((a, b) => Number(runUnlocked.includes(a.id)) - Number(runUnlocked.includes(b.id)));
          if (available.length) {
            const offset = wave === 3 && available.length > 3 ? 1 : 0;
            setRecruitChoices([...available.slice(offset, offset + 3), ...available.slice(0, offset)].slice(0, 3));
          } else {
            setEventOpen(true);
          }
        } else {
          setEventOpen(true);
        }
      }
    }
  }, [enemies, running, wave, runUnlocked, chapter, activeChapter, eventBuffs.harvest, starterId, owned]);

  useEffect(() => {
    if (lives <= 0) { setRunning(false); spawnQueue.current = 0; setMessage("The gloom reached the Heart Tree. Regroup and try again!"); }
  }, [lives]);

  const selectedCritter = CRITTERS.find(c => c.id === selected)!;
  const ownedCritters = useMemo(() => CRITTERS.filter(c => owned.includes(c.id)), [owned]);
  const runCritters = useMemo(() => CRITTERS.filter(c => runUnlocked.includes(c.id)), [runUnlocked]);
  const remainingCopies = (id: string) => Math.max(0, (guardianCopies[id] || 0) - towers.filter(tower => tower.sourceId === id).length);
  const starterCritter = CRITTERS.find(c => c.id === starterId);
  const starterChoices = CRITTERS.filter(c => c.starterEligible && (!c.wishOnly || owned.includes(c.id)));
  const inspectedTower = inspectedTowerSlot === null ? null : towers.find(t => t.slot === inspectedTowerSlot) || null;
  const inspectedEvolutions = inspectedTower ? CRITTERS.filter(c => c.upgradeOf === inspectedTower.critter.id && (c.evolutionPath === "core" || owned.includes(c.id))) : [];
  const statTotals = Object.values(stats).reduce((total, item) => ({ runs: total.runs + item.runs, victories: total.victories + item.victories, bosses: total.bosses + item.bossesDefeated, waves: total.waves + item.wavesCleared }), { runs: 0, victories: 0, bosses: 0, waves: 0 });
  const upcomingWave = Math.min(WAVES_PER_CHAPTER, wave + 1);
  const upcomingDifficulty = (chapter - 1) * WAVES_PER_CHAPTER + upcomingWave;
  const upcomingCount = upcomingWave === WAVES_PER_CHAPTER ? 1 : 5 + upcomingWave * 2 + waveExtraEnemies.current;
  const upcomingBrutes = upcomingWave === WAVES_PER_CHAPTER || upcomingDifficulty < 3 ? 0 : Array.from({ length: upcomingCount }, (_, index) => upcomingCount - index).filter(queue => queue % 4 === 0).length;
  const upcomingNormalHp = Math.round((58 + upcomingDifficulty * 18) * waveHpMultiplier.current);
  const upcomingEnemyIntel = upcomingWave === WAVES_PER_CHAPTER
    ? [{ icon: activeChapter.bossIcon, name: activeChapter.bossName, count: 1, hp: Math.round((1200 + chapter * 800) * waveHpMultiplier.current), shield: Math.round((1200 + chapter * 800) * waveHpMultiplier.current * 0.2 * (starterId === "bloomwing" ? 0.75 : 1)), ability: "Royal Ward: colossal health protected by a 20% shield." }]
    : [
        { icon: "👾", name: "Gloomling", count: upcomingCount - upcomingBrutes, hp: upcomingNormalHp, shield: 0, ability: "Skitter: steady movement with no armour." },
        ...(upcomingBrutes ? [{ icon: "👹", name: "Bramble Brute", count: upcomingBrutes, hp: Math.round((58 + upcomingDifficulty * 18 + 55) * waveHpMultiplier.current), shield: Math.round((58 + upcomingDifficulty * 18 + 55) * waveHpMultiplier.current * 0.35 * (starterId === "bloomwing" ? 0.75 : 1)), ability: "Barkshield: protected by a shield equal to 35% of its health." }] : []),
      ];
  const activeBuffs = [
    eventBuffs.harvest ? { icon: "🌸", name: `Moonbloom Covenant ×${eventBuffs.harvest}`, description: `+${eventBuffs.harvest * 5} petals after every wave` } : null,
    eventBuffs.spring ? { icon: "💧", name: `Echoing Spring ×${eventBuffs.spring}`, description: `${eventBuffs.spring} extra guardian ${eventBuffs.spring === 1 ? "copy" : "copies"} granted` } : null,
    eventBuffs.warden ? { icon: "🌳", name: `Oath of the Deep Roots ×${eventBuffs.warden}`, description: `+${eventBuffs.warden * 5}% guardian damage` } : null,
    starCharmCount ? { icon: "⭐", name: `Astral Guardian's Grace ×${starCharmCount}`, description: `+${starCharmCount * 25}% guardian damage` } : null,
  ].filter(Boolean) as { icon: string; name: string; description: string }[];

  function addCombatNumber(cell: number, value: number, kind: "damage" | "heal") {
    const id = combatNumberId.current++;
    setCombatNumbers(current => [...current, { id, cell, value, kind }]);
    window.setTimeout(() => setCombatNumbers(current => current.filter(number => number.id !== id)), 850);
  }

  function saveRunState(waveOverride = wave) {
    if (!starterId) return;
    const runSave: RunSave = {
      version: 2,
      starterId,
      selected,
      chapter,
      mapSeed,
      wave: waveOverride,
      lives,
      dewshards,
      towers: towers.map(tower => ({ slot: tower.slot, critterId: tower.critter.id, sourceId: tower.sourceId })),
      runUnlocked,
      guardianCopies,
      eventBuffs,
      starCharmCount,
      nextWaveNote,
      eventOpen,
      recruitChoices: recruitChoices.map(critter => critter.id),
      bossRewardOpen,
      gameSpeed,
      waveHpMultiplier: waveHpMultiplier.current,
      waveExtraEnemies: waveExtraEnemies.current,
      wavePetalBonus: wavePetalBonus.current,
      runDamageMultiplier: runDamageMultiplier.current,
      savedAt: Date.now(),
    };
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(runSave));
  }

  function chooseStarter(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    if (!critter.starterEligible || (critter.wishOnly && !owned.includes(id))) return;
    setStarterId(id);
    setMapSeed(Math.floor(Math.random() * 999999999) + 1);
    setSelected(id);
    setRunUnlocked([id]);
    setGuardianCopies({ [id]: id === "emberfox" ? 2 : 1 });
    setOwned(current => current.includes(id) ? current : [...current, id]);
    setLives(id === "bubblefin" ? 13 : 10);
    setStats(current => { const record = current[id] || emptyStarterStats()[id]; return { ...current, [id]: { ...record, runs: record.runs + 1, highestChapter: Math.max(1, record.highestChapter) } }; });
    setMessage(`${critter.name} has chosen you. Place your first guardian when you are ready!`);
  }

  function recruitGuardian(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    setRunUnlocked(current => current.includes(id) ? current : [...current, id]);
    setGuardianCopies(current => ({ ...current, [id]: (current[id] || 0) + 1 }));
    setSelected(id);
    setRecruitChoices([]);
    setNextWaveNote(`${critter.name} granted an extra guardian copy`);
    setMessage(`${critter.name} answered your call. You can place one additional copy for the rest of this run!`);
  }

  function openSettings() {
    setPaused(true);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    setPaused(false);
  }

  function closeTowerInfo() {
    setInspectedTowerSlot(null);
    setPaused(false);
  }

  function chooseEvent(choice: EventChoice) {
    if (choice === "harvest") {
      setPetals(p => p + 55);
      setDewshards(shards => shards + 2);
      setEventBuffs(buffs => ({ ...buffs, harvest: buffs.harvest + 1 }));
      waveHpMultiplier.current = 1.35;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 25;
      setNextWaveNote("Gloomblessing: enemies have 35% more health • +25 clear reward");
      setMessage("The Moonbloom Covenant blesses this run with 5 extra petals per clear.");
    } else if (choice === "spring") {
      setGuardianCopies(current => ({ ...current, [selected]: (current[selected] || 0) + 1 }));
      setDewshards(shards => shards + 1);
      setEventBuffs(buffs => ({ ...buffs, spring: buffs.spring + 1 }));
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 0;
      setNextWaveNote(`${selectedCritter.name}'s echo: +1 placeable copy • normal enemy strength`);
      setMessage(`The Echoing Spring created one additional ${selectedCritter.name} copy for this run.`);
    } else {
      setLives(l => Math.min(20, l + 2));
      addCombatNumber(activePath[activePath.length - 1], 2, "heal");
      setDewshards(shards => shards + 1);
      setEventBuffs(buffs => ({ ...buffs, warden: buffs.warden + 1 }));
      runDamageMultiplier.current *= 1.05;
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 3;
      wavePetalBonus.current = 20;
      setNextWaveNote("Root pact: +2 Heart Tree health • 3 extra enemies • +20 clear reward");
      setMessage("The Oath of the Deep Roots blesses every guardian with 5% additional damage.");
    }
    setEventOpen(false);
  }

  function chooseBossReward(reward: BossReward) {
    if (reward === "heartseed") {
      setLives(l => Math.min(20, l + 5));
      addCombatNumber(activePath[activePath.length - 1], 5, "heal");
      setMessage("The Ancient Heartseed strengthens your objective with 5 health.");
    } else if (reward === "embercore") {
      setGuardianCopies(current => Object.fromEntries(runUnlocked.map(id => [id, (current[id] || 0) + 1])));
      setMessage("The Twinflame Totem grants one additional copy of every guardian in your roster.");
    } else {
      runDamageMultiplier.current *= 1.25;
      setStarCharmCount(count => count + 1);
      setMessage("Astral Guardian's Grace grants every guardian 25% more damage for this run.");
    }
    setPetals(p => p + (chapter === CHAPTERS.length ? 150 : 75));
    setBossRewardOpen(false);

    if (chapter < CHAPTERS.length) {
      const nextChapter = CHAPTERS[chapter];
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], highestChapter: Math.max(current[starterId].highestChapter, chapter + 1) } }));
      setChapter(c => c + 1);
      setWave(0);
      setEnemies([]);
      setTowers([]);
      setAttackFx([]);
      setEventOpen(false);
      setRecruitChoices([]);
      setNextWaveNote("A new region awaits");
      spawnQueue.current = 0;
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 0;
      window.setTimeout(() => setMessage(`Chapter ${nextChapter.number}: ${nextChapter.region}. Place your guardians for the road ahead!`), 0);
    } else {
      setAdventureComplete(true);
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], victories: current[starterId].victories + 1 } }));
      setMessage("All three regions are safe. The Critter Keepers completed their adventure!");
    }
  }

  function startWave() {
    if (running || lives <= 0 || eventOpen || recruitChoices.length > 0 || bossRewardOpen || adventureComplete || !starterId) return;
    const next = wave + 1;
    saveRunState(wave);
    setWave(next);
    spawnQueue.current = next === WAVES_PER_CHAPTER ? 1 : 5 + next * 2 + waveExtraEnemies.current;
    spawnTimer.current = 0;
    setRunning(true);
    setMessage(next === WAVES_PER_CHAPTER ? `${activeChapter.bossName} has appeared—the boss battle begins!` : `Wave ${next} is rustling through ${activeChapter.region}…`);
  }

  function placeTower(slot: number) {
    if (towers.some(t => t.slot === slot)) { setInspectedTowerSlot(slot); setPaused(true); return; }
    if (activePath.includes(slot)) { setMessage("Guardians cannot be placed on the enemy path."); return; }
    if (remainingCopies(selected) <= 0) { setMessage(`All available ${selectedCritter.name} copies are already placed. Find another during an event.`); return; }
    setTowers(ts => [...ts, { slot, critter: selectedCritter, cooldown: 0, sourceId: selected }]); setMessage(`${selectedCritter.name} is ready to defend! Placement costs nothing.`);
  }

  function evolveTower(evolution: Critter) {
    if (!inspectedTower || !inspectedEvolutions.some(option => option.id === evolution.id)) return;
    const cost = inspectedTower.critter.tier === 1 ? 1 : 2;
    if (dewshards < cost) { setMessage(`${inspectedTower.critter.name} needs ${cost} Dewshard${cost === 1 ? "" : "s"} to evolve into ${evolution.name}.`); return; }
    setDewshards(shards => shards - cost);
    setTowers(current => current.map(tower => tower.slot === inspectedTower.slot ? { ...tower, critter: evolution, cooldown: 0 } : tower));
    setOwned(current => current.includes(evolution.id) ? current : [...current, evolution.id]);
    setMessage(`${inspectedTower.critter.name} evolved into ${evolution.name}!`);
  }

  function resetBattle() {
    localStorage.removeItem(RUN_SAVE_KEY);
    setEnemies([]); setTowers([]); setWave(0); setChapter(1);
    setLives(10);
    setDewshards(0);
    setRunning(false); setPaused(false); setSettingsOpen(false); setEventOpen(false); setRecruitChoices([]); setAttackFx([]); setCombatNumbers([]); setInspectedTowerSlot(null); setBossRewardOpen(false); setAdventureComplete(false); setNextWaveNote("No special conditions");
    setStarterId(null);
    setMapSeed(0);
    setRunUnlocked([]);
    setGuardianCopies({});
    setSelected("emberfox");
    setEventBuffs({ harvest: 0, spring: 0, warden: 0 }); setStarCharmCount(0);
    spawnQueue.current = 0; waveHpMultiplier.current = 1; waveExtraEnemies.current = 0; wavePetalBonus.current = 0; runDamageMultiplier.current = 1;
    setMessage("Choose a starter for your new adventure.");
  }

  function summon() {
    if (petals < 100) { setMessage("You need 100 petals for a new friendship."); return; }
    setPetals(p => p - 100);
    const pool = CRITTERS.filter(c => c.wishOnly && (c.tier === 1 || (c.tier === 2 && c.evolutionPath === "alternative" && (!c.upgradeOf || owned.includes(c.upgradeOf)))));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) { setPetals(p => p + 100); setMessage("The pond is quiet. More base guardians will arrive in a future update."); return; }
    setSummoned(pick);
    if (!owned.includes(pick.id)) setOwned(o => [...o, pick.id]); else setPetals(p => p + 35);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandMark">✿</span><div><b>Critter Keepers</b><small>Guardians of the Heart Tree</small></div></div>
        <nav aria-label="Game sections">
          <button className={tab === "battle" ? "active" : ""} onClick={() => setTab("battle")}>⚔ Meadow</button>
          <button className={tab === "collection" ? "active" : ""} onClick={() => setTab("collection")}>☘ Critterbook</button>
          <button className={tab === "statistics" ? "active" : ""} onClick={() => setTab("statistics")}>▥ Statistics</button>
          <button className={tab === "summon" ? "active" : ""} onClick={() => setTab("summon")}>✦ Wish Pond</button>
        </nav>
        <div className="currency resourceStat" tabIndex={0} data-tooltip="Moonpetals are permanent currency used to make wishes at the Wish Pond."><span>🌸</span><b>{petals}</b><small>petals</small></div>
        <button className="settingsButton" onClick={openSettings} aria-label="Open settings and pause game">⚙</button>
      </header>

      {saveLoaded && !starterId && <div className="choiceOverlay starterOverlay" role="dialog" aria-modal="true" aria-labelledby="starter-title">
        <section className="choicePanel starterPanel">
          <span className="eyebrow">CHOOSE YOUR STARTER</span>
          <h1 id="starter-title">Who will guard the Heart Tree?</h1>
          <p>Choose from your unlocked starting critters. Each companion grants a different blessing for this adventure.</p>
          <div className="starterChoices">
            {starterChoices.map(c => <button key={c.id} onClick={() => chooseStarter(c.id)} style={{"--accent": c.color} as React.CSSProperties}>
              <span className="starterPortrait"><CritterArt critter={c}/></span>
              <small>{c.title}</small><b>{c.name}</b>
              <em>{starterBlessing(c.id)}</em>
              <strong>Choose {c.name}</strong>
            </button>)}
          </div>
          <small className="choiceHint">Sparkit, Bloomwing, and Moonowl join this list after you discover them in the Wish Pond. Critterbook unlocks persist between runs.</small>
        </section>
      </div>}

      {tab === "battle" && <section className="battlePage">
        <div className="battleIntro"><div><span className="eyebrow">{activeChapter.region.toUpperCase()} • CHAPTER {chapter} OF {CHAPTERS.length}</span><h1>{activeChapter.title}</h1>{starterCritter && <div className="starterBadge"><span style={{background:starterCritter.color}}><CritterArt critter={starterCritter}/></span><small><b>{starterCritter.name}&apos;s blessing</b>{starterBlessing(starterCritter.id)}</small></div>}</div><div className="battleStats"><span className="resourceStat" tabIndex={0} data-tooltip="Objective health. You lose when it reaches zero.">❤️ <b>{lives}</b></span><span className="resourceStat shardStat" tabIndex={0} data-tooltip="Rare Dewshards come from events. Evolving Tier 1 to Tier 2 costs 1; Tier 2 to Tier 3 costs 2.">💠 <b>{dewshards}</b></span><span className="resourceStat" tabIndex={0} data-tooltip="Current wave in this chapter. Wave 10 is the boss.">🌙 <b>{wave}/{WAVES_PER_CHAPTER}</b></span>{mapSeed > 0 && <span className="resourceStat" tabIndex={0} data-tooltip="This seed recreates the same procedural maps when your run is restored.">🗺️ <b>#{String(mapSeed).slice(-5)}</b></span>}<button className={`speedButton ${gameSpeed === 2 ? "fast" : ""}`} onClick={() => setGameSpeed(speed => speed === 1 ? 2 : 1)} aria-label={`Set battle speed to ${gameSpeed === 1 ? "two times" : "normal"}`}>⏩ <b>{gameSpeed}×</b></button></div></div>
        <div className="gameShell">
          <div className={`field ${activeChapter.theme}`} aria-label={`${activeChapter.region} tower defence battlefield`}>
            <div className="sun"/><div className="cloud cloudOne">☁</div><div className="cloud cloudTwo">☁</div>
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => <div key={i} className={`cell terrain-${i % 4} ${activePath.includes(i) ? `path path-${activePath.indexOf(i) % 4}` : ""}`} />)}
            <div className="meadowDecor" aria-hidden="true">
              <i className="flower flowerOne"/><i className="flower flowerTwo"/><i className="flower flowerThree"/>
              <i className="mushroom mushroomOne"/><i className="mushroom mushroomTwo"/>
              <i className="pebbles pebblesOne"/><i className="pebbles pebblesTwo"/>
            </div>
            <div className="portal" style={cellStyle(activePath[0])}><LandmarkArt name="Gloom Gate" sprite="./landmarks/gloom-gate-sprite.png"/><small>GLOOM</small></div>
            <div className="tree" style={cellStyle(activePath[activePath.length - 1])}>{activeChapter.number === 1 ? <LandmarkArt name="Heart Tree" sprite="./landmarks/heart-tree-sprite.png"/> : <span>{activeChapter.goalIcon}</span>}<small>{activeChapter.goalName}</small></div>
            {placeableCells.map(cell => {
              const tower = towers.find(t => t.slot === cell);
              return <button key={cell} aria-label={tower ? `${tower.critter.name}, select for details` : `Place ${selectedCritter.name} here`} className={`towerSlot ${tower ? "filled" : "openTile"}`} onClick={() => placeTower(cell)} style={{...cellStyle(cell), ...(tower ? {"--critter": tower.critter.color} : {})} as React.CSSProperties}>
                {tower ? <><CritterArt critter={tower.critter} animated attacking={attackFx.some(fx => fx.from === cell && fx.critterId === tower.critter.id)}/><small>{tower.critter.name} • T{tower.critter.tier}</small></> : <><span>✦</span><small>PLACE</small></>}
              </button>;
            })}
            {enemies.map(e => { const p = activePath[Math.min(activePath.length - 1, Math.floor(e.step))]; return <div key={e.id} className={`enemy ${e.boss ? "boss" : ""}`} style={cellStyle(p)}>{e.boss && <small>BOSS</small>}<EnemyArt kind={e.kind} icon={e.icon} animated/>{e.maxShield > 0 && <i className="shieldBar"><b style={{width: `${Math.max(0,e.shield/e.maxShield*100)}%`}}/></i>}<i className="healthBar"><b style={{width: `${Math.max(0,e.hp/e.maxHp*100)}%`}}/></i></div>; })}
            {attackFx.map(fx => {
              const from = cellPoint(fx.from); const to = cellPoint(fx.to);
              return <i key={fx.id} className={`attackFx fx-${fx.critterId}`} style={{"--from-x":`${from.x}%`,"--from-y":`${from.y}%`,"--to-x":`${to.x}%`,"--to-y":`${to.y}%`,"--fx-color":fx.color} as React.CSSProperties}><b/></i>;
            })}
            {combatNumbers.map(number => <b key={number.id} className={`combatNumber ${number.kind}`} style={cellStyle(number.cell)}>{number.kind === "heal" ? "+" : "−"}{number.value}</b>)}
          </div>

          <aside className="sidePanel">
            <div className="guide"><span>🐭</span><p>{message}</p></div>
            <div className="rosterTitle"><b>Your guardians</b><small>Select one to place</small></div>
            <div className="roster">
              {runCritters.map(c => <button key={c.id} className={`${selected === c.id ? "selected" : ""} ${remainingCopies(c.id) === 0 ? "depleted" : ""}`} onClick={() => setSelected(c.id)}>
                <span className="portrait" style={{background: c.color}}><CritterArt critter={c}/></span><span><b>{c.name}</b><small>{c.title}</small></span><em>×{remainingCopies(c.id)} ready</em>
              </button>)}
            </div>
            <div className="selectedInfo"><span style={{background:selectedCritter.color}}><CritterArt critter={selectedCritter}/></span><div><b>{selectedCritter.skill}</b><small>Damage {selectedCritter.damage} • Range {selectedCritter.range} • {remainingCopies(selected)} available</small></div></div>
            <div className="buffPanel"><div className="buffTitle"><b>Run Blessings</b><small>Last until this run ends</small></div>{activeBuffs.length ? <div className="buffList">{activeBuffs.map(blessing => <span key={blessing.name}><i>{blessing.icon}</i><b>{blessing.name}</b><small>{blessing.description}</small></span>)}</div> : <p>No Blessings yet. Event decisions and relics can grant them.</p>}</div>
            {!running && wave < WAVES_PER_CHAPTER && !eventOpen && recruitChoices.length === 0 && !bossRewardOpen && <div className="scoutReport"><div className="scoutTitle"><span>🔭</span><div><small>SCOUT REPORT</small><b>Wave {upcomingWave}</b></div></div>{upcomingEnemyIntel.map(enemy => <article key={enemy.name}><EnemyArt kind={enemy.name} icon={enemy.icon}/><div><b>{enemy.name} ×{enemy.count}</b><small>{enemy.hp} HP{enemy.shield ? ` • ${enemy.shield} shield` : ""} each</small><p>{enemy.ability}</p></div></article>)}</div>}
            {wave > 0 && wave < WAVES_PER_CHAPTER && <div className={`waveCondition ${wave === WAVES_PER_CHAPTER - 1 ? "bossWarning" : ""}`}><small>{wave === WAVES_PER_CHAPTER - 1 ? "BOSS APPROACHING" : "NEXT WAVE"}</small><b>{wave === WAVES_PER_CHAPTER - 1 ? activeChapter.bossName : nextWaveNote}</b></div>}
            {lives > 0 ? <button className="primary" disabled={running || wave >= WAVES_PER_CHAPTER || eventOpen || recruitChoices.length > 0 || bossRewardOpen || adventureComplete || !starterId} onClick={startWave}>{running ? paused ? "Battle paused" : wave === WAVES_PER_CHAPTER ? "Boss battle in progress…" : "Wave in progress…" : recruitChoices.length ? "Recruit a guardian" : eventOpen ? "Choose a forest event" : bossRewardOpen ? "Choose your boss reward" : adventureComplete ? "Adventure complete!" : wave >= WAVES_PER_CHAPTER ? `${activeChapter.region} protected!` : wave === WAVES_PER_CHAPTER - 1 ? `Challenge ${activeChapter.bossName}` : `Begin wave ${wave + 1}`}</button> : <button className="primary" onClick={resetBattle}>Choose a new starter</button>}
            {wave > 0 && !running && <button className="textButton" onClick={resetBattle}>Restart with a new starter</button>}
          </aside>
        </div>
        {eventOpen && <div className="choiceOverlay eventOverlay" role="dialog" aria-modal="true" aria-labelledby="event-title">
          <section className="choicePanel eventPanel">
            <span className="eventIcon">🌙</span><span className="eyebrow">BETWEEN THE WAVES</span>
            <h1 id="event-title">Moonlight at the old crossroads</h1>
            <p>The forest offers three paths. Every gift has a consequence.</p>
            <div className="eventChoices">
              <button onClick={() => chooseEvent("harvest")}><span>🌸</span><div><small>RISKY • 💠 2</small><b>Harvest moonpetals</b><p>Gain 55 petals and 2 Dewshards. Permanently gain +5 petals per wave. The next wave has 35% more health.</p></div></button>
              <button onClick={() => chooseEvent("spring")}><span>💧</span><div><small>SAFE • 💠 1</small><b>Listen to the echoing spring</b><p>Gain 1 Dewshard and an additional copy of your currently selected guardian for this run.</p></div></button>
              <button onClick={() => chooseEvent("warden")}><span>🌳</span><div><small>TACTICAL • 💠 1</small><b>Make a root pact</b><p>Heal 2 objective health, gain 1 Dewshard, and permanently grant +5% guardian damage. Face 3 extra enemies next wave.</p></div></button>
            </div>
          </section>
        </div>}
        {recruitChoices.length > 0 && <div className="choiceOverlay recruitOverlay" role="dialog" aria-modal="true" aria-labelledby="recruit-title">
          <section className="choicePanel recruitPanel">
            <span className="eventIcon">✨</span><span className="eyebrow">A CALL FROM THE WILD</span>
            <h1 id="recruit-title">A guardian answers your call</h1>
            <p>Choose one guardian copy. New guardians join your roster; familiar guardians let you place an additional copy.</p>
            <div className="starterChoices recruitChoices">
              {recruitChoices.map(c => <button key={c.id} onClick={() => recruitGuardian(c.id)} style={{"--accent":c.color} as React.CSSProperties}>
                <span className="starterPortrait"><CritterArt critter={c}/></span><small>{c.rarity} • {runUnlocked.includes(c.id) ? "EXTRA COPY" : "NEW GUARDIAN"}</small><b>{c.name}</b><em>{c.skill}</em><strong>{runUnlocked.includes(c.id) ? `Gain another ${c.name}` : "Recruit for this run"}</strong>
              </button>)}
            </div>
          </section>
        </div>}
        {bossRewardOpen && <div className="choiceOverlay bossOverlay" role="dialog" aria-modal="true" aria-labelledby="boss-reward-title">
          <section className="choicePanel bossPanel">
            <span className="bossCrown">🏆</span><span className="eyebrow">CHAPTER {chapter} BOSS DEFEATED</span>
            <h1 id="boss-reward-title">Choose a relic from {activeChapter.bossName}</h1>
            <p>{chapter < CHAPTERS.length ? `Your reward will travel with you into Chapter ${chapter + 1}.` : "Choose your final treasure to complete this three-chapter adventure."} Every choice also grants bonus petals.</p>
            <div className="eventChoices bossChoices">
              <button onClick={() => chooseBossReward("heartseed")}><span>🌱</span><div><small>FORTIFY</small><b>Ancient Heartseed</b><p>Restore 5 objective health and gain {chapter === CHAPTERS.length ? 150 : 75} petals.</p></div></button>
              <button onClick={() => chooseBossReward("embercore")}><span>🔥</span><div><small>MULTIPLY</small><b>Twinflame Totem</b><p>Gain one additional copy of every guardian in your roster and {chapter === CHAPTERS.length ? 150 : 75} petals.</p></div></button>
              <button onClick={() => chooseBossReward("starcharm")}><span>⭐</span><div><small>EMPOWER</small><b>Star Charm</b><p>Guardians deal 25% more damage for this run and you gain {chapter === CHAPTERS.length ? 150 : 75} petals.</p></div></button>
            </div>
          </section>
        </div>}
        {inspectedTower && <div className="choiceOverlay towerInfoOverlay" role="dialog" aria-modal="true" aria-labelledby="tower-info-title">
          <section className="choicePanel towerInfoPanel" style={{"--accent": inspectedTower.critter.color} as React.CSSProperties}>
            <button className="closeInfo" onClick={closeTowerInfo} aria-label="Close tower information">×</button>
            <span className="towerInfoPortrait"><CritterArt critter={inspectedTower.critter}/></span><span className="eyebrow">PLACED GUARDIAN • {inspectedTower.critter.rarity} • TIER {inspectedTower.critter.tier}</span>
            <h1 id="tower-info-title">{inspectedTower.critter.name}</h1>
            <p>{inspectedTower.critter.title}</p>
            <div className="towerStatsGrid">
              <span><small>DAMAGE</small><b>{Math.round(inspectedTower.critter.damage * (starterId === "mossback" ? 1.15 : 1) * runDamageMultiplier.current)}</b></span>
              <span><small>RANGE</small><b>{inspectedTower.critter.range + (starterId === "moonowl" ? 1 : 0)} tiles</b></span>
              <span><small>ATTACK TEMPO</small><b>{Math.max(1, inspectedTower.critter.speed - (starterId === "sparkit" ? 1 : 0)) <= 2 ? "Fast" : inspectedTower.critter.speed <= 3 ? "Steady" : "Heavy"}</b></span>
            </div>
            <div className="abilityCard"><small>SPECIAL ABILITY</small><b>{inspectedTower.critter.skill}</b><p>Automatically targets the enemy furthest along the path within range.</p></div>
            {inspectedEvolutions.length ? <div className="evolutionButtons">{inspectedEvolutions.map(evolution => <button key={evolution.id} className="upgradeButton" onClick={() => evolveTower(evolution)}>{evolution.evolutionPath === "alternative" ? "Alternative: " : ""}Evolve into {evolution.name} • 💠 {inspectedTower.critter.tier === 1 ? 1 : 2}</button>)}</div> : <button className="upgradeButton" disabled>Final evolution reached</button>}
            <button className="primary" onClick={closeTowerInfo}>Return to battle</button>
          </section>
        </div>}
      </section>}

      {settingsOpen && <div className="choiceOverlay settingsOverlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <section className="choicePanel settingsPanel">
          <span className="settingsCog">⚙</span><span className="eyebrow">GAME PAUSED</span>
          <h1 id="settings-title">Meadow settings</h1>
          <p>The gloomlings will wait until you return.</p>
          <div className="settingsActions">
            <button className="primary" onClick={closeSettings}>{running ? "Resume battle" : "Return to game"}</button>
            <button className="restartButton" onClick={resetBattle}>Restart and choose a starter</button>
          </div>
          <small>Run progress saves automatically between waves. Restarting keeps petals and Critterbook discoveries, but clears the active run and temporary recruits.</small>
        </section>
      </div>}

      {tab === "collection" && <section className="bookPage">
        <div className="pageHeading"><span className="eyebrow">YOUR LIVING COLLECTION</span><h1>The Critterbook</h1><p>Every friendship adds a new leaf to the Heart Tree.</p></div>
        <div className="evolutionGuide"><span><b>Tier 1</b> Base forms and starting guardians</span><i>→ 💠 1</i><span><b>Tier 2</b> Evolved forms with stronger abilities</span><i>→ 💠 2</i><span><b>Tier 3</b> Final core evolutions</span><em>Place a guardian, select it, and spend Dewshards to evolve it during that run. Epic sidegrade paths will arrive later.</em></div>
        <div className="progressCard"><div><span>✿</span><b>{owned.length} of {CRITTERS.length} discovered</b></div><div className="progress"><i style={{width:`${owned.length/CRITTERS.length*100}%`}}/></div></div>
        <div className="cards">{CRITTERS.map((c, i) => { const unlocked = owned.includes(c.id); const baseCritter = c.upgradeOf ? CRITTERS.find(base => base.id === c.upgradeOf) : null; return <article key={c.id} className={!unlocked ? "locked" : ""} style={{"--accent": c.color} as React.CSSProperties}>
          <div className="cardTop"><small>NO. {String(i + 1).padStart(3, "0")}</small><span>{c.rarity} • TIER {c.tier}</span></div><div className="bigCritter">{unlocked ? <CritterArt critter={c}/> : "?"}</div><h2>{unlocked ? c.name : "Undiscovered"}</h2><p>{unlocked ? c.title : c.upgradeOf ? c.evolutionPath === "alternative" ? `An alternative form of ${baseCritter?.name || "a guardian"} waits in the Wish Pond…` : `Evolve ${baseCritter?.name || "the previous form"} during a run to discover this form…` : c.starterEligible ? "An unlockable starting guardian waits in the Wish Pond…" : "A mysterious friend waits nearby…"}</p>{unlocked && <div className="chips">{baseCritter && <span>✨ Evolves from {baseCritter.name}</span>}{c.evolutionPath === "alternative" && <span>✦ Alternative path</span>}<span>⚔ {c.damage}</span><span>◎ {c.range}</span></div>}
        </article>; })}</div>
        <section className="enemyBookSection" aria-labelledby="enemy-archive-title">
          <div className="enemyBookHeading"><span className="eyebrow">CREATURES OF THE GLOOM</span><h2 id="enemy-archive-title">Enemy Archive</h2><p>Study the foes threatening the Heart Tree. Enemy entries are field notes, not collectible guardians.</p></div>
          <div className="enemyCards">{ENEMY_CODEX.map((enemy, i) => <article key={enemy.name} className={enemy.boss ? "bossEntry" : ""} style={{"--accent": enemy.color} as React.CSSProperties}>
            <div className="cardTop"><small>FOE {String(i + 1).padStart(2, "0")}</small><span>{enemy.role}</span></div>
            <div className="enemyBookPortrait"><EnemyArt kind={enemy.name} icon={enemy.icon}/></div>
            <small className="enemyChapter">{enemy.chapter}</small><h3>{enemy.name}</h3><p className="enemyTitle">{enemy.title}</p>
            <div className="enemyTraits"><span><small>DEFENCE</small><b>{enemy.defence}</b></span><span><small>ABILITY</small><b>{enemy.ability}</b></span></div>
          </article>)}</div>
        </section>
      </section>}

      {tab === "statistics" && <section className="bookPage statsPage">
        <div className="pageHeading"><span className="eyebrow">YOUR ADVENTURE RECORD</span><h1>Keeper Statistics</h1><p>Run history is saved with your Critterbook on this device.</p></div>
        <div className="statSummary">
          <article><span>🧭</span><b>{statTotals.runs}</b><small>Runs started</small></article>
          <article><span>🏆</span><b>{statTotals.victories}</b><small>Full victories</small></article>
          <article><span>👑</span><b>{statTotals.bosses}</b><small>Bosses defeated</small></article>
          <article><span>🌙</span><b>{statTotals.waves}</b><small>Waves cleared</small></article>
        </div>
        <div className="starterRecords">
          {CRITTERS.filter(c => c.starterEligible).map(critter => { const record = stats[critter.id] || emptyStarterStats()[critter.id]; const unlocked = !critter.wishOnly || owned.includes(critter.id); const winRate = record.runs ? Math.round(record.victories / record.runs * 100) : 0; return <article key={critter.id} className={!unlocked ? "lockedRecord" : ""} style={{"--accent": critter.color} as React.CSSProperties}>
            <div className="recordGuardian"><span style={{background:unlocked ? critter.color : "#b8b9ae"}}>{unlocked ? <CritterArt critter={critter}/> : "?"}</span><div><small>{unlocked ? "STARTING GUARDIAN" : "WISH POND STARTER"}</small><h2>{unlocked ? critter.name : "Undiscovered"}</h2><p>{unlocked ? critter.title : "Unlock to choose for a future run"}</p></div></div>
            <div className="recordNumbers"><span><b>{record.runs}</b><small>Runs</small></span><span><b>{record.victories}</b><small>Victories</small></span><span><b>{winRate}%</b><small>Win rate</small></span><span><b>{record.highestChapter || "—"}</b><small>Best chapter</small></span><span><b>{record.bossesDefeated}</b><small>Bosses</small></span><span><b>{record.wavesCleared}</b><small>Waves</small></span></div>
          </article>; })}
        </div>
      </section>}

      {tab === "summon" && <section className="summonPage">
        <div className="pondScene"><div className="stars">✦　·　✧　·　✦</div><div className="moon">☾</div><div className="pond">{summoned ? <div className="reveal" style={{"--accent":summoned.color} as React.CSSProperties}><CritterArt critter={summoned}/><small>Tier {summoned.tier} {summoned.evolutionPath === "alternative" ? "alternative form" : "friend"}</small><h2>{summoned.name}</h2><p>{summoned.skill}</p></div> : <><span>✧</span><b>The Wish Pond</b><small>Make a wish and meet a woodland guardian</small></>}</div></div>
        <div className="wishPanel"><span className="eyebrow">A NEW FRIEND AWAITS</span><h1>Offer petals to the pond</h1><p>The Wish Pond unlocks new Tier 1 guardians and alternative Tier 2 forms. After an alternative form is discovered, it appears beside the normal evolution when you select its placed Tier 1 guardian. Normal evolutions never require a Wish Pond unlock. Duplicates return 35 petals.</p><div className="odds"><span>Tier 1 guardians <b>Base forms</b></span><span>Alternative Tier 2 <b>Wish unlocks</b></span></div><small className="futurePath">Alternative forms are balanced sidegrades with different strengths, not automatic replacements.</small><button className="primary wish" onClick={summon}>Wish for a friend <span>🌸 100</span></button><small>You have 🌸 {petals} petals</small></div>
      </section>}
      <footer><span>Prototype meadow • Progress saves on this device</span><span>Made with a little magic ✦</span></footer>
    </main>
  );
}
