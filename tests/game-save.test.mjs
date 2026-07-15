import assert from "node:assert/strict";
import test from "node:test";

import { CHAPTERS, META_SAVE_KEY, RUN_SAVE_KEY } from "../app/game/content.ts";
import { defaultMetaProgress, readMetaProgress, readRunProgress, writeMetaProgress, writeRunProgress } from "../app/game/save.ts";

class MemoryStorage {
  values = new Map();
  removed = [];

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
    this.removed.push(key);
  }
}

const baseRun = {
  starterId: "emberfox",
  selected: "emberfox",
  chapter: 1,
  wave: 2,
  mapSeed: 0,
  mapVersion: 2,
  lives: 9,
  dewshards: 1,
  towers: [{ slot: 2, critterId: "emberfox", sourceId: "emberfox" }],
  runUnlocked: ["emberfox"],
  guardianCopies: { emberfox: 2 },
  eventBuffs: { harvest: 1, spring: 0, warden: 0 },
  starCharmCount: 0,
  nextWaveNote: "Moonbloom Covenant",
  eventOpen: false,
  recruitChoices: [],
  bossRewardOpen: false,
  gameSpeed: 1,
  waveHpMultiplier: 1,
  waveExtraEnemies: 0,
  wavePetalBonus: 0,
  runDamageMultiplier: 1,
};

test("permanent progression accepts old saves and sanitizes catalogue ids", () => {
  const storage = new MemoryStorage();
  storage.setItem(META_SAVE_KEY, JSON.stringify({
    owned: ["emberfox", "not-a-critter", "emberfox"],
    petals: 125,
    stats: { emberfox: { runs: 4, victories: 2, bossesDefeated: 3, wavesCleared: 17, highestChapter: 2 } },
  }));

  const progress = readMetaProgress(storage);
  assert.equal(progress.version, 1);
  assert.deepEqual(progress.owned, ["emberfox"]);
  assert.equal(progress.petals, 125);
  assert.equal(progress.stats.emberfox.runs, 4);
  assert.ok(progress.stats.bubblefin, "missing starter records must receive defaults");
});

test("malformed permanent progression falls back without deleting defaults", () => {
  const storage = new MemoryStorage();
  storage.setItem(META_SAVE_KEY, "not json");
  assert.deepEqual(readMetaProgress(storage), defaultMetaProgress());

  writeMetaProgress(storage, { owned: ["mossback"], petals: 77, stats: defaultMetaProgress().stats });
  assert.equal(JSON.parse(storage.getItem(META_SAVE_KEY)).version, 1);
});

test("version one run saves migrate legacy tower slots", () => {
  const storage = new MemoryStorage();
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...baseRun, version: 1, mapVersion: undefined, towers: [{ slot: 0, critterId: "emberfox" }], savedAt: 1 }));

  const restored = readRunProgress(storage);
  assert.ok(restored);
  assert.equal(restored.mapVersion, 1);
  assert.equal(restored.towers[0].slot, CHAPTERS[0].slots[0]);
  assert.equal(restored.towers[0].sourceId, "emberfox");
  assert.equal(restored.guardianCopies.emberfox, 2);
});

test("current run saves round-trip through the versioned boundary", () => {
  const storage = new MemoryStorage();
  writeRunProgress(storage, baseRun, 123456);

  const serialized = JSON.parse(storage.getItem(RUN_SAVE_KEY));
  assert.equal(serialized.version, 2);
  assert.equal(serialized.savedAt, 123456);

  const restored = readRunProgress(storage);
  assert.ok(restored);
  assert.equal(restored.chapter, 1);
  assert.equal(restored.towers[0].slot, 2);
  assert.equal(restored.eventBuffs.harvest, 1);
});

test("invalid run saves are rejected and cleared", () => {
  const storage = new MemoryStorage();
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...baseRun, version: 2, starterId: "missing-critter", savedAt: 1 }));
  assert.equal(readRunProgress(storage), null);
  assert.deepEqual(storage.removed, [RUN_SAVE_KEY]);
});

test("malformed tower entries cannot appear on an unintended tile", () => {
  const storage = new MemoryStorage();
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...baseRun, version: 2, towers: [{ critterId: "emberfox" }], savedAt: 1 }));
  assert.deepEqual(readRunProgress(storage).towers, []);
});
