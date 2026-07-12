"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Critter = {
  id: string; name: string; title: string; icon: string; color: string;
  cost: number; damage: number; speed: number; range: number; rarity: string; skill: string;
};

type Enemy = { id: number; step: number; hp: number; maxHp: number; kind: string; icon: string };
type Tower = { slot: number; critter: Critter; cooldown: number };

const CRITTERS: Critter[] = [
  { id: "emberfox", name: "Emberfox", title: "Tiny Flame", icon: "🦊", color: "#ff8a5b", cost: 40, damage: 18, speed: 2, range: 2, rarity: "Common", skill: "Fast little fireballs" },
  { id: "bubblefin", name: "Bubblefin", title: "Puddle Pal", icon: "🐟", color: "#54bde8", cost: 55, damage: 12, speed: 3, range: 3, rarity: "Common", skill: "Long-range bubbles" },
  { id: "mossback", name: "Mossback", title: "Gentle Guard", icon: "🐢", color: "#6fc174", cost: 65, damage: 32, speed: 5, range: 1, rarity: "Rare", skill: "Heavy seed bursts" },
  { id: "sparkit", name: "Sparkit", title: "Storm Kitten", icon: "🐱", color: "#f5c84b", cost: 75, damage: 23, speed: 3, range: 2, rarity: "Rare", skill: "Crackling chain bolts" },
  { id: "bloomwing", name: "Bloomwing", title: "Garden Sprite", icon: "🦋", color: "#e982b5", cost: 80, damage: 28, speed: 3, range: 3, rarity: "Epic", skill: "Petal storm" },
  { id: "moonowl", name: "Moonowl", title: "Star Watcher", icon: "🦉", color: "#9b88e8", cost: 95, damage: 48, speed: 5, range: 4, rarity: "Epic", skill: "Piercing moonbeam" },
];

const PATH = [8,9,10,11,19,27,26,25,24,32,33,34,35,36,28,20,21,22,23,31,39];
const SLOTS = [2, 5, 13, 17, 30, 38];

