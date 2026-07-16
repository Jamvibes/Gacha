"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BOARD_SIZE, CHAPTERS, CRITTERS, WAVES_PER_CHAPTER, emptyStarterStats, starterBlessing } from "./game/content";
import { BLESSINGS } from "./game/blessings";
import { BASE_CRITICAL_CHANCE, calculateHitDamage, pushBackDistance, rangeIndicatorDiameter, rollCritical, selectAbilityHits } from "./game/abilities";
import { EVENT_BY_ID, formatEventText, selectPooledEvent, selectScheduledEvent } from "./game/events";
import { FACTION_BY_ID, FACTIONS } from "./game/factions";
import { ENEMY_BY_ID, ENEMY_CODEX, ENEMY_SPRITES, applyHealerPulse, createEnemy, createSplitOffspring, type EnemyId } from "./game/enemies";
import { createWavePlan, groupWavePlan } from "./game/waves";
import { cellPoint, generateChapterPath, pathRouteClass } from "./game/map";
import { clearRunProgress, readMetaProgress, readRunProgress, writeMetaProgress, writeRunProgress } from "./game/save";
import { useRunState } from "./game/use-run-state";
import type { EventChoiceDefinition } from "./game/events";
import type { AttackFx, BossReward, CombatNumber, Critter, Enemy, StarterStats } from "./game/types";

