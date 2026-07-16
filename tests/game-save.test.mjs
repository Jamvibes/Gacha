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
  guardianForms: { emberfox: 2 },
  blessings: { harvest: 1, spring: 0, warden: 0 },
  activeEventId: null,
  recentEventIds: [],
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
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...baseRun, version: 1, mapVersion: undefined, guardianForms: undefined, blessings: undefined, eventBuffs: { harvest: 1, spring: 0, warden: 0 }, towers: [{ slot: 0, critterId: "emberfox" }], savedAt: 1 }));

  const restored = readRunProgress(storage);
  assert.ok(restored);
  assert.equal(restored.mapVersion, 1);
  assert.equal(restored.towers[0].slot, CHAPTERS[0].slots[0]);
  assert.equal(restored.towers[0].sourceId, "emberfox");
  assert.equal(restored.guardianCopies.emberfox, 2);
  assert.deepEqual(restored.guardianForms, { emberfox: 2 });
});

test("current run saves round-trip through the versioned boundary", () => {
  const storage = new MemoryStorage();
  writeRunProgress(storage, baseRun, 123456);

  const serialized = JSON.parse(storage.getItem(RUN_SAVE_KEY));
  assert.equal(serialized.version, 4);
  assert.equal(serialized.savedAt, 123456);

  const restored = readRunProgress(storage);
  assert.ok(restored);
  assert.equal(restored.chapter, 1);
  assert.equal(restored.towers[0].slot, 2);
  assert.equal(restored.blessings.harvest, 1);
  assert.deepEqual(restored.guardianForms, { emberfox: 2 });
});

test("an open event restores with the same choices instead of rerolling", () => {
  const storage = new MemoryStorage();
  writeRunProgress(storage, { ...baseRun, chapter: 2, wave: 4, eventOpen: true, activeEventId: "fallen-star", recentEventIds: ["moonlit-crossroads"] }, 123456);
  const first = readRunProgress(storage);
  const second = readRunProgress(storage);
  assert.equal(first.activeEventId, "fallen-star");
  assert.equal(second.activeEventId, "fallen-star");
  assert.deepEqual(second.recentEventIds, ["moonlit-crossroads"]);
});

test("older open-event saves receive one deterministic migrated event", () => {
  const storage = new MemoryStorage();
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({ ...baseRun, version: 2, guardianForms: undefined, blessings: undefined, eventBuffs: baseRun.blessings, eventOpen: true, activeEventId: undefined, recentEventIds: undefined, savedAt: 1 }));
  const first = readRunProgress(storage);
  const second = readRunProgress(storage);
  assert.ok(first.activeEventId);
  assert.equal(second.activeEventId, first.activeEventId);
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

test("version three saves infer evolved forms from placed guardians", () => {
  const storage = new MemoryStorage();
  storage.setItem(RUN_SAVE_KEY, JSON.stringify({
    ...baseRun,
    version: 3,
    selected: "cinderpup",
    guardianForms: undefined,
    towers: [{ slot: 2, critterId: "cinderpup", sourceId: "emberfox" }],
    savedAt: 1,
  }));
  const restored = readRunProgress(storage);
  assert.deepEqual(restored.guardianForms, { cinderpup: 1, emberfox: 1 });
  assert.equal(restored.selected, "cinderpup");
});
