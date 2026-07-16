import test from "node:test";
import assert from "node:assert/strict";
import { STARTER_IDS } from "../app/game/content.ts";
import {
  STARTER_BONUSES,
  starterAttackSpeedBonus,
  starterBlessing,
  starterDamageMultiplier,
  starterEnemyShieldMultiplier,
  starterRangeBonus,
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

test("the starter catalogue preserves all six current bonuses", () => {
  assert.equal(starterStartingCopies("emberfox"), 2);
  assert.equal(starterStartingLives("bubblefin"), 13);
  assert.equal(starterDamageMultiplier("mossback"), 1.15);
  assert.equal(starterAttackSpeedBonus("sparkit"), 1);
  assert.equal(starterRangeBonus("bloomwing"), 1);
  assert.equal(starterEnemyShieldMultiplier("moonowl"), 0.75);
});

test("unrelated and future starters receive neutral defaults", () => {
  assert.equal(starterStartingCopies("future-starter"), 1);
  assert.equal(starterStartingLives("future-starter"), 10);
  assert.equal(starterDamageMultiplier("future-starter"), 1);
  assert.equal(starterAttackSpeedBonus("future-starter"), 0);
  assert.equal(starterRangeBonus("future-starter"), 0);
  assert.equal(starterEnemyShieldMultiplier("future-starter"), 1);
});