export default function Home() {
  const [tab, setTab] = useState<"battle" | "collection" | "summon">("battle");
  const [owned, setOwned] = useState<string[]>(["emberfox", "bubblefin", "mossback"]);
  const [petals, setPetals] = useState(240);
  const [energy, setEnergy] = useState(120);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selected, setSelected] = useState("emberfox");
  const [message, setMessage] = useState("Choose a critter, then tap a glowing meadow stone.");
  const [running, setRunning] = useState(false);
  const [summoned, setSummoned] = useState<Critter | null>(null);
  const enemyId = useRef(1);
  const spawnQueue = useRef(0);
  const spawnTimer = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("critter-keepers-save");
    if (saved) {
      try { const data = JSON.parse(saved); setOwned(data.owned || owned); setPetals(data.petals ?? petals); } catch { /* fresh save */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("critter-keepers-save", JSON.stringify({ owned, petals }));
  }, [owned, petals]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      spawnTimer.current--;
      if (spawnQueue.current > 0 && spawnTimer.current <= 0) {
        const tough = wave >= 3 && spawnQueue.current % 4 === 0;
        const hp = 58 + wave * 22 + (tough ? 55 : 0);
        setEnemies(es => [...es, { id: enemyId.current++, step: 0, hp, maxHp: hp, kind: tough ? "Bramble Brute" : "Gloomling", icon: tough ? "👹" : "👾" }]);
        spawnQueue.current--;
        spawnTimer.current = 4;
      }

      setTowers(ts => ts.map(t => ({ ...t, cooldown: Math.max(0, t.cooldown - 1) })));
      setEnemies(current => {
        let next = current.map(e => ({ ...e, step: e.step + 0.14 }));
        const escaped = next.filter(e => e.step >= PATH.length - 1);
        if (escaped.length) setLives(v => Math.max(0, v - escaped.length));
        next = next.filter(e => e.step < PATH.length - 1);

        const readyTowers = towers.filter(t => t.cooldown <= 0);
        const fired: number[] = [];
        readyTowers.forEach(t => {
          const slotCell = SLOTS[t.slot];
          const targets = next.filter(e => Math.abs(PATH[Math.floor(e.step)] - slotCell) <= t.critter.range * 5.2);
          const target = targets.sort((a,b) => b.step - a.step)[0];
          if (target) { target.hp -= t.critter.damage; fired.push(t.slot); }
        });
        if (fired.length) setTowers(ts => ts.map(t => fired.includes(t.slot) ? { ...t, cooldown: t.critter.speed } : t));
        const defeated = next.filter(e => e.hp <= 0).length;
        if (defeated) setEnergy(v => Math.min(200, v + defeated * 8));
        return next.filter(e => e.hp > 0);
      });
      setEnergy(v => Math.min(200, v + 1));
    }, 280);
    return () => clearInterval(timer);
  }, [running, towers, wave]);

  useEffect(() => {
    if (running && spawnQueue.current === 0 && enemies.length === 0) {
      setRunning(false); setPetals(p => p + 18 + wave * 3); setMessage(`Wave ${wave} cleared! Your critters found ${18 + wave * 3} petals.`);
    }
  }, [enemies, running, wave]);

  useEffect(() => {
    if (lives <= 0) { setRunning(false); spawnQueue.current = 0; setMessage("The gloom reached the Heart Tree. Regroup and try again!"); }
  }, [lives]);

  const selectedCritter = CRITTERS.find(c => c.id === selected)!;
  const ownedCritters = useMemo(() => CRITTERS.filter(c => owned.includes(c.id)), [owned]);

  function startWave() {
    if (running || lives <= 0) return;
    const next = wave + 1; setWave(next); spawnQueue.current = 5 + next * 2; spawnTimer.current = 0; setRunning(true); setMessage(`Wave ${next} is rustling through the woods…`);
  }

  function placeTower(slot: number) {
    if (towers.some(t => t.slot === slot)) { setMessage("That meadow stone already has a guardian."); return; }
    if (energy < selectedCritter.cost) { setMessage(`Ember energy is too low. ${selectedCritter.name} needs ${selectedCritter.cost}.`); return; }
    setEnergy(v => v - selectedCritter.cost); setTowers(ts => [...ts, { slot, critter: selectedCritter, cooldown: 0 }]); setMessage(`${selectedCritter.name} is ready to defend!`);
  }

  function resetBattle() { setEnemies([]); setTowers([]); setWave(0); setLives(10); setEnergy(120); setRunning(false); spawnQueue.current = 0; setMessage("A fresh adventure begins!"); }

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
      </header>

      {tab === "battle" && <section className="battlePage">
        <div className="battleIntro"><div><span className="eyebrow">SUNDEW MEADOW • CHAPTER 1</span><h1>Whispers in the Clover</h1></div><div className="battleStats"><span>❤️ <b>{lives}</b></span><span>🔥 <b>{energy}</b></span><span>🌙 <b>{wave}/5</b></span></div></div>
        <div className="gameShell">
          <div className="field" aria-label="Tower defence battlefield">
            <div className="sun"/><div className="cloud cloudOne">☁</div><div className="cloud cloudTwo">☁</div>
            {Array.from({ length: 40 }, (_, i) => <div key={i} className={`cell ${PATH.includes(i) ? "path" : ""}`} />)}
            <div className="portal start">🌀<small>GLOOM</small></div><div className="tree">🌳<small>HEART TREE</small></div>
            {SLOTS.map((cell, slot) => {
              const tower = towers.find(t => t.slot === slot);
              return <button key={cell} aria-label={tower ? tower.critter.name : "Empty defender stone"} className={`towerSlot pos-${cell} ${tower ? "filled" : ""}`} onClick={() => placeTower(slot)} style={tower ? {"--critter": tower.critter.color} as React.CSSProperties : undefined}>
                {tower ? <><span>{tower.critter.icon}</span><small>{tower.critter.name}</small></> : <><span>✦</span><small>PLACE</small></>}
              </button>;
            })}
            {enemies.map(e => { const p = PATH[Math.min(PATH.length - 1, Math.floor(e.step))]; return <div key={e.id} className={`enemy pos-${p}`}><span>{e.icon}</span><i><b style={{width: `${Math.max(0,e.hp/e.maxHp*100)}%`}}/></i></div>; })}
          </div>

          <aside className="sidePanel">
            <div className="guide"><span>🐭</span><p>{message}</p></div>
            <div className="rosterTitle"><b>Your guardians</b><small>Select one to place</small></div>
            <div className="roster">
              {ownedCritters.map(c => <button key={c.id} className={selected === c.id ? "selected" : ""} onClick={() => setSelected(c.id)}>
                <span className="portrait" style={{background: c.color}}>{c.icon}</span><span><b>{c.name}</b><small>{c.title}</small></span><em>🔥 {c.cost}</em>
              </button>)}
            </div>
            <div className="selectedInfo"><span style={{background:selectedCritter.color}}>{selectedCritter.icon}</span><div><b>{selectedCritter.skill}</b><small>Damage {selectedCritter.damage} • Range {selectedCritter.range}</small></div></div>
            {lives > 0 ? <button className="primary" disabled={running || wave >= 5} onClick={startWave}>{running ? "Wave in progress…" : wave >= 5 ? "Meadow protected!" : `Begin wave ${wave + 1}`}</button> : <button className="primary" onClick={resetBattle}>Try the meadow again</button>}
            {wave > 0 && !running && <button className="textButton" onClick={resetBattle}>Restart adventure</button>}
          </aside>
        </div>
      </section>}

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