type EnemyEffect = { id: number; cell: number; kind: "healPulse" | "splitBurst"; color: string };

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
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [message, setMessage] = useState("Choose a guardian, then place it on any tile away from the enemy path.");
  const [running, setRunning] = useState(false);
  const [summoned, setSummoned] = useState<Critter | null>(null);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [attackFx, setAttackFx] = useState<AttackFx[]>([]);
  const [inspectedTowerSlot, setInspectedTowerSlot] = useState<number | null>(null);
  const [hoveredTowerSlot, setHoveredTowerSlot] = useState<number | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<number | null>(null);
  const [enemyEffects, setEnemyEffects] = useState<EnemyEffect[]>([]);
  const [combatNumbers, setCombatNumbers] = useState<CombatNumber[]>([]);
  const [stats, setStats] = useState<Record<string, StarterStats>>(emptyStarterStats);
  const {
    state: { dewshards, lives, wave, chapter, mapSeed, mapVersion, towers, selected, starterId, eventOpen, nextWaveNote, runUnlocked, guardianCopies, recruitChoices, bossRewardOpen, adventureComplete, gameSpeed, blessings, activeEventId, recentEventIds, starCharmCount },
    setters: { setDewshards, setLives, setWave, setTowers, setSelected, setGuardianCopies, setGameSpeed, setStarCharmCount },
    actions: { restoreRun, startRun, recruitRunGuardian, resolveRunEvent, finishRunWave, enterRunChapter, completeRun, resetRun },
  } = useRunState();
  const enemyId = useRef(1);
  const attackId = useRef(1);
  const combatNumberId = useRef(1);
  const enemyEffectId = useRef(1);
  const spawnQueue = useRef<EnemyId[]>([]);
  const spawnTimer = useRef(0);
  const waveHpMultiplier = useRef(1);
  const waveExtraEnemies = useRef(0);
  const wavePetalBonus = useRef(0);
  const runDamageMultiplier = useRef(1);
  const activeChapter = CHAPTERS[chapter - 1];
  const activePath = useMemo(() => generateChapterPath(mapSeed, chapter, mapVersion), [mapSeed, chapter, mapVersion]);
  const placeableCells = useMemo(() => Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cell) => cell).filter(cell => !activePath.includes(cell)), [activePath]);

  useEffect(() => {
    const progress = readMetaProgress(localStorage);
    setOwned(progress.owned);
    setPetals(progress.petals);
    setStats(progress.stats);

    const restored = readRunProgress(localStorage);
    if (restored) {
      restoreRun(restored);
      waveHpMultiplier.current = restored.waveHpMultiplier;
      waveExtraEnemies.current = restored.waveExtraEnemies;
      wavePetalBonus.current = restored.wavePetalBonus;
      runDamageMultiplier.current = restored.runDamageMultiplier;
      setMessage(restored.wave ? `Saved run restored after Chapter ${restored.chapter}, Wave ${restored.wave}.` : `Saved run restored in Chapter ${restored.chapter}.`);
    }
    setSaveLoaded(true);
  }, []);

  useEffect(() => {
    if (saveLoaded) writeMetaProgress(localStorage, { owned, petals, stats });
  }, [owned, petals, stats, saveLoaded]);

  useEffect(() => {
    if (!saveLoaded) return;
    if (!starterId || adventureComplete) {
      clearRunProgress(localStorage);
      return;
    }
    if (!running) saveRunState();
  }, [saveLoaded, starterId, selected, chapter, mapSeed, mapVersion, wave, lives, dewshards, towers, runUnlocked, guardianCopies, blessings, activeEventId, recentEventIds, starCharmCount, nextWaveNote, eventOpen, recruitChoices, bossRewardOpen, adventureComplete, gameSpeed, running]);

  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setInterval(() => {
      spawnTimer.current--;
      const difficultyWave = (chapter - 1) * WAVES_PER_CHAPTER + wave;
      if (spawnQueue.current.length > 0 && spawnTimer.current <= 0) {
        const definition = ENEMY_BY_ID[spawnQueue.current.shift()!];
        setEnemies(es => [...es, createEnemy(definition, enemyId.current++, difficultyWave, chapter, waveHpMultiplier.current, starterId === "moonowl" ? 0.75 : 1)]);
        spawnTimer.current = definition.ability === "fast" ? 3 : 4;
      }

      setTowers(ts => ts.map(t => ({ ...t, cooldown: Math.max(0, t.cooldown - 1) })));
      setEnemies(current => {
        let next = current.map(e => {
          const burning = (e.burnTicks || 0) > 0;
          const burnDamage = burning ? e.burnDamage || 0 : 0;
          const currentCell = activePath[Math.min(activePath.length - 1, Math.floor(e.step))];
          if (burnDamage) addCombatNumber(currentCell, burnDamage, "damage");
          const shieldDamage = Math.min(e.shield, burnDamage);
          return { ...e, shield: e.shield - shieldDamage, hp: e.hp - (burnDamage - shieldDamage), burnTicks: Math.max(0, (e.burnTicks || 0) - 1), step: e.step + 0.14 * e.speedMultiplier * ((e.slowTicks || 0) > 0 ? 1 - (e.slowFactor || 0.45) : 1), slowTicks: Math.max(0, (e.slowTicks || 0) - 1) };
        });
        next.forEach(healer => {
          const healed = applyHealerPulse(next, healer);
          if (healed.length) addEnemyEffect(activePath[Math.min(activePath.length - 1, Math.floor(healer.step))], "healPulse", ENEMY_BY_ID[healer.definitionId as EnemyId].color);
          healed.forEach(({ enemy, amount }) => addCombatNumber(activePath[Math.min(activePath.length - 1, Math.floor(enemy.step))], amount, "heal"));
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
            const effectiveRange = t.critter.range + (starterId === "bloomwing" ? 1 : 0);
            return Math.hypot(columnGap, rowGap) <= effectiveRange + 0.65;
          })());
          const sortedTargets = targets.sort((a,b) => b.step - a.step);
          const target = sortedTargets[0];
          if (target) {
            const starterBoost = starterId === "mossback" ? 1.15 : 1;
            const baseDamage = Math.round(t.critter.damage * starterBoost * runDamageMultiplier.current);
            const abilityRank = t.critter.tier - 1;
            const hits = selectAbilityHits(t.critter.ability, t.critter.tier, next, sortedTargets, target, activePath);
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
              const piercing = t.critter.ability === "piercing";
              const piercingBonus = piercing && hit.enemy.shield > 0 ? 1 + abilityRank * 0.15 : 1;
              const critical = rollCritical();
              const damage = calculateHitDamage(baseDamage, hit.multiplier, critical, piercingBonus);
              const targetCell = activePath[Math.min(activePath.length - 1, Math.floor(hit.enemy.step))];
              if (piercing) {
                hit.enemy.hp -= damage;
              } else {
                const shieldDamage = Math.min(hit.enemy.shield, damage);
                hit.enemy.shield -= shieldDamage;
                hit.enemy.hp -= damage - shieldDamage;
              }
              const fxId = attackId.current++;
              newEffects.push({ id: fxId, from: slotCell, to: targetCell, color: t.critter.color, critterId: t.critter.id });
              addCombatNumber(targetCell, damage, "damage", critical);
              window.setTimeout(() => setAttackFx(fx => fx.filter(item => item.id !== fxId)), 520);
            });
            if (t.critter.ability === "push") target.step = Math.max(0, target.step - pushBackDistance(t.critter.tier, target.boss));
            setAttackFx(fx => [...fx, ...newEffects]);
          }
        });
        if (fired.length) setTowers(ts => ts.map(t => fired.includes(t.slot) ? { ...t, cooldown: Math.max(1, t.critter.speed - (starterId === "sparkit" ? 1 : 0)) } : t));
        const splitChildren: Enemy[] = [];
        next.forEach(parent => {
          const children = createSplitOffspring(parent, () => enemyId.current++, difficultyWave, chapter, waveHpMultiplier.current);
          if (children.length) addEnemyEffect(activePath[Math.min(activePath.length - 1, Math.floor(parent.step))], "splitBurst", ENEMY_BY_ID[parent.definitionId as EnemyId].color);
          splitChildren.push(...children);
        });
        return [...next.filter(e => e.hp > 0), ...splitChildren];
      });
    }, 280 / gameSpeed);
    return () => clearInterval(timer);
  }, [running, towers, wave, starterId, paused, chapter, activeChapter, activePath, gameSpeed]);

  useEffect(() => {
    if (running && spawnQueue.current.length === 0 && enemies.length === 0) {
      const bossCleared = wave === WAVES_PER_CHAPTER;
      const reward = bossCleared ? 100 + chapter * 50 + wavePetalBonus.current + blessings.harvest * 5 : 18 + wave * 3 + chapter * 5 + wavePetalBonus.current + blessings.harvest * 5;
      setRunning(false);
      setPetals(p => p + reward);
      setMessage(bossCleared ? `${activeChapter.bossName} was defeated! Choose a relic before the journey continues.` : `Wave ${wave} cleared! Your critters found ${reward} petals.`);
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], wavesCleared: current[starterId].wavesCleared + 1, bossesDefeated: current[starterId].bossesDefeated + (bossCleared ? 1 : 0), highestChapter: Math.max(current[starterId].highestChapter, chapter) } }));
      wavePetalBonus.current = 0;
      let choices: Critter[] = [];
      let eventId: string | null = null;
      const eventContext = { chapter, wave, seed: mapSeed, recentEventIds };
      const scheduledEvent = !bossCleared ? selectScheduledEvent(eventContext) : null;
      if (scheduledEvent) {
        eventId = scheduledEvent.id;
      } else if (!bossCleared && wave < WAVES_PER_CHAPTER && [1, 3, 6].includes(wave)) {
        const available = CRITTERS.filter(c => c.tier === 1 && (!c.wishOnly || owned.includes(c.id))).sort((a, b) => Number(runUnlocked.includes(a.id)) - Number(runUnlocked.includes(b.id)));
        const offset = wave === 3 && available.length > 3 ? 1 : 0;
        choices = [...available.slice(offset, offset + 3), ...available.slice(0, offset)].slice(0, 3);
      }
      if (!bossCleared && !eventId && !choices.length) eventId = selectPooledEvent(eventContext)?.id ?? null;
      finishRunWave(bossCleared, choices, eventId);
    }
  }, [enemies, running, wave, runUnlocked, chapter, activeChapter, blessings.harvest, starterId, owned, mapSeed, recentEventIds]);

  useEffect(() => {
    if (lives <= 0) { setRunning(false); spawnQueue.current = []; setMessage("The gloom reached the Heart Tree. Regroup and try again!"); }
  }, [lives]);

  const selectedCritter = CRITTERS.find(c => c.id === selected)!;
  const activeEvent = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const ownedCritters = useMemo(() => CRITTERS.filter(c => owned.includes(c.id)), [owned]);
  const runCritters = useMemo(() => CRITTERS.filter(c => runUnlocked.includes(c.id)), [runUnlocked]);
  const remainingCopies = (id: string) => Math.max(0, (guardianCopies[id] || 0) - towers.filter(tower => tower.sourceId === id).length);
  const starterCritter = CRITTERS.find(c => c.id === starterId);
  const starterChoices = CRITTERS.filter(c => c.starterEligible && (!c.wishOnly || owned.includes(c.id)));
  const inspectedTower = inspectedTowerSlot === null ? null : towers.find(t => t.slot === inspectedTowerSlot) || null;
  const inspectedEvolutions = inspectedTower ? CRITTERS.filter(c => c.upgradeOf === inspectedTower.critter.id && (c.evolutionPath === "core" || owned.includes(c.id))) : [];
  const statTotals = Object.values(stats).reduce((total, item) => ({ runs: total.runs + item.runs, victories: total.victories + item.victories, bosses: total.bosses + item.bossesDefeated, waves: total.waves + item.wavesCleared }), { runs: 0, victories: 0, bosses: 0, waves: 0 });
  const upcomingWave = Math.min(WAVES_PER_CHAPTER, wave + 1);
  const upcomingPlan = createWavePlan({ chapter, wave: upcomingWave, seed: mapSeed, extraEnemies: waveExtraEnemies.current });
  const upcomingEnemyIntel = groupWavePlan(upcomingPlan, waveHpMultiplier.current, starterId === "moonowl" ? 0.75 : 1).map(group => ({ icon: group.definition.icon, name: group.definition.name, count: group.count, hp: group.hp, shield: group.shield, ability: group.definition.abilityText }));
  const hoveredEnemy = enemies.find(enemy => enemy.id === hoveredEnemyId) || null;
  const hoveredEnemyDefinition = hoveredEnemy ? ENEMY_BY_ID[hoveredEnemy.definitionId as EnemyId] : null;
  const activeBuffs = [
    ...BLESSINGS.map(blessing => blessings[blessing.id] ? { icon: blessing.icon, name: `${blessing.name} ×${blessings[blessing.id]}`, description: blessing.description(blessings[blessing.id]) } : null),
    starCharmCount ? { icon: "⭐", name: `Astral Guardian's Grace ×${starCharmCount}`, description: `+${starCharmCount * 25}% guardian damage` } : null,
  ].filter(Boolean) as { icon: string; name: string; description: string }[];

  function addCombatNumber(cell: number, value: number, kind: "damage" | "heal", critical = false) {
    const id = combatNumberId.current++;
    setCombatNumbers(current => [...current, { id, cell, value, kind, critical }]);
    window.setTimeout(() => setCombatNumbers(current => current.filter(number => number.id !== id)), 850);
  }

  function addEnemyEffect(cell: number, kind: EnemyEffect["kind"], color: string) {
    const id = enemyEffectId.current++;
    setEnemyEffects(current => [...current, { id, cell, kind, color }]);
    window.setTimeout(() => setEnemyEffects(current => current.filter(effect => effect.id !== id)), 720);
  }

  function saveRunState(waveOverride = wave) {
    if (!starterId) return;
    writeRunProgress(localStorage, {
      starterId,
      selected,
      chapter,
      mapSeed,
      mapVersion,
      wave: waveOverride,
      lives,
      dewshards,
      towers: towers.map(tower => ({ slot: tower.slot, critterId: tower.critter.id, sourceId: tower.sourceId })),
      runUnlocked,
      guardianCopies,
      blessings,
      activeEventId,
      recentEventIds,
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
    });
  }

  function chooseStarter(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    if (!critter.starterEligible || (critter.wishOnly && !owned.includes(id))) return;
    startRun(id, Math.floor(Math.random() * 999999999) + 1);
    setOwned(current => current.includes(id) ? current : [...current, id]);
    setStats(current => { const record = current[id] || emptyStarterStats()[id]; return { ...current, [id]: { ...record, runs: record.runs + 1, highestChapter: Math.max(1, record.highestChapter) } }; });
    setMessage(`${critter.name} has chosen you. Place your first guardian when you are ready!`);
  }

  function recruitGuardian(id: string) {
    const critter = CRITTERS.find(c => c.id === id)!;
    recruitRunGuardian(critter);
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

  function chooseEvent(choice: EventChoiceDefinition) {
    resolveRunEvent(choice, selectedCritter.name);
    for (const effect of choice.effects) {
      if (effect.type === "petals") setPetals(petals => Math.max(0, petals + effect.amount));
      if (effect.type === "heal") addCombatNumber(activePath[activePath.length - 1], effect.amount, "heal");
      if (effect.type === "runDamageMultiplier") runDamageMultiplier.current *= effect.multiplier;
      if (effect.type === "nextWave") {
        waveHpMultiplier.current = effect.hpMultiplier;
        waveExtraEnemies.current = effect.extraEnemies;
        wavePetalBonus.current = effect.petalBonus;
      }
    }
    setMessage(formatEventText(choice.resultMessage, selectedCritter.name));
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

    if (chapter < CHAPTERS.length) {
      const nextChapter = CHAPTERS[chapter];
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], highestChapter: Math.max(current[starterId].highestChapter, chapter + 1) } }));
      enterRunChapter(chapter + 1);
      setEnemies([]);
      setAttackFx([]);
      spawnQueue.current = [];
      waveHpMultiplier.current = 1;
      waveExtraEnemies.current = 0;
      wavePetalBonus.current = 0;
      window.setTimeout(() => setMessage(`Chapter ${nextChapter.number}: ${nextChapter.region}. Place your guardians for the road ahead!`), 0);
    } else {
      completeRun();
      if (starterId) setStats(current => ({ ...current, [starterId]: { ...current[starterId], victories: current[starterId].victories + 1 } }));
      setMessage("All three regions are safe. The Critter Keepers completed their adventure!");
    }
  }

  function startWave() {
    if (running || lives <= 0 || eventOpen || recruitChoices.length > 0 || bossRewardOpen || adventureComplete || !starterId) return;
    const next = wave + 1;
    saveRunState(wave);
    setWave(next);
    spawnQueue.current = [...createWavePlan({ chapter, wave: next, seed: mapSeed, extraEnemies: waveExtraEnemies.current }).enemyIds];
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
    clearRunProgress(localStorage);
    resetRun();
    setEnemies([]);
    setRunning(false); setPaused(false); setSettingsOpen(false); setAttackFx([]); setCombatNumbers([]); setEnemyEffects([]); setHoveredEnemyId(null); setInspectedTowerSlot(null);
    spawnQueue.current = []; waveHpMultiplier.current = 1; waveExtraEnemies.current = 0; wavePetalBonus.current = 0; runDamageMultiplier.current = 1;
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
              <small>{FACTION_BY_ID[c.faction].icon} {FACTION_BY_ID[c.faction].name} • {c.title}</small><b>{c.name}</b>
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
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cell) => {
              const pathIndex = activePath.indexOf(cell);
              return <div key={cell} className={`cell terrain-${cell % 4} ${pathIndex >= 0 ? `path path-${pathIndex % 4} ${pathRouteClass(activePath, pathIndex)}` : ""}`} style={{"--cell-x": cell % BOARD_SIZE, "--cell-y": Math.floor(cell / BOARD_SIZE)} as React.CSSProperties}/>;
            })}
            <div className="meadowDecor" aria-hidden="true">
              <i className="flower flowerOne"/><i className="flower flowerTwo"/><i className="flower flowerThree"/>
              <i className="mushroom mushroomOne"/><i className="mushroom mushroomTwo"/>
              <i className="pebbles pebblesOne"/><i className="pebbles pebblesTwo"/>
            </div>
            <div className="portal" style={cellStyle(activePath[0])}><LandmarkArt name="Gloom Gate" sprite="./landmarks/gloom-gate-sprite.png"/><small>GLOOM</small></div>
            <div className="tree" style={cellStyle(activePath[activePath.length - 1])}>{activeChapter.number === 1 ? <LandmarkArt name="Heart Tree" sprite="./landmarks/heart-tree-sprite.png"/> : <span>{activeChapter.goalIcon}</span>}<small>{activeChapter.goalName}</small></div>
            {placeableCells.map(cell => {
              const tower = towers.find(t => t.slot === cell);
              const effectiveRange = tower ? tower.critter.range + (starterId === "bloomwing" ? 1 : 0) : 0;
              return <Fragment key={cell}>
                {tower && hoveredTowerSlot === cell && (
                  <i className="rangeIndicator" aria-hidden="true" style={{...cellStyle(cell), "--range-diameter": `${rangeIndicatorDiameter(effectiveRange, BOARD_SIZE)}%`, "--range-color": tower.critter.color} as React.CSSProperties}/>
                )}
                <button aria-label={tower ? `${tower.critter.name}, range ${effectiveRange} tiles, select for details` : `Place ${selectedCritter.name} here`} className={`towerSlot ${tower ? "filled" : "openTile"}`} onClick={() => placeTower(cell)} onMouseEnter={() => tower && setHoveredTowerSlot(cell)} onMouseLeave={() => setHoveredTowerSlot(current => current === cell ? null : current)} onFocus={() => tower && setHoveredTowerSlot(cell)} onBlur={() => setHoveredTowerSlot(current => current === cell ? null : current)} style={{...cellStyle(cell), ...(tower ? {"--critter": tower.critter.color} : {})} as React.CSSProperties}>
                  {tower ? <><CritterArt critter={tower.critter} animated attacking={attackFx.some(fx => fx.from === cell && fx.critterId === tower.critter.id)}/><small>{tower.critter.name} • T{tower.critter.tier}</small></> : <><span>✦</span><small>PLACE</small></>}
                </button>
              </Fragment>;
            })}
            {enemies.map(e => {
              const p = activePath[Math.min(activePath.length - 1, Math.floor(e.step))];
              const definition = ENEMY_BY_ID[e.definitionId as EnemyId];
              const statuses = [e.shield > 0 ? "🛡️" : null, (e.burnTicks || 0) > 0 ? "🔥" : null, (e.slowTicks || 0) > 0 ? "❄️" : null].filter(Boolean);
              return <div key={e.id} tabIndex={0} role="group" aria-label={`${e.kind}, ${definition.role}, ${Math.max(0, Math.ceil(e.hp))} health${e.shield > 0 ? `, ${Math.ceil(e.shield)} shield` : ""}`} onMouseEnter={() => setHoveredEnemyId(e.id)} onMouseLeave={() => setHoveredEnemyId(current => current === e.id ? null : current)} onFocus={() => setHoveredEnemyId(e.id)} onBlur={() => setHoveredEnemyId(current => current === e.id ? null : current)} className={`enemy role-${definition.ability} ${e.boss ? "boss" : ""} ${(e.burnTicks || 0) > 0 ? "burning" : ""} ${(e.slowTicks || 0) > 0 ? "slowed" : ""}`} style={{...cellStyle(p), "--enemy-color": definition.color} as React.CSSProperties}>{e.boss && <small>BOSS</small>}{statuses.length > 0 && <span className="enemyStatuses">{statuses.map((status, index) => <i key={`${status}-${index}`}>{status}</i>)}</span>}<EnemyArt kind={e.kind} icon={e.icon} animated/>{e.maxShield > 0 && <i className="shieldBar"><b style={{width: `${Math.max(0,e.shield/e.maxShield*100)}%`}}/></i>}<i className="healthBar"><b style={{width: `${Math.max(0,e.hp/e.maxHp*100)}%`}}/></i></div>;
            })}
            {enemyEffects.map(effect => <i key={effect.id} className={`enemyEffect ${effect.kind}`} style={{...cellStyle(effect.cell), "--enemy-color": effect.color} as React.CSSProperties}><b/><em/></i>)}
            {hoveredEnemy && hoveredEnemyDefinition && (() => { const cell = activePath[Math.min(activePath.length - 1, Math.floor(hoveredEnemy.step))]; const point = cellPoint(cell); return <aside className={`enemyInfo ${point.y < 28 ? "below" : "above"}`} style={{...cellStyle(cell), "--enemy-color": hoveredEnemyDefinition.color} as React.CSSProperties}><span>{hoveredEnemyDefinition.icon}</span><div><small>{hoveredEnemyDefinition.role}</small><b>{hoveredEnemyDefinition.name}</b><em>{Math.max(0, Math.ceil(hoveredEnemy.hp))}/{hoveredEnemy.maxHp} HP{hoveredEnemy.shield > 0 ? ` • ${Math.ceil(hoveredEnemy.shield)} shield` : ""}</em><p>{hoveredEnemyDefinition.abilityText}</p><i>{hoveredEnemyDefinition.speedMultiplier > 1.2 ? "FAST" : hoveredEnemyDefinition.speedMultiplier < 0.85 ? "SLOW" : "STEADY"}{(hoveredEnemy.burnTicks || 0) > 0 ? " • BURNING" : ""}{(hoveredEnemy.slowTicks || 0) > 0 ? " • SLOWED" : ""}</i></div></aside>; })()}
            {attackFx.map(fx => {
              const from = cellPoint(fx.from); const to = cellPoint(fx.to);
              return <i key={fx.id} className={`attackFx fx-${fx.critterId}`} style={{"--from-x":`${from.x}%`,"--from-y":`${from.y}%`,"--to-x":`${to.x}%`,"--to-y":`${to.y}%`,"--fx-color":fx.color} as React.CSSProperties}><b/></i>;
            })}
            {combatNumbers.map(number => <b key={number.id} className={`combatNumber ${number.kind} ${number.critical ? "critical" : ""}`} style={cellStyle(number.cell)}>{number.kind === "heal" ? "+" : "−"}{number.value}{number.critical && <small>CRIT!</small>}</b>)}
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
        {eventOpen && activeEvent && <div className="choiceOverlay eventOverlay" role="dialog" aria-modal="true" aria-labelledby="event-title">
          <section className="choicePanel eventPanel">
            <span className="eventIcon">{activeEvent.icon}</span><span className="eyebrow">BETWEEN THE WAVES</span>
            <h1 id="event-title">{activeEvent.title}</h1>
            <p>{activeEvent.description}</p>
            <div className="eventChoices">
              {activeEvent.choices.map(choice => <button key={choice.id} onClick={() => chooseEvent(choice)}><span>{choice.icon}</span><div><small>{choice.label}</small><b>{choice.title}</b><p>{formatEventText(choice.description, selectedCritter.name)}</p></div></button>)}
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
            <p>{FACTION_BY_ID[inspectedTower.critter.faction].icon} {FACTION_BY_ID[inspectedTower.critter.faction].name} • {inspectedTower.critter.title}</p>
            <div className="towerStatsGrid">
              <span><small>DAMAGE</small><b>{Math.round(inspectedTower.critter.damage * (starterId === "mossback" ? 1.15 : 1) * runDamageMultiplier.current)}</b></span>
              <span><small>RANGE</small><b>{inspectedTower.critter.range + (starterId === "bloomwing" ? 1 : 0)} tiles</b></span>
              <span><small>ATTACK TEMPO</small><b>{Math.max(1, inspectedTower.critter.speed - (starterId === "sparkit" ? 1 : 0)) <= 2 ? "Fast" : inspectedTower.critter.speed <= 3 ? "Steady" : "Heavy"}</b></span>
              <span><small>CRITICAL CHANCE</small><b>{Math.round(BASE_CRITICAL_CHANCE * 100)}% • ×2 damage</b></span>
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
        <div className="factionGuide">{FACTIONS.map(faction => <article key={faction.id}><span>{faction.icon}</span><div><b>{faction.name}</b><small>{faction.aesthetic}</small><em>Signature: {faction.signatureAbility}</em></div></article>)}</div>
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
