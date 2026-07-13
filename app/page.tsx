"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Critter = {
  id: string; name: string; title: string; icon: string; color: string;
  cost: number; damage: number; speed: number; range: number; rarity: string; skill: string;
};

type Enemy = { id: number; step: number; hp: number; maxHp: number; kind: string; icon: string; boss?: boolean };
type Tower = { slot: number; critter: Critter; cooldown: number };
type EventChoice = "harvest" | "spring" | "warden";
type BossReward = "heartseed" | "embercore" | "starcharm";
type AttackFx = { id: number; from: number; to: number; color: string; critterId: string };
type ChapterConfig = { number: number; region: string; title: string; theme: string; path: number[]; slots: number[]; bossName: string; bossIcon: string; goalIcon: string; goalName: string };

const CRITTERS: Critter[] = [
  { id: "emberfox", name: "Emberfox", title: "Tiny Flame", icon: "🦊", color: "#ff8a5b", cost: 40, damage: 18, speed: 2, range: 2, rarity: "Common", skill: "Fast little fireballs" },
  { id: "bubblefin", name: "Bubblefin", title: "Puddle Pal", icon: "🐟", color: "#54bde8", cost: 55, damage: 12, speed: 3, range: 3, rarity: "Common", skill: "Long-range bubbles" },
  { id: "mossback", name: "Mossback", title: "Gentle Guard", icon: "🐢", color: "#6fc174", cost: 65, damage: 32, speed: 5, range: 1, rarity: "Rare", skill: "Heavy seed bursts" },
  { id: "sparkit", name: "Sparkit", title: "Storm Kitten", icon: "🐱", color: "#f5c84b", cost: 75, damage: 23, speed: 3, range: 2, rarity: "Rare", skill: "Crackling chain bolts" },
  { id: "bloomwing", name: "Bloomwing", title: "Garden Sprite", icon: "🦋", color: "#e982b5", cost: 80, damage: 28, speed: 3, range: 3, rarity: "Epic", skill: "Petal storm" },
  { id: "moonowl", name: "Moonowl", title: "Star Watcher", icon: "🦉", color: "#9b88e8", cost: 95, damage: 48, speed: 5, range: 4, rarity: "Epic", skill: "Piercing moonbeam" },
];

const BOARD_SIZE = 8;
const WAVES_PER_CHAPTER = 10;
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

