import assert from "node:assert/strict";
import test from "node:test";

import { CRITTERS } from "../app/game/content.ts";
import { EVENT_BY_ID } from "../app/game/events.ts";
import { createInitialRunState, runReducer } from "../app/game/run.ts";

const critter = id => CRITTERS.find(option => option.id === id);

test("starting a run applies starter-specific defaults in one transition", () => {
  const emberRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 42 });
  assert.equal(emberRun.starterId, "emberfox");
  assert.equal(emberRun.selected, "emberfox");
  assert.equal(emberRun.mapSeed, 42);
  assert.deepEqual(emberRun.runUnlocked, ["emberfox"]);
  assert.equal(emberRun.guardianCopies.emberfox, 1);
  assert.equal(emberRun.guardianForms.emberfox, 1);

  const bubbleRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "bubblefin", mapSeed: 7 });
  assert.equal(bubbleRun.lives, 10);
  assert.equal(bubbleRun.guardianCopies.bubblefin, 1);
  assert.equal(bubbleRun.guardianForms.bubblefin, 1);
});

test("recruitment updates roster, copies, selection, and wave note together", () => {
  const started = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 1 });
  const recruited = runReducer(started, { type: "RECRUIT_GUARDIAN", critter: critter("bubblefin") });
  assert.deepEqual(recruited.runUnlocked, ["emberfox", "bubblefin"]);
  assert.equal(recruited.guardianCopies.bubblefin, 1);
  assert.equal(recruited.guardianForms.bubblefin, 1);
  assert.equal(recruited.selected, "bubblefin");
  assert.deepEqual(recruited.recruitChoices, []);
  assert.match(recruited.nextWaveNote, /Bubblefin/);
});

test("blessing actions atomically apply their run effects", () => {
  const base = { ...createInitialRunState(), selected: "emberfox", guardianCopies: { emberfox: 1 }, guardianForms: { emberfox: 1 }, eventOpen: true, activeEventId: "moonlit-crossroads", lives: 19 };
  const choices = EVENT_BY_ID["moonlit-crossroads"].choices;
  const harvest = runReducer(base, { type: "RESOLVE_EVENT", choice: choices.find(choice => choice.id === "harvest-moonpetals"), selectedName: "Emberfox" });
  assert.equal(harvest.dewshards, 2);
  assert.equal(harvest.blessings.harvest, 1);
  assert.equal(harvest.eventOpen, false);
  assert.equal(harvest.activeEventId, null);
  assert.deepEqual(harvest.recentEventIds, ["moonlit-crossroads"]);

  const spring = runReducer(base, { type: "RESOLVE_EVENT", choice: choices.find(choice => choice.id === "listen-to-spring"), selectedName: "Emberfox" });
  assert.equal(spring.dewshards, 1);
  assert.equal(spring.guardianCopies.emberfox, 2);
  assert.equal(spring.guardianForms.emberfox, 2);
  assert.equal(spring.blessings.spring, 1);
  assert.match(spring.nextWaveNote, /Emberfox/);

  const warden = runReducer(base, { type: "RESOLVE_EVENT", choice: choices.find(choice => choice.id === "make-root-pact"), selectedName: "Emberfox" });
  assert.equal(warden.lives, 20);
  assert.equal(warden.dewshards, 1);
  assert.equal(warden.blessings.warden, 1);
});

test("wave completion chooses exactly one between recruitment, event, and boss reward", () => {
  const base = createInitialRunState();
  const choices = [critter("emberfox"), critter("bubblefin")];
  const recruitment = runReducer(base, { type: "FINISH_WAVE", boss: false, recruitChoices: choices, eventId: "moonlit-crossroads" });
  assert.deepEqual(recruitment.recruitChoices, choices);
  assert.equal(recruitment.eventOpen, false);
  assert.equal(recruitment.bossRewardOpen, false);

  const event = runReducer(base, { type: "FINISH_WAVE", boss: false, recruitChoices: [], eventId: "moonlit-crossroads" });
  assert.equal(event.eventOpen, true);
  assert.equal(event.activeEventId, "moonlit-crossroads");
  assert.equal(event.bossRewardOpen, false);

  const boss = runReducer(base, { type: "FINISH_WAVE", boss: true, recruitChoices: choices, eventId: "moonlit-crossroads" });
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
    guardianCopies: { emberfox: 1 },
    guardianForms: { emberfox: 1 },
    eventOpen: true,
    bossRewardOpen: true,
  };
  const chapterTwo = runReducer(active, { type: "ENTER_CHAPTER", chapter: 2 });
  assert.equal(chapterTwo.chapter, 2);
  assert.equal(chapterTwo.wave, 0);
  assert.deepEqual(chapterTwo.towers, []);
  assert.equal(chapterTwo.starterId, "emberfox");
  assert.deepEqual(chapterTwo.guardianForms, { emberfox: 1 });

  assert.deepEqual(runReducer(chapterTwo, { type: "RESET_RUN" }), createInitialRunState());
});

test("evolved copies retain their exact form when a new chapter clears the map", () => {
  const emberfox = critter("emberfox");
  const cinderpup = critter("cinderpup");
  const active = {
    ...createInitialRunState(),
    starterId: "emberfox",
    selected: "emberfox",
    runUnlocked: ["emberfox"],
    guardianCopies: { emberfox: 2 },
    guardianForms: { emberfox: 2 },
    towers: [{ slot: 2, critter: emberfox, cooldown: 0, sourceId: "emberfox" }],
  };
  const evolved = runReducer(active, { type: "EVOLVE_GUARDIAN", slot: 2, evolution: cinderpup });
  assert.equal(evolved.towers[0].critter.id, "cinderpup");
  assert.deepEqual(evolved.guardianForms, { emberfox: 1, cinderpup: 1 });
  assert.equal(evolved.selected, "cinderpup");

  const nextChapter = runReducer(evolved, { type: "ENTER_CHAPTER", chapter: 2 });
  assert.deepEqual(nextChapter.towers, []);
  assert.deepEqual(nextChapter.guardianForms, { emberfox: 1, cinderpup: 1 });
});

test("roster copy rewards duplicate each family's highest current form", () => {
  const state = {
    ...createInitialRunState(),
    runUnlocked: ["emberfox", "bubblefin"],
    guardianCopies: { emberfox: 2, bubblefin: 1 },
    guardianForms: { emberfox: 1, cinderpup: 1, bubblefin: 1 },
  };
  const rewarded = runReducer(state, { type: "GRANT_ROSTER_COPIES" });
  assert.deepEqual(rewarded.guardianCopies, { emberfox: 3, bubblefin: 2 });
  assert.deepEqual(rewarded.guardianForms, { emberfox: 1, cinderpup: 2, bubblefin: 2 });
});
