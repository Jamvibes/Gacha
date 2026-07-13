"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Critter = {
  id: string; name: string; title: string; icon: string; color: string;
  cost: number; damage: number; speed: number; range: number; rarity: "Common" | "Rare" | "Epic" | "Legendary"; skill: string;
  ability: "burn" | "waterSplash" | "slow" | "chain" | "shieldPierce" | "beam";
  tier: 1 | 2 | 3; starterEligible?: boolean; wishOnly?: boolean; upgradeOf?: string; evolutionPath?: "core" | "alternative"; sprite?: string;
};

type Enemy = { id: number; step: number; hp: number; maxHp: number; shield: number; maxShield: number; kind: string; icon: string; boss?: boolean; burnTicks?: number; burnDamage?: number; slowTicks?: number; slowFactor?: number };
type Tower = { slot: number; critter: Critter; cooldown: number };
type EventChoice = "harvest" | "spring" | "warden";
type BossReward = "heartseed" | "embercore" | "starcharm";
type AttackFx = { id: number; from: number; to: number; color: string; critterId: string };
type CombatNumber = { id: number; cell: number; value: number; kind: "damage" | "heal" };
type StarterStats = { runs: number; victories: number; bossesDefeated: number; wavesCleared: number; highestChapter: number };
type ChapterConfig = { number: number; region: string; title: string; theme: string; path: number[]; slots: number[]; bossName: string; bossIcon: string; goalIcon: string; goalName: string };

