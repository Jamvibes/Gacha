import test from "node:test";
import assert from "node:assert/strict";
import { STARTER_IDS } from "../app/game/content.ts";
import {
  STARTER_BONUSES,
  starterAttackSpeedBonus,
  starterBlessing,
  starterChainDamageMultiplier,
  starterDamageMultiplier,
  starterEnemyShieldMultiplier,
  starterPeriodicBurn,
  starterPeriodicPush,
  starterPiercingCriticalMultiplier,
  starterRangeBonus,
  starterSlowDurationMultiplier,
  starterSplashDamageMultiplier,
  starterStartingCopies,
  starterStartingLives,
} from "../app/game/starter-bonuses.ts";

test("every eligible starter has one catalogue entry", () => {
  assert.deepEqual([...Object.keys(STARTER_BONUSES)].sort(), [...STARTER_IDS].sort());
  for (const id of STARTER_IDS) {
    assert.ok(starterBlessing(id).length > 0);
    assert.ok(STARTER_BONUSES[id].effects.length > 0);
  }
});

test("the starter catalogue defines all six ability-focused bonuses", () => {
  assert.deepEqual(starterPeriodicBurn("emberfox"), { type: "periodicBurn", intervalTicks: 5, burnTicks: 3, damage: 4 });
  assert.equal(starterSplashDamageMultiplier("bubblefin"), 1.1);
  assert.equal(starterSlowDurationMultiplier("mossback"), 1.2);
  assert.equal(starterChainDamageMultiplier("sparkit"), 1.1);
  assert.deepEqual(starterPeriodicPush("bloomwing"), { type: "periodicPush", intervalTicks: 10, distance: 0.75 });
  assert.equal(starterPiercingCriticalMultiplier("moonowl"), 2.5);
});

test("unrelated and future starters receive neutral defaults", () => {
  assert.equal(starterStartingCopies("future-starter"), 1);
  assert.equal(starterStartingLives("future-starter"), 10);
  assert.equal(starterDamageMultiplier("future-starter"), 1);
  assert.equal(starterAttackSpeedBonus("future-starter"), 0);
  assert.equal(starterRangeBonus("future-starter"), 0);
  assert.equal(starterEnemyShieldMultiplier("future-starter"), 1);
  assert.equal(starterSplashDamageMultiplier("future-starter"), 1);
  assert.equal(starterSlowDurationMultiplier("future-starter"), 1);
  assert.equal(starterChainDamageMultiplier("future-starter"), 1);
  assert.equal(starterPiercingCriticalMultiplier("future-starter"), 2);
  assert.equal(starterPeriodicBurn("future-starter"), null);
  assert.equal(starterPeriodicPush("future-starter"), null);
});
