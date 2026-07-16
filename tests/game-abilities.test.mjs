import test from "node:test";
import assert from "node:assert/strict";
import { BASE_CRITICAL_CHANCE, CRITICAL_DAMAGE_MULTIPLIER, calculateHitDamage, pushBackDistance, rangeIndicatorDiameter, rollCritical, selectAbilityHits } from "../app/game/abilities.ts";
import { CRITTERS } from "../app/game/content.ts";
import { FACTION_BY_ID, FACTIONS } from "../app/game/factions.ts";

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

test("critical hits use the shared chance and damage multiplier", () => {
  assert.equal(BASE_CRITICAL_CHANCE, 0.1);
  assert.equal(CRITICAL_DAMAGE_MULTIPLIER, 2);
  assert.equal(rollCritical(() => 0.099), true);
  assert.equal(rollCritical(() => 0.1), false);
  assert.equal(calculateHitDamage(20, 0.65, true), 26);
});

test("push grows with tier and bosses resist half of it", () => {
  assert.ok(pushBackDistance(3) > pushBackDistance(1));
  assert.equal(pushBackDistance(2, true), pushBackDistance(2) * 0.5);
});

test("range indicators use the same targeting allowance as combat", () => {
  assert.equal(rangeIndicatorDiameter(2, 8), 66.25);
  assert.ok(rangeIndicatorDiameter(4, 8) > rangeIndicatorDiameter(2, 8));
});