const CRITTERS: Critter[] = [
  { id: "emberfox", name: "Emberfox", title: "Tiny Flame", icon: "🦊", color: "#ff8a5b", cost: 40, damage: 18, speed: 2, range: 2, rarity: "Common", tier: 1, starterEligible: true, ability: "burn", skill: "Kindle: burns its target for 20% damage over 3 ticks.", sprite: "./critters/emberfox-sprite.png" },
  { id: "bubblefin", name: "Bubblefin", title: "Puddle Pal", icon: "🐟", color: "#54bde8", cost: 55, damage: 12, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, ability: "waterSplash", skill: "Bubble Burst: splashes its target and nearby enemies." },
  { id: "mossback", name: "Mossback", title: "Gentle Guard", icon: "🐢", color: "#6fc174", cost: 65, damage: 32, speed: 5, range: 1, rarity: "Common", tier: 1, starterEligible: true, ability: "slow", skill: "Root Slam: slows its target by 45% for 4 ticks." },
  { id: "sparkit", name: "Sparkit", title: "Storm Kitten", icon: "🐱", color: "#f5c84b", cost: 75, damage: 23, speed: 3, range: 2, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "chain", skill: "Chain Spark: arcs to 2 additional enemies in range." },
  { id: "bloomwing", name: "Bloomwing", title: "Garden Sprite", icon: "🦋", color: "#e982b5", cost: 80, damage: 28, speed: 3, range: 3, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "shieldPierce", skill: "Petal Needle: pierces shields and strikes health directly." },
  { id: "moonowl", name: "Moonowl", title: "Star Watcher", icon: "🦉", color: "#9b88e8", cost: 95, damage: 48, speed: 5, range: 4, rarity: "Common", tier: 1, starterEligible: true, wishOnly: true, ability: "beam", skill: "Moonbeam: pierces up to 4 enemies with fading damage." },
  { id: "cinderpup", name: "Cinderpup", title: "Blazing Scout", icon: "🐕", color: "#f36f45", cost: 70, damage: 27, speed: 2, range: 2, rarity: "Rare", tier: 2, ability: "burn", skill: "Bright Kindle: burns for 25% damage over 4 ticks.", evolutionPath: "core", upgradeOf: "emberfox", sprite: "./critters/cinderpup-sprite.png" },
  { id: "ripplefin", name: "Ripplefin", title: "River Dancer", icon: "🐠", color: "#3db6df", cost: 82, damage: 18, speed: 3, range: 3, rarity: "Rare", tier: 2, ability: "waterSplash", skill: "Ripple Burst: creates a wider splash with stronger secondary damage.", evolutionPath: "core", upgradeOf: "bubblefin" },
  { id: "thornshell", name: "Thornshell", title: "Bramble Bulwark", icon: "🦔", color: "#58a45f", cost: 92, damage: 45, speed: 4, range: 2, rarity: "Rare", tier: 2, ability: "slow", skill: "Bramble Slam: slows enemies by 53% for 5 ticks.", evolutionPath: "core", upgradeOf: "mossback" },
  { id: "voltlynx", name: "Voltlynx", title: "Thunder Prowler", icon: "🐈", color: "#eab72f", cost: 100, damage: 33, speed: 3, range: 3, rarity: "Rare", tier: 2, ability: "chain", skill: "Forked Spark: chains to 3 additional enemies with stronger arcs.", evolutionPath: "core", upgradeOf: "sparkit" },
  { id: "briarwing", name: "Briarwing", title: "Thorn Dancer", icon: "🦋", color: "#d95d9d", cost: 105, damage: 40, speed: 3, range: 4, rarity: "Rare", tier: 2, ability: "shieldPierce", skill: "Briar Needle: bypasses shields and deals bonus damage to shielded foes.", evolutionPath: "core", upgradeOf: "bloomwing" },
  { id: "duskowl", name: "Duskowl", title: "Twilight Seer", icon: "🦉", color: "#7967cf", cost: 120, damage: 66, speed: 4, range: 4, rarity: "Rare", tier: 2, ability: "beam", skill: "Duskbeam: pierces 5 enemies and loses less damage between targets.", evolutionPath: "core", upgradeOf: "moonowl" },
  { id: "embermane", name: "Embermane", title: "Wildfire Heir", icon: "🐺", color: "#f04f45", cost: 112, damage: 40, speed: 2, range: 3, rarity: "Legendary", tier: 3, ability: "burn", skill: "Wildfire: burns for 30% damage over 5 ticks.", evolutionPath: "core", upgradeOf: "cinderpup", sprite: "./critters/embermane-sprite.png" },
  { id: "tidecaller", name: "Tidecaller", title: "Ocean Oracle", icon: "🐬", color: "#279fd1", cost: 122, damage: 28, speed: 2, range: 4, rarity: "Legendary", tier: 3, ability: "waterSplash", skill: "Tidal Burst: creates the largest splash with powerful secondary damage.", evolutionPath: "core", upgradeOf: "ripplefin" },
  { id: "eldermoss", name: "Eldermoss", title: "Ancient Grove", icon: "🦕", color: "#438f58", cost: 132, damage: 62, speed: 4, range: 2, rarity: "Legendary", tier: 3, ability: "slow", skill: "Worldroot Slam: slows its target by 60% for 6 ticks.", evolutionPath: "core", upgradeOf: "thornshell" },
  { id: "stormsabre", name: "Stormsabre", title: "Skyfang Regent", icon: "🐯", color: "#d99b1f", cost: 138, damage: 48, speed: 2, range: 3, rarity: "Legendary", tier: 3, ability: "chain", skill: "Tempest Chain: arcs through 5 enemies while retaining most of its power.", evolutionPath: "core", upgradeOf: "voltlynx" },
  { id: "crownwing", name: "Crownwing", title: "Royal Petalblade", icon: "🦚", color: "#bd4b91", cost: 142, damage: 58, speed: 3, range: 4, rarity: "Legendary", tier: 3, ability: "shieldPierce", skill: "Crown Needle: ignores shields and punishes shielded enemies for 30% bonus damage.", evolutionPath: "core", upgradeOf: "briarwing" },
  { id: "celestowl", name: "Celestowl", title: "Astral Witness", icon: "🦅", color: "#6552bb", cost: 155, damage: 86, speed: 4, range: 5, rarity: "Legendary", tier: 3, ability: "beam", skill: "Starfall Beam: pierces 6 enemies with only slight damage falloff.", evolutionPath: "core", upgradeOf: "duskowl" },
];

const BOARD_SIZE = 8;
const WAVES_PER_CHAPTER = 10;
const STARTER_IDS = CRITTERS.filter(c => c.starterEligible).map(c => c.id);
const starterBlessing = (id: string) => id === "emberfox" ? "+30 starting energy" : id === "bubblefin" ? "+3 Heart Tree health" : id === "mossback" ? "+15% guardian damage" : id === "sparkit" ? "+1 attack speed for all guardians" : id === "bloomwing" ? "Enemy shields are 25% weaker" : "+1 range for all guardians";
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

