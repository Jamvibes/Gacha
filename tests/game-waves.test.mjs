import test from "node:test";
import assert from "node:assert/strict";
import { ENEMY_BY_ID, ENEMY_DEFINITIONS, applyHealerPulse, createEnemy, createSplitOffspring } from "../app/game/enemies.ts";
import { getEnemyStatuses } from "../app/game/enemy-statuses.ts";
import { createEndlessWavePlan, createWavePlan, endlessDifficulty, groupWavePlan, isEndlessBossWave, isRecruitmentWave } from "../app/game/waves.ts";

test("the initial enemy roster covers every requested role", () => {
  assert.equal(ENEMY_BY_ID.gloomling.ability, "basic");
  assert.equal(ENEMY_BY_ID.mossmaw.ability, "tank");
  assert.equal(ENEMY_BY_ID["bramble-brute"].ability, "shield");
  assert.equal(ENEMY_BY_ID.whispling.ability, "fast");
  assert.equal(ENEMY_BY_ID.shadepod.ability, "split");
  assert.equal(ENEMY_BY_ID["mender-moth"].ability, "heal");
  assert.equal(ENEMY_DEFINITIONS.filter(enemy => enemy.boss).length, 3);
});

test("chapter one deliberately introduces enemy mechanics", () => {
  assert.deepEqual(new Set(createWavePlan({ chapter: 1, wave: 1, seed: 7 }).enemyIds), new Set(["gloomling"]));
  assert.ok(createWavePlan({ chapter: 1, wave: 2, seed: 7 }).enemyIds.includes("mossmaw"));
  assert.ok(createWavePlan({ chapter: 1, wave: 4, seed: 7 }).enemyIds.includes("whispling"));
  assert.ok(createWavePlan({ chapter: 1, wave: 5, seed: 7 }).enemyIds.includes("bramble-brute"));
  assert.ok(createWavePlan({ chapter: 1, wave: 6, seed: 7 }).enemyIds.includes("shadepod"));
  assert.ok(createWavePlan({ chapter: 1, wave: 7, seed: 7 }).enemyIds.includes("mender-moth"));
  assert.deepEqual(createWavePlan({ chapter: 1, wave: 10, seed: 7 }).enemyIds, ["thornmaw"]);
});

test("later budget waves are deterministic and keep support enemies controlled", () => {
  for (let chapter = 2; chapter <= 3; chapter++) {
    for (let wave = 1; wave <= 9; wave++) {
      const first = createWavePlan({ chapter, wave, seed: 12345 });
      const second = createWavePlan({ chapter, wave, seed: 12345 });
      assert.deepEqual(first, second);
      assert.ok(first.enemyIds.length > 0);
      assert.ok(first.enemyIds.filter(id => id === "mender-moth").length <= 1);
      assert.ok(first.enemyIds.filter(id => id === "shadepod").length <= 3);
      assert.ok(first.enemyIds.every(id => !ENEMY_BY_ID[id].boss));
    }
  }
});

test("event enemies and scout groups come from the same plan", () => {
  const plan = createWavePlan({ chapter: 1, wave: 5, seed: 4, extraEnemies: 2 });
  assert.equal(plan.enemyIds.filter(id => id === "gloomling").length, 7);
  const groups = groupWavePlan(plan, 1.2, 0.75);
  assert.equal(groups.reduce((total, group) => total + group.count, 0), plan.enemyIds.length);
  const brute = groups.find(group => group.definition.id === "bramble-brute");
  assert.equal(brute.shield, Math.round(brute.hp * 0.35 * 0.75));
});

test("endless waves are deterministic, scale forever, and place bosses every ten waves", () => {
  assert.equal(endlessDifficulty(1), 1);
  assert.ok(endlessDifficulty(75) > endlessDifficulty(35));
  assert.deepEqual(createEndlessWavePlan({ chapter: 1, wave: 37, seed: 123 }), createEndlessWavePlan({ chapter: 1, wave: 37, seed: 123 }));
  assert.equal(isEndlessBossWave(9), false);
  assert.equal(isEndlessBossWave(10), true);
  assert.equal(isEndlessBossWave(100), true);
  assert.deepEqual(createEndlessWavePlan({ chapter: 1, wave: 10, seed: 1 }).enemyIds, ["thornmaw"]);
  assert.deepEqual(createEndlessWavePlan({ chapter: 2, wave: 20, seed: 1 }).enemyIds, ["mire-monarch"]);
  assert.deepEqual(createEndlessWavePlan({ chapter: 3, wave: 30, seed: 1 }).enemyIds, ["hollow-crown"]);
});

test("endless recruitment uses the opening waves and then waves ending in five", () => {
  assert.deepEqual([1, 3, 5, 6, 15, 25].filter(wave => isRecruitmentWave("endless", wave)), [1, 3, 6, 15, 25]);
  assert.deepEqual([1, 3, 6, 15].filter(wave => isRecruitmentWave("campaign", wave)), [1, 3, 6]);
});

test("healers restore nearby allies but not themselves or other healers", () => {
  const healer = createEnemy(ENEMY_BY_ID["mender-moth"], 1, 8, 1);
  const secondHealer = createEnemy(ENEMY_BY_ID["mender-moth"], 2, 8, 1);
  const ally = createEnemy(ENEMY_BY_ID.gloomling, 3, 8, 1, 1, 1, 1);
  healer.healCooldown = 0;
  secondHealer.hp -= 20;
  ally.hp -= 30;
  const healed = applyHealerPulse([healer, secondHealer, ally], healer);
  assert.deepEqual(healed.map(item => item.enemy.id), [3]);
  assert.ok(ally.hp > ally.maxHp - 30);
  assert.equal(secondHealer.hp, secondHealer.maxHp - 20);
});

test("a defeated splitter creates two fragile children only once", () => {
  const parent = createEnemy(ENEMY_BY_ID.shadepod, 1, 8, 1, 1, 1, 5);
  parent.hp = 0;
  let id = 10;
  const children = createSplitOffspring(parent, () => id++, 8, 1);
  assert.equal(children.length, 2);
  assert.ok(children.every(child => child.definitionId === "gloomlet" && child.step <= 5));
  assert.deepEqual(createSplitOffspring(parent, () => id++, 8, 1), []);
});

test("enemy status summaries cover active effects and innate abilities", () => {
  const brute = createEnemy(ENEMY_BY_ID["bramble-brute"], 1, 8, 1);
  brute.burnTicks = 3;
  brute.burnDamage = 4;
  brute.slowTicks = 4.8;
  brute.slowFactor = 0.45;
  const bruteStatuses = getEnemyStatuses(brute, ENEMY_BY_ID["bramble-brute"]);
  assert.deepEqual(bruteStatuses.map(status => status.id), ["shield", "burn", "slow"]);
  assert.match(bruteStatuses[1].detail, /3 ticks/);

  const healer = createEnemy(ENEMY_BY_ID["mender-moth"], 2, 8, 1);
  const splitter = createEnemy(ENEMY_BY_ID.shadepod, 3, 8, 1);
  assert.deepEqual(getEnemyStatuses(healer, ENEMY_BY_ID["mender-moth"]).map(status => status.id), ["heal"]);
  assert.deepEqual(getEnemyStatuses(splitter, ENEMY_BY_ID.shadepod).map(status => status.id), ["split"]);
});
