import test from "node:test";
import assert from "node:assert/strict";
import { BASE_CRITICAL_CHANCE, CRITICAL_DAMAGE_MULTIPLIER, burnDamageMultiplierForEnemy, burnEffect, calculateHitDamage, criticalChanceBonus, guardianCriticalDamageMultiplier, pushBackDistance, rangeIndicatorDiameter, rollCritical, selectAbilityHits, selectBurnSpreadTarget, slowEffect } from "../app/game/abilities.ts";
import { CRITTERS } from "../app/game/content.ts";
import { FACTION_BY_ID, FACTIONS, factionBondLevel, getFactionBondStates } from "../app/game/factions.ts";

const enemy = (id, step, boss = false) => ({ id, step, hp: 100, maxHp: 100, shield: 0, maxShield: 0, kind: "Gloomling", icon: "", boss });

test("every current guardian family uses one of the six core abilities", () => {
  assert.deepEqual(new Set(CRITTERS.map(critter => critter.ability)), new Set(["burn", "splash", "lightning", "piercing", "slow", "push"]));
});

test("current faction families share their signature ability", () => {
  assert.equal(FACTIONS.length, 6);
  for (const critter of CRITTERS) assert.equal(critter.ability, FACTION_BY_ID[critter.faction].signatureAbility);
  assert.equal(CRITTERS.find(critter => critter.id === "bloomwing").faction, "cloudkin");
  assert.equal(CRITTERS.find(critter => critter.id === "bloomwing").ability, "push");
  assert.equal(CRITTERS.find(critter => critter.id === "moonowl").faction, "starborn");
  assert.equal(CRITTERS.find(critter => critter.id === "moonowl").ability, "piercing");
});

test("faction bonds count placed copies now and support future unique modes", () => {
  const emberfox = CRITTERS.find(critter => critter.id === "emberfox");
  const evolution = CRITTERS.find(critter => critter.upgradeOf === "emberfox" && critter.evolutionPath === "core");
  const towers = [
    { slot: 1, sourceId: "emberfox", critter: emberfox, cooldown: 0 },
    { slot: 2, sourceId: "emberfox", critter: emberfox, cooldown: 0 },
    { slot: 3, sourceId: "emberfox", critter: evolution, cooldown: 0 },
  ];
  assert.equal(getFactionBondStates(towers).emberkin.count, 3);
  assert.equal(getFactionBondStates(towers).emberkin.level, 2);
  assert.equal(getFactionBondStates(towers, "uniqueGuardians").emberkin.count, 2);
  assert.equal(getFactionBondStates(towers, "uniqueFamilies").emberkin.count, 1);
  assert.deepEqual([factionBondLevel(1), factionBondLevel(2), factionBondLevel(3)], [0, 1, 2]);
});

test("splash measures physical tile distance around the primary target", () => {
  const path = [0, 1, 2, 10, 9, 8];
  const primary = enemy(1, 2);
  const aroundCorner = enemy(2, 3);
  const physicallyDistant = enemy(3, 5);
  const hits = selectAbilityHits("splash", 1, [primary, aroundCorner, physicallyDistant], [primary], primary, path);
  assert.deepEqual(hits.map(hit => hit.enemy.id), [1, 2]);
  assert.equal(hits[1].multiplier, 0.65);
});

test("lightning loses damage with every chain", () => {
  const targets = [enemy(1, 5), enemy(2, 4), enemy(3, 3), enemy(4, 2)];
  const hits = selectAbilityHits("lightning", 1, targets, targets, targets[0], [0, 1, 2, 3, 4, 5]);
  assert.equal(hits.length, 3);
  assert.equal(hits[0].multiplier, 1);
  assert.ok(hits[1].multiplier < hits[0].multiplier);
  assert.ok(hits[2].multiplier < hits[1].multiplier);
});

test("starter modifiers strengthen only splash and chained hits", () => {
  const path = [0, 1, 2, 10, 9, 8];
  const primary = enemy(1, 2);
  const nearby = enemy(2, 3);
  const splashHits = selectAbilityHits("splash", 1, [primary, nearby], [primary], primary, path, 0, { splashDamageMultiplier: 1.1 });
  assert.equal(splashHits[0].multiplier, 1);
  assert.equal(splashHits[1].multiplier, 0.65 * 1.1);

  const chainTargets = [enemy(3, 5), enemy(4, 4), enemy(5, 3)];
  const normalChain = selectAbilityHits("lightning", 1, chainTargets, chainTargets, chainTargets[0], path);
  const boostedChain = selectAbilityHits("lightning", 1, chainTargets, chainTargets, chainTargets[0], path, 0, { chainDamageMultiplier: 1.1 });
  assert.equal(boostedChain[0].multiplier, 1);
  assert.equal(boostedChain[1].multiplier, normalChain[1].multiplier * 1.1);
});