export default function Home() {
  const [tab, setTab] = useState<"battle" | "collection" | "statistics" | "summon">("battle");
  const [owned, setOwned] = useState<string[]>([]);
  const [petals, setPetals] = useState(240);
  const [energy, setEnergy] = useState(120);
  const [maxEnergy, setMaxEnergy] = useState(200);
  const [dewshards, setDewshards] = useState(0);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(0);
  const [chapter, setChapter] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState("emberfox");
  const [message, setMessage] = useState("Choose a critter, then tap a glowing meadow stone.");
  const [running, setRunning] = useState(false);
  const [summoned, setSummoned] = useState<Critter | null>(null);
  const [starterId, setStarterId] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [nextWaveNote, setNextWaveNote] = useState("No special conditions");
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [runUnlocked, setRunUnlocked] = useState<string[]>([]);
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
  const activePath = activeChapter.path;
  const activeSlots = activeChapter.slots;

  useEffect(() => {
    const saved = localStorage.getItem("critter-keepers-save");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOwned(data.owned || owned);
        setPetals(data.petals ?? petals);
        if (data.stats) setStats({ ...emptyStarterStats(), ...data.stats });
        setStarterId(data.starterId || null);
        if (data.starterId) {
          setSelected(data.starterId);
          setRunUnlocked([data.starterId]);
        }
      } catch { /* fresh save */ }
    }
    setSaveLoaded(true);
  }, []);

  useEffect(() => {
    if (saveLoaded) localStorage.setItem("critter-keepers-save", JSON.stringify({ owned, petals, starterId, stats }));
  }, [owned, petals, starterId, stats, saveLoaded]);

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
          const slotCell = activeSlots[t.slot];
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
        const defeated = next.filter(e => e.hp <= 0).length;
        if (defeated) setEnergy(v => Math.min(maxEnergy, v + defeated * 8));
        return next.filter(e => e.hp > 0);
      });
      setEnergy(v => Math.min(maxEnergy, v + 1));
    }, 280 / gameSpeed);
    return () => clearInterval(timer);
  }, [running, towers, wave, starterId, paused, chapter, activeChapter, activePath, activeSlots, gameSpeed, maxEnergy]);

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
          const available = CRITTERS.filter(c => c.tier === 1 && !runUnlocked.includes(c.id) && (!c.wishOnly || owned.includes(c.id)));
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
    eventBuffs.spring ? { icon: "💧", name: `Everflowing Spring ×${eventBuffs.spring}`, description: `+${eventBuffs.spring * 10} maximum energy` } : null,
    eventBuffs.warden ? { icon: "🌳", name: `Oath of the Deep Roots ×${eventBuffs.warden}`, description: `+${eventBuffs.warden * 5}% guardian damage` } : null,
    starCharmCount ? { icon: "⭐", name: `Astral Guardian's Grace ×${starCharmCount}`, description: `+${starCharmCount * 25}% guardian damage` } : null,
  ].filter(Boolean) as { icon: string; name: string; description: string }[];

  function addCombatNumber(cell: number, value: number, kind: "damage" | "heal") {
    const id = combatNumberId.current++;
    setCombatNumbers(current => [...current, { id, cell, value, kind }]);
    window.setTimeout(() => setCombatNumbers(current => current.filter(number => number.id !== id)), 850);
  }

  function chooseStarter(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    if (!critter.starterEligible || (critter.wishOnly && !owned.includes(id))) return;
    setStarterId(id);
    setSelected(id);
    setRunUnlocked([id]);
    setOwned(current => current.includes(id) ? current : [...current, id]);
    setMaxEnergy(200);
    setEnergy(id === "emberfox" ? 150 : 120);
    setLives(id === "bubblefin" ? 13 : 10);
    setStats(current => { const record = current[id] || emptyStarterStats()[id]; return { ...current, [id]: { ...record, runs: record.runs + 1, highestChapter: Math.max(1, record.highestChapter) } }; });
    setMessage(`${critter.name} has chosen you. Place your first guardian when you are ready!`);
  }

  function recruitGuardian(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    setRunUnlocked(current => current.includes(id) ? current : [...current, id]);
    setSelected(id);
    setRecruitChoices([]);
    setNextWaveNote(`${critter.name} joined this adventure`);
    setMessage(`${critter.name} heard your call and will fight for the rest of this run!`);
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
      setMaxEnergy(cap => cap + 10);
      setEnergy(e => Math.min(maxEnergy + 10, e + 50));
      setDewshards(shards => shards + 1);
      setEventBuffs(buffs => ({ ...buffs, spring: buffs.spring + 1 }));
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 0;
      setNextWaveNote("Springwater: +50 ember energy • normal enemy strength");
      setMessage("The Everflowing Spring blesses this run with 10 additional maximum energy.");
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
      setMaxEnergy(cap => Math.max(250, cap));
      setEnergy(e => Math.min(Math.max(250, maxEnergy), e + 100));
      setMessage("The Ember Core fills your guardians with 100 energy.");
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
    setWave(next);
    spawnQueue.current = next === WAVES_PER_CHAPTER ? 1 : 5 + next * 2 + waveExtraEnemies.current;
    spawnTimer.current = 0;
    setRunning(true);
    setMessage(next === WAVES_PER_CHAPTER ? `${activeChapter.bossName} has appeared—the boss battle begins!` : `Wave ${next} is rustling through ${activeChapter.region}…`);
  }

  function placeTower(slot: number) {
    if (towers.some(t => t.slot === slot)) { setInspectedTowerSlot(slot); setPaused(true); return; }
    if (energy < selectedCritter.cost) { setMessage(`Ember energy is too low. ${selectedCritter.name} needs ${selectedCritter.cost}.`); return; }
    setEnergy(v => v - selectedCritter.cost); setTowers(ts => [...ts, { slot, critter: selectedCritter, cooldown: 0 }]); setMessage(`${selectedCritter.name} is ready to defend!`);
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
    setEnemies([]); setTowers([]); setWave(0); setChapter(1);
    setLives(10);
    setEnergy(120);
    setMaxEnergy(200);
    setDewshards(0);
    setRunning(false); setPaused(false); setSettingsOpen(false); setEventOpen(false); setRecruitChoices([]); setAttackFx([]); setCombatNumbers([]); setInspectedTowerSlot(null); setBossRewardOpen(false); setAdventureComplete(false); setNextWaveNote("No special conditions");
    setStarterId(null);
    setRunUnlocked([]);
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
        <div className="battleIntro"><div><span className="eyebrow">{activeChapter.region.toUpperCase()} • CHAPTER {chapter} OF {CHAPTERS.length}</span><h1>{activeChapter.title}</h1>{starterCritter && <div className="starterBadge"><span style={{background:starterCritter.color}}><CritterArt critter={starterCritter}/></span><small><b>{starterCritter.name}&apos;s blessing</b>{starterBlessing(starterCritter.id)}</small></div>}</div><div className="battleStats"><span className="resourceStat" tabIndex={0} data-tooltip="Objective health. You lose when it reaches zero.">❤️ <b>{lives}</b></span><span className="resourceStat" tabIndex={0} data-tooltip={`Energy places guardians. You have ${energy} of ${maxEnergy}.`}>🔥 <b>{energy}</b></span><span className="resourceStat shardStat" tabIndex={0} data-tooltip="Rare Dewshards come from events. Evolving Tier 1 to Tier 2 costs 1; Tier 2 to Tier 3 costs 2.">💠 <b>{dewshards}</b></span><span className="resourceStat" tabIndex={0} data-tooltip="Current wave in this chapter. Wave 10 is the boss.">🌙 <b>{wave}/{WAVES_PER_CHAPTER}</b></span><button className={`speedButton ${gameSpeed === 2 ? "fast" : ""}`} onClick={() => setGameSpeed(speed => speed === 1 ? 2 : 1)} aria-label={`Set battle speed to ${gameSpeed === 1 ? "two times" : "normal"}`}>⏩ <b>{gameSpeed}×</b></button></div></div>
        <div className="gameShell">
          <div className={`field ${activeChapter.theme}`} aria-label={`${activeChapter.region} tower defence battlefield`}>
            <div className="sun"/><div className="cloud cloudOne">☁</div><div className="cloud cloudTwo">☁</div>
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => <div key={i} className={`cell terrain-${i % 4} ${activePath.includes(i) ? `path path-${activePath.indexOf(i) % 4}` : ""}`} />)}
            <div className="meadowDecor" aria-hidden="true">
              <i className="flower flowerOne"/><i className="flower flowerTwo"/><i className="flower flowerThree"/>
              <i className="mushroom mushroomOne"/><i className="mushroom mushroomTwo"/>
              <i className="pebbles pebblesOne"/><i className="pebbles pebblesTwo"/>
            </div>
            <div className="portal" style={cellStyle(activePath[0])}>🌀<small>GLOOM</small></div><div className="tree" style={cellStyle(activePath[activePath.length - 1])}>{activeChapter.goalIcon}<small>{activeChapter.goalName}</small></div>
            {activeSlots.map((cell, slot) => {
              const tower = towers.find(t => t.slot === slot);
              return <button key={cell} aria-label={tower ? tower.critter.name : "Empty defender stone"} className={`towerSlot ${tower ? "filled" : ""}`} onClick={() => placeTower(slot)} style={{...cellStyle(cell), ...(tower ? {"--critter": tower.critter.color} : {})} as React.CSSProperties}>
                {tower ? <><CritterArt critter={tower.critter} animated attacking={attackFx.some(fx => fx.from === cell && fx.critterId === tower.critter.id)}/><small>{tower.critter.name} • T{tower.critter.tier}</small></> : <><span>✦</span><small>PLACE</small></>}
              </button>;
            })}
            {enemies.map(e => { const p = activePath[Math.min(activePath.length - 1, Math.floor(e.step))]; return <div key={e.id} className={`enemy ${e.boss ? "boss" : ""}`} style={cellStyle(p)}>{e.boss && <small>BOSS</small>}<span>{e.icon}</span>{e.maxShield > 0 && <i className="shieldBar"><b style={{width: `${Math.max(0,e.shield/e.maxShield*100)}%`}}/></i>}<i className="healthBar"><b style={{width: `${Math.max(0,e.hp/e.maxHp*100)}%`}}/></i></div>; })}
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
              {runCritters.map(c => <button key={c.id} className={selected === c.id ? "selected" : ""} onClick={() => setSelected(c.id)}>
                <span className="portrait" style={{background: c.color}}><CritterArt critter={c}/></span><span><b>{c.name}</b><small>{c.title}</small></span><em>🔥 {c.cost}</em>
              </button>)}
            </div>
            <div className="selectedInfo"><span style={{background:selectedCritter.color}}><CritterArt critter={selectedCritter}/></span><div><b>{selectedCritter.skill}</b><small>Damage {selectedCritter.damage} • Range {selectedCritter.range}</small></div></div>
            <div className="buffPanel"><div className="buffTitle"><b>Run Blessings</b><small>Last until this run ends</small></div>{activeBuffs.length ? <div className="buffList">{activeBuffs.map(blessing => <span key={blessing.name}><i>{blessing.icon}</i><b>{blessing.name}</b><small>{blessing.description}</small></span>)}</div> : <p>No Blessings yet. Event decisions and relics can grant them.</p>}</div>
            {!running && wave < WAVES_PER_CHAPTER && !eventOpen && recruitChoices.length === 0 && !bossRewardOpen && <div className="scoutReport"><div className="scoutTitle"><span>🔭</span><div><small>SCOUT REPORT</small><b>Wave {upcomingWave}</b></div></div>{upcomingEnemyIntel.map(enemy => <article key={enemy.name}><span>{enemy.icon}</span><div><b>{enemy.name} ×{enemy.count}</b><small>{enemy.hp} HP{enemy.shield ? ` • ${enemy.shield} shield` : ""} each</small><p>{enemy.ability}</p></div></article>)}</div>}
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
              <button onClick={() => chooseEvent("spring")}><span>💧</span><div><small>SAFE • 💠 1</small><b>Rest by the spring</b><p>Restore 50 energy, gain 1 Dewshard, and permanently increase maximum energy by 10.</p></div></button>
              <button onClick={() => chooseEvent("warden")}><span>🌳</span><div><small>TACTICAL • 💠 1</small><b>Make a root pact</b><p>Heal 2 objective health, gain 1 Dewshard, and permanently grant +5% guardian damage. Face 3 extra enemies next wave.</p></div></button>
            </div>
          </section>
        </div>}
        {recruitChoices.length > 0 && <div className="choiceOverlay recruitOverlay" role="dialog" aria-modal="true" aria-labelledby="recruit-title">
          <section className="choicePanel recruitPanel">
            <span className="eventIcon">✨</span><span className="eyebrow">A CALL FROM THE WILD</span>
            <h1 id="recruit-title">A guardian offers to join this run</h1>
            <p>Choose one companion. They will remain in your battle roster until this adventure ends.</p>
            <div className="starterChoices recruitChoices">
              {recruitChoices.map(c => <button key={c.id} onClick={() => recruitGuardian(c.id)} style={{"--accent":c.color} as React.CSSProperties}>
                <span className="starterPortrait"><CritterArt critter={c}/></span><small>{c.rarity} • COST {c.cost}</small><b>{c.name}</b><em>{c.skill}</em><strong>Recruit for this run</strong>
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
              <button onClick={() => chooseBossReward("embercore")}><span>🔥</span><div><small>PREPARE</small><b>Ember Core</b><p>Restore 100 guardian energy and gain {chapter === CHAPTERS.length ? 150 : 75} petals.</p></div></button>
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
          <small>Restarting keeps petals and Critterbook discoveries, but resets the battle and temporary recruits.</small>
        </section>
      </div>}

      {tab === "collection" && <section className="bookPage">
        <div className="pageHeading"><span className="eyebrow">YOUR LIVING COLLECTION</span><h1>The Critterbook</h1><p>Every friendship adds a new leaf to the Heart Tree.</p></div>
        <div className="evolutionGuide"><span><b>Tier 1</b> Base forms and starting guardians</span><i>→ 💠 1</i><span><b>Tier 2</b> Evolved forms with stronger abilities</span><i>→ 💠 2</i><span><b>Tier 3</b> Final core evolutions</span><em>Place a guardian, select it, and spend Dewshards to evolve it during that run. Epic sidegrade paths will arrive later.</em></div>
        <div className="progressCard"><div><span>✿</span><b>{owned.length} of {CRITTERS.length} discovered</b></div><div className="progress"><i style={{width:`${owned.length/CRITTERS.length*100}%`}}/></div></div>
        <div className="cards">{CRITTERS.map((c, i) => { const unlocked = owned.includes(c.id); const baseCritter = c.upgradeOf ? CRITTERS.find(base => base.id === c.upgradeOf) : null; return <article key={c.id} className={!unlocked ? "locked" : ""} style={{"--accent": c.color} as React.CSSProperties}>
          <div className="cardTop"><small>NO. {String(i + 1).padStart(3, "0")}</small><span>{c.rarity} • TIER {c.tier}</span></div><div className="bigCritter">{unlocked ? <CritterArt critter={c}/> : "?"}</div><h2>{unlocked ? c.name : "Undiscovered"}</h2><p>{unlocked ? c.title : c.upgradeOf ? c.evolutionPath === "alternative" ? `An alternative form of ${baseCritter?.name || "a guardian"} waits in the Wish Pond…` : `Evolve ${baseCritter?.name || "the previous form"} during a run to discover this form…` : c.starterEligible ? "An unlockable starting guardian waits in the Wish Pond…" : "A mysterious friend waits nearby…"}</p>{unlocked && <div className="chips">{baseCritter && <span>✨ Evolves from {baseCritter.name}</span>}{c.evolutionPath === "alternative" && <span>✦ Alternative path</span>}<span>⚔ {c.damage}</span><span>◎ {c.range}</span>{c.tier === 1 && <span>🔥 {c.cost}</span>}</div>}
        </article>; })}</div>
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