export default function Home() {
  const [tab, setTab] = useState<"battle" | "collection" | "summon">("battle");
  const [owned, setOwned] = useState<string[]>([]);
  const [petals, setPetals] = useState(240);
  const [energy, setEnergy] = useState(120);
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
  const enemyId = useRef(1);
  const attackId = useRef(1);
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
    if (saveLoaded) localStorage.setItem("critter-keepers-save", JSON.stringify({ owned, petals, starterId }));
  }, [owned, petals, starterId, saveLoaded]);

  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setInterval(() => {
      spawnTimer.current--;
      if (spawnQueue.current > 0 && spawnTimer.current <= 0) {
        const difficultyWave = (chapter - 1) * WAVES_PER_CHAPTER + wave;
        const boss = wave === WAVES_PER_CHAPTER && spawnQueue.current === 1;
        const tough = !boss && difficultyWave >= 3 && spawnQueue.current % 4 === 0;
        const hp = Math.round((boss ? 1200 + chapter * 800 : 58 + difficultyWave * 18 + (tough ? 55 : 0)) * waveHpMultiplier.current);
        setEnemies(es => [...es, { id: enemyId.current++, step: 0, hp, maxHp: hp, kind: boss ? activeChapter.bossName : tough ? "Bramble Brute" : "Gloomling", icon: boss ? activeChapter.bossIcon : tough ? "👹" : "👾", boss }]);
        spawnQueue.current--;
        spawnTimer.current = 4;
      }

      setTowers(ts => ts.map(t => ({ ...t, cooldown: Math.max(0, t.cooldown - 1) })));
      setEnemies(current => {
        let next = current.map(e => ({ ...e, step: e.step + 0.14 }));
        const escaped = next.filter(e => e.step >= activePath.length - 1);
        if (escaped.length) setLives(v => Math.max(0, v - escaped.length));
        next = next.filter(e => e.step < activePath.length - 1);

        const readyTowers = towers.filter(t => t.cooldown <= 0);
        const fired: number[] = [];
        readyTowers.forEach(t => {
          const slotCell = activeSlots[t.slot];
          const targets = next.filter(e => {
            const targetCell = activePath[Math.floor(e.step)];
            const columnGap = targetCell % BOARD_SIZE - slotCell % BOARD_SIZE;
            const rowGap = Math.floor(targetCell / BOARD_SIZE) - Math.floor(slotCell / BOARD_SIZE);
            return Math.hypot(columnGap, rowGap) <= t.critter.range + 0.65;
          });
          const target = targets.sort((a,b) => b.step - a.step)[0];
          if (target) {
            const starterBoost = starterId === "mossback" ? 1.15 : 1;
            target.hp -= Math.round(t.critter.damage * starterBoost * runDamageMultiplier.current);
            fired.push(t.slot);
            const fxId = attackId.current++;
            const targetCell = activePath[Math.min(activePath.length - 1, Math.floor(target.step))];
            setAttackFx(fx => [...fx, { id: fxId, from: slotCell, to: targetCell, color: t.critter.color, critterId: t.critter.id }]);
            window.setTimeout(() => setAttackFx(fx => fx.filter(item => item.id !== fxId)), 520);
          }
        });
        if (fired.length) setTowers(ts => ts.map(t => fired.includes(t.slot) ? { ...t, cooldown: t.critter.speed } : t));
        const defeated = next.filter(e => e.hp <= 0).length;
        if (defeated) setEnergy(v => Math.min(200, v + defeated * 8));
        return next.filter(e => e.hp > 0);
      });
      setEnergy(v => Math.min(200, v + 1));
    }, 280);
    return () => clearInterval(timer);
  }, [running, towers, wave, starterId, paused, chapter, activeChapter, activePath, activeSlots]);

  useEffect(() => {
    if (running && spawnQueue.current === 0 && enemies.length === 0) {
      const bossCleared = wave === WAVES_PER_CHAPTER;
      const reward = bossCleared ? 100 + chapter * 50 + wavePetalBonus.current : 18 + wave * 3 + chapter * 5 + wavePetalBonus.current;
      setRunning(false);
      setPetals(p => p + reward);
      setMessage(bossCleared ? `${activeChapter.bossName} was defeated! Choose a relic before the journey continues.` : `Wave ${wave} cleared! Your critters found ${reward} petals.`);
      wavePetalBonus.current = 0;
      if (bossCleared) {
        setBossRewardOpen(true);
      } else if (wave < WAVES_PER_CHAPTER) {
        if ([1, 3, 6].includes(wave)) {
          const available = CRITTERS.filter(c => !runUnlocked.includes(c.id));
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
  }, [enemies, running, wave, runUnlocked, chapter, activeChapter]);

  useEffect(() => {
    if (lives <= 0) { setRunning(false); spawnQueue.current = 0; setMessage("The gloom reached the Heart Tree. Regroup and try again!"); }
  }, [lives]);

  const selectedCritter = CRITTERS.find(c => c.id === selected)!;
  const ownedCritters = useMemo(() => CRITTERS.filter(c => owned.includes(c.id)), [owned]);
  const runCritters = useMemo(() => CRITTERS.filter(c => runUnlocked.includes(c.id)), [runUnlocked]);
  const starterCritter = CRITTERS.find(c => c.id === starterId);

  function chooseStarter(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    setStarterId(id);
    setSelected(id);
    setRunUnlocked([id]);
    setOwned(current => current.includes(id) ? current : [...current, id]);
    setEnergy(id === "emberfox" ? 150 : 120);
    setLives(id === "bubblefin" ? 13 : 10);
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

  function chooseEvent(choice: EventChoice) {
    if (choice === "harvest") {
      setPetals(p => p + 55);
      waveHpMultiplier.current = 1.35;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 25;
      setNextWaveNote("Gloomblessing: enemies have 35% more health • +25 clear reward");
      setMessage("You gathered the moonpetals. The gloom noticed—and grows stronger.");
    } else if (choice === "spring") {
      setEnergy(e => Math.min(200, e + 50));
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 0;
      setNextWaveNote("Springwater: +50 ember energy • normal enemy strength");
      setMessage("The spring restores your guardians' ember energy.");
    } else {
      setLives(l => Math.min(15, l + 2));
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 3;
      wavePetalBonus.current = 20;
      setNextWaveNote("Root pact: +2 Heart Tree health • 3 extra enemies • +20 clear reward");
      setMessage("The roots shield the Heart Tree, but their rumbling attracts more gloomlings.");
    }
    setEventOpen(false);
  }

  function chooseBossReward(reward: BossReward) {
    if (reward === "heartseed") {
      setLives(l => Math.min(20, l + 5));
      setMessage("The Ancient Heartseed strengthens your objective with 5 health.");
    } else if (reward === "embercore") {
      setEnergy(e => Math.min(250, e + 100));
      setMessage("The Ember Core fills your guardians with 100 energy.");
    } else {
      runDamageMultiplier.current *= 1.25;
      setMessage("The Star Charm grants every guardian 25% more damage for this run.");
    }
    setPetals(p => p + (chapter === CHAPTERS.length ? 150 : 75));
    setBossRewardOpen(false);

    if (chapter < CHAPTERS.length) {
      const nextChapter = CHAPTERS[chapter];
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
    if (towers.some(t => t.slot === slot)) { setMessage("That meadow stone already has a guardian."); return; }
    if (energy < selectedCritter.cost) { setMessage(`Ember energy is too low. ${selectedCritter.name} needs ${selectedCritter.cost}.`); return; }
    setEnergy(v => v - selectedCritter.cost); setTowers(ts => [...ts, { slot, critter: selectedCritter, cooldown: 0 }]); setMessage(`${selectedCritter.name} is ready to defend!`);
  }

  function resetBattle() {
    setEnemies([]); setTowers([]); setWave(0); setChapter(1);
    setLives(10);
    setEnergy(120);
    setRunning(false); setPaused(false); setSettingsOpen(false); setEventOpen(false); setRecruitChoices([]); setAttackFx([]); setBossRewardOpen(false); setAdventureComplete(false); setNextWaveNote("No special conditions");
    setStarterId(null);
    setRunUnlocked([]);
    setSelected("emberfox");
    spawnQueue.current = 0; waveHpMultiplier.current = 1; waveExtraEnemies.current = 0; wavePetalBonus.current = 0; runDamageMultiplier.current = 1;
    setMessage("Choose a starter for your new adventure.");
  }

  function summon() {
    if (petals < 100) { setMessage("You need 100 petals for a new friendship."); return; }
    setPetals(p => p - 100);
    const locked = CRITTERS.filter(c => !owned.includes(c.id));
    const pool = locked.length ? [...locked, ...CRITTERS.slice(0,3)] : CRITTERS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
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
          <button className={tab === "summon" ? "active" : ""} onClick={() => setTab("summon")}>✦ Wish Pond</button>
        </nav>
        <div className="currency"><span>🌸</span><b>{petals}</b><small>petals</small></div>
        <button className="settingsButton" onClick={openSettings} aria-label="Open settings and pause game">⚙</button>
      </header>

      {saveLoaded && !starterId && <div className="choiceOverlay starterOverlay" role="dialog" aria-modal="true" aria-labelledby="starter-title">
        <section className="choicePanel starterPanel">
          <span className="eyebrow">YOUR FIRST FRIEND</span>
          <h1 id="starter-title">Who will guard the Heart Tree?</h1>
          <p>Choose your starting critter. Each companion grants a different blessing for every meadow adventure.</p>
          <div className="starterChoices">
            {CRITTERS.slice(0, 3).map(c => <button key={c.id} onClick={() => chooseStarter(c.id)} style={{"--accent": c.color} as React.CSSProperties}>
              <span className="starterPortrait">{c.icon}</span>
              <small>{c.title}</small><b>{c.name}</b>
              <em>{c.id === "emberfox" ? "+30 starting energy" : c.id === "bubblefin" ? "+3 Heart Tree health" : "+15% guardian damage"}</em>
              <strong>Choose {c.name}</strong>
            </button>)}
          </div>
          <small className="choiceHint">Your Critterbook is saved on this device. Every new adventure lets you choose a starter again.</small>
        </section>
      </div>}

      {tab === "battle" && <section className="battlePage">
        <div className="battleIntro"><div><span className="eyebrow">{activeChapter.region.toUpperCase()} • CHAPTER {chapter} OF {CHAPTERS.length}</span><h1>{activeChapter.title}</h1>{starterCritter && <div className="starterBadge"><span style={{background:starterCritter.color}}>{starterCritter.icon}</span><small><b>{starterCritter.name}&apos;s blessing</b>{starterId === "emberfox" ? "+30 starting energy" : starterId === "bubblefin" ? "+3 Heart Tree health" : "+15% guardian damage"}</small></div>}</div><div className="battleStats"><span>❤️ <b>{lives}</b></span><span>🔥 <b>{energy}</b></span><span>🌙 <b>{wave}/{WAVES_PER_CHAPTER}</b></span></div></div>
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
                {tower ? <><span>{tower.critter.icon}</span><small>{tower.critter.name}</small></> : <><span>✦</span><small>PLACE</small></>}
              </button>;
            })}
            {enemies.map(e => { const p = activePath[Math.min(activePath.length - 1, Math.floor(e.step))]; return <div key={e.id} className={`enemy ${e.boss ? "boss" : ""}`} style={cellStyle(p)}>{e.boss && <small>BOSS</small>}<span>{e.icon}</span><i><b style={{width: `${Math.max(0,e.hp/e.maxHp*100)}%`}}/></i></div>; })}
            {attackFx.map(fx => {
              const from = cellPoint(fx.from); const to = cellPoint(fx.to);
              return <i key={fx.id} className={`attackFx fx-${fx.critterId}`} style={{"--from-x":`${from.x}%`,"--from-y":`${from.y}%`,"--to-x":`${to.x}%`,"--to-y":`${to.y}%`,"--fx-color":fx.color} as React.CSSProperties}><b/></i>;
            })}
          </div>

          <aside className="sidePanel">
            <div className="guide"><span>🐭</span><p>{message}</p></div>
            <div className="rosterTitle"><b>Your guardians</b><small>Select one to place</small></div>
            <div className="roster">
              {runCritters.map(c => <button key={c.id} className={selected === c.id ? "selected" : ""} onClick={() => setSelected(c.id)}>
                <span className="portrait" style={{background: c.color}}>{c.icon}</span><span><b>{c.name}</b><small>{c.title}</small></span><em>🔥 {c.cost}</em>
              </button>)}
            </div>
            <div className="selectedInfo"><span style={{background:selectedCritter.color}}>{selectedCritter.icon}</span><div><b>{selectedCritter.skill}</b><small>Damage {selectedCritter.damage} • Range {selectedCritter.range}</small></div></div>
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
              <button onClick={() => chooseEvent("harvest")}><span>🌸</span><div><small>RISKY</small><b>Harvest moonpetals</b><p>Gain 55 petals now. The next wave has 35% more health but rewards 25 extra petals.</p></div></button>
              <button onClick={() => chooseEvent("spring")}><span>💧</span><div><small>SAFE</small><b>Rest by the spring</b><p>Restore 50 ember energy. The next wave remains at normal strength.</p></div></button>
              <button onClick={() => chooseEvent("warden")}><span>🌳</span><div><small>TACTICAL</small><b>Make a root pact</b><p>Heal 2 Heart Tree health. Face 3 extra enemies for 20 bonus petals.</p></div></button>
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
                <span className="starterPortrait">{c.icon}</span><small>{c.rarity} • COST {c.cost}</small><b>{c.name}</b><em>{c.skill}</em><strong>Recruit for this run</strong>
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
        <div className="progressCard"><div><span>✿</span><b>{owned.length} of {CRITTERS.length} discovered</b></div><div className="progress"><i style={{width:`${owned.length/CRITTERS.length*100}%`}}/></div></div>
        <div className="cards">{CRITTERS.map((c, i) => { const unlocked = owned.includes(c.id); return <article key={c.id} className={!unlocked ? "locked" : ""} style={{"--accent": c.color} as React.CSSProperties}>
          <div className="cardTop"><small>NO. 00{i+1}</small><span>{c.rarity}</span></div><div className="bigCritter">{unlocked ? c.icon : "?"}</div><h2>{unlocked ? c.name : "Undiscovered"}</h2><p>{unlocked ? c.title : "A mysterious friend waits nearby…"}</p>{unlocked && <div className="chips"><span>⚔ {c.damage}</span><span>◎ {c.range}</span><span>🔥 {c.cost}</span></div>}
        </article>; })}</div>
      </section>}

      {tab === "summon" && <section className="summonPage">
        <div className="pondScene"><div className="stars">✦　·　✧　·　✦</div><div className="moon">☾</div><div className="pond">{summoned ? <div className="reveal" style={{"--accent":summoned.color} as React.CSSProperties}><span>{summoned.icon}</span><small>{summoned.rarity} friend</small><h2>{summoned.name}</h2><p>{owned.filter(x => x === summoned.id).length ? summoned.skill : "A new page joined your Critterbook!"}</p></div> : <><span>✧</span><b>The Wish Pond</b><small>Make a wish and meet a woodland guardian</small></>}</div></div>
        <div className="wishPanel"><span className="eyebrow">A NEW FRIEND AWAITS</span><h1>Offer petals to the pond</h1><p>Every wish reveals one critter. New friends join your Critterbook; duplicate friends return 35 petals.</p><div className="odds"><span>Common <b>55%</b></span><span>Rare <b>30%</b></span><span>Epic <b>15%</b></span></div><button className="primary wish" onClick={summon}>Wish for a friend <span>🌸 100</span></button><small>You have 🌸 {petals} petals</small></div>
      </section>}
      <footer><span>Prototype meadow • Progress saves on this device</span><span>Made with a little magic ✦</span></footer>
    </main>
  );
}