test("Tidekin and Stormborn bonds expand splash and lightning", () => {
  const path = [0, 1, 2, 3, 4, 5];
  const primary = enemy(1, 0);
  const distant = enemy(2, 2);
  assert.deepEqual(selectAbilityHits("splash", 1, [primary, distant], [primary], primary, path, 0).map(hit => hit.enemy.id), [1]);
  assert.deepEqual(selectAbilityHits("splash", 1, [primary, distant], [primary], primary, path, 2).map(hit => hit.enemy.id), [1, 2]);
  const targets = [1, 2, 3, 4, 5].map((id, index) => enemy(id, 5 - index));
  assert.equal(selectAbilityHits("lightning", 1, targets, targets, targets[0], path, 0).length, 3);
  assert.equal(selectAbilityHits("lightning", 1, targets, targets, targets[0], path, 2).length, 5);
});

test("Emberkin and Rootbound bonds strengthen their status effects", () => {
  assert.equal(burnEffect(100, 1, 0).ticks, 3);
  assert.equal(burnEffect(100, 1, 1).ticks, 4);
  assert.equal(burnEffect(100, 1, 2).spreadMultiplier, 0.5);
  assert.equal(slowEffect(1, 1).factor, 0.55);
  assert.equal(slowEffect(1, 2).factor, 0.65);
  assert.equal(slowEffect(1, 0, 1.2).ticks, 4.8);
  const path = [0, 1, 2, 3];
  assert.equal(selectBurnSpreadTarget([enemy(1, 1), enemy(2, 2)], enemy(1, 1), path)?.id, 2);
});

test("critical hits use the shared chance and damage multiplier", () => {
  assert.equal(BASE_CRITICAL_CHANCE, 0.1);
  assert.equal(CRITICAL_DAMAGE_MULTIPLIER, 2);
  assert.equal(rollCritical(() => 0.099), true);
  assert.equal(rollCritical(() => 0.1), false);
  assert.equal(criticalChanceBonus(2), 0.1);
  assert.equal(rollCritical(() => 0.19, criticalChanceBonus(2)), true);
  assert.equal(calculateHitDamage(20, 0.65, true), 26);
  assert.equal(calculateHitDamage(20, 1, true, 1, 2.5), 50);
});

test("new faction guardians have distinct specialist profiles", () => {
  const coalroll = CRITTERS.find(critter => critter.id === "coalroll");
  const ziphummer = CRITTERS.find(critter => critter.id === "ziphummer");
  const astralynx = CRITTERS.find(critter => critter.id === "astralynx");
  assert.equal(coalroll.range, 2);
  assert.equal(coalroll.burnDamageTakenMultiplier, 1.25);
  assert.equal(ziphummer.speed, 1);
  assert.ok(ziphummer.damage < CRITTERS.find(critter => critter.id === "sparkit").damage);
  assert.equal(guardianCriticalDamageMultiplier(astralynx), 2.5);
});

test("Coalroll strengthens burns only while enemies are inside its non-stacking aura", () => {
  const coalroll = CRITTERS.find(critter => critter.id === "coalroll");
  const path = [0, 1, 2, 3, 4, 5, 6, 7];
  const target = enemy(1, 2);
  const nearby = { slot: 8, sourceId: "coalroll", critter: coalroll, cooldown: 0 };
  const secondNearby = { ...nearby, slot: 9 };
  const distant = { ...nearby, slot: 63 };
  assert.equal(burnDamageMultiplierForEnemy(target, [nearby], path), 1.25);
  assert.equal(burnDamageMultiplierForEnemy(target, [nearby, secondNearby], path), 1.25);
  assert.equal(burnDamageMultiplierForEnemy(target, [distant], path), 1);
});

test("push grows with tier and bosses resist half of it", () => {
  assert.ok(pushBackDistance(3) > pushBackDistance(1));
  assert.equal(pushBackDistance(2, true), pushBackDistance(2) * 0.5);
  assert.equal(pushBackDistance(1, false, 2), pushBackDistance(1) * 1.5);
});

test("range indicators use the same targeting allowance as combat", () => {
  assert.equal(rangeIndicatorDiameter(2, 8), 66.25);
  assert.ok(rangeIndicatorDiameter(4, 8) > rangeIndicatorDiameter(2, 8));
});
