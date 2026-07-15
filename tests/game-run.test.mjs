import assert from "node:assert/strict";
import test from "node:test";

import { CRITTERS } from "../app/game/content.ts";
import { createInitialRunState, runReducer } from "../app/game/run.ts";

const critter = id => CRITTERS.find(option => option.id === id);

test("starting a run applies starter-specific defaults in one transition", () => {
  const emberRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 42 });
  assert.equal(emberRun.starterId, "emberfox");
  assert.equal(emberRun.selected, "emberfox");
  assert.equal(emberRun.mapSeed, 42);
  assert.deepEqual(emberRun.runUnlocked, ["emberfox"]);
  assert.equal(emberRun.guardianCopies.emberfox, 2);

  const bubbleRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "bubblefin", mapSeed: 7 });
  assert.equal(bubbleRun.lives, 13);
  assert.equal(bubbleRun.guardianCopies.bubblefin, 1);
});

test("recruitment updates roster, copies, selection, and wave note together", () => {
  const started = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 1 });
  const recruited = runReducer(started, { type: "RECRUIT_GUARDIAN", critter: critter("bubblefin") });
  assert.deepEqual(recruited.runUnlocked, ["emberfox", "bubblefin"]);
  assert.equal(recruited.guardianCopies.bubblefin, 1);
  assert.equal(recruited.selected, "bubblefin");
  assert.deepEqual(recruited.recruitChoices, []);
  assert.match(recruited.nextWaveNote, /Bubblefin/);
});

test("blessing actions atomically apply their run effects", () => {
  const base = { ...createInitialRunState(), selected: "emberfox", guardianCopies: { emberfox: 1 }, eventOpen: true, lives: 19 };
  const harvest = runReducer(base, { type: "GAIN_BLESSING", choice: "harvest", selectedName: "Emberfox" });
  assert.equal(harvest.dewshards, 2);
  assert.equal(harvest.eventBuffs.harvest, 1);
  assert.equal(harvest.eventOpen, false);

  const spring = runReducer(base, { type: "GAIN_BLESSING", choice: "spring", selectedName: "Emberfox" });
  assert.equal(spring.dewshards, 1);
  assert.equal(spring.guardianCopies.emberfox, 2);
  assert.equal(spring.eventBuffs.spring, 1);

  const warden = runReducer(base, { type: "GAIN_BLESSING", choice: "warden", selectedName: "Emberfox" });
  assert.equal(warden.lives, 20);
  assert.equal(warden.dewshards, 1);
  assert.equal(warden.eventBuffs.warden, 1);
});

test("wave completion chooses exactly one between recruitment, event, and boss reward", () => {
  const base = createInitialRunState();
  const choices = [critter("emberfox"), critter("bubblefin")];
  const recruitment = runReducer(base, { type: "FINISH_WAVE", boss: false, recruitChoices: choices });
  assert.deepEqual(recruitment.recruitChoices, choices);
  assert.equal(recruitment.eventOpen, false);
  assert.equal(recruitment.bossRewardOpen, false);

  const event = runReducer(base, { type: "FINISH_WAVE", boss: false, recruitChoices: [] });
  assert.equal(event.eventOpen, true);
  assert.equal(event.bossRewardOpen, false);

  const boss = runReducer(base, { type: "FINISH_WAVE", boss: true, recruitChoices: choices });
  assert.equal(boss.bossRewardOpen, true);
  assert.equal(boss.eventOpen, false);
  assert.deepEqual(boss.recruitChoices, []);
});

test("chapter and reset actions clear only the appropriate run state", () => {
  const active = {
    ...createInitialRunState(),
    starterId: "emberfox",
    chapter: 1,
    wave: 10,
    towers: [{ slot: 2, critter: critter("emberfox"), cooldown: 0, sourceId: "emberfox" }],
    eventOpen: true,
    bossRewardOpen: true,
  };
  const chapterTwo = runReducer(active, { type: "ENTER_CHAPTER", chapter: 2 });
  assert.equal(chapterTwo.chapter, 2);
  assert.equal(chapterTwo.wave, 0);
  assert.deepEqual(chapterTwo.towers, []);
  assert.equal(chapterTwo.starterId, "emberfox");

  assert.deepEqual(runReducer(chapterTwo, { type: "RESET_RUN" }), createInitialRunState());
});
