import assert from "node:assert/strict";
import test from "node:test";

import { CRITTERS } from "../app/game/content.ts";
import { EVENT_BY_ID, choicesForEvent } from "../app/game/events.ts";
import { createInitialRunState, runReducer } from "../app/game/run.ts";

const critter = id => CRITTERS.find(option => option.id === id);

test("starting a run applies starter-specific defaults in one transition", () => {
  const emberRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 42, gameMode: "campaign" });
  assert.equal(emberRun.starterId, "emberfox");
  assert.equal(emberRun.selected, "emberfox");
  assert.equal(emberRun.mapSeed, 42);
  assert.deepEqual(emberRun.runUnlocked, ["emberfox"]);
  assert.equal(emberRun.guardianCopies.emberfox, 1);
  assert.equal(emberRun.guardianForms.emberfox, 1);

  const bubbleRun = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "bubblefin", mapSeed: 7, gameMode: "campaign" });
  assert.equal(bubbleRun.lives, 10);
  assert.equal(bubbleRun.guardianCopies.bubblefin, 1);
  assert.equal(bubbleRun.guardianForms.bubblefin, 1);
});

test("recruitment updates roster, copies, selection, and wave note together", () => {
  const started = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 1, gameMode: "campaign" });
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
  assert.deepEqual(spring.blessings, { harvest: 0, warden: 0 });
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

test("sending a guardian removes one unplaced form for two completed waves", () => {
  const base = {
    ...createInitialRunState(),
    selected: "cinderpup",
    runUnlocked: ["emberfox"],
    guardianCopies: { emberfox: 2 },
    guardianForms: { emberfox: 1, cinderpup: 1 },
    towers: [{ slot: 2, critter: critter("emberfox"), cooldown: 0, sourceId: "emberfox" }],
    eventOpen: true,
    activeEventId: "call-for-aid",
  };
  const send = choicesForEvent(EVENT_BY_ID["call-for-aid"], [critter("cinderpup")])[0];
  const away = runReducer(base, { type: "RESOLVE_EVENT", choice: send, selectedName: "Cinderpup" });
  assert.equal(away.guardianForms.cinderpup, 0);
  assert.equal(away.guardianCopies.emberfox, 1);
  assert.deepEqual(away.aidMission, { guardianId: "cinderpup", wavesRemaining: 2 });
  assert.ok(away.resolvedEventIds.includes("call-for-aid"));

  const afterOne = runReducer(away, { type: "FINISH_WAVE", boss: false, recruitChoices: [], eventId: null });
  assert.equal(afterOne.aidMission.wavesRemaining, 1);
  assert.equal(afterOne.eventOpen, false);
  const afterTwo = runReducer(afterOne, { type: "FINISH_WAVE", boss: false, recruitChoices: [], eventId: "moonlit-crossroads" });
  assert.equal(afterTwo.aidMission.wavesRemaining, 0);
  assert.equal(afterTwo.activeEventId, "aid-answered");
});

test("answered aid returns the messenger and grants the selected Tier 2 reward", () => {
  const base = {
    ...createInitialRunState(),
    runUnlocked: ["emberfox"],
    guardianCopies: { emberfox: 0 },
    guardianForms: { cinderpup: 0 },
    aidMission: { guardianId: "cinderpup", wavesRemaining: 0 },
    eventOpen: true,
    activeEventId: "aid-answered",
  };
  const choice = EVENT_BY_ID["aid-answered"].choices[0];
  const rewarded = runReducer(base, { type: "RESOLVE_EVENT", choice, selectedName: "Cinderpup", rewardGuardianId: "ripplefin" });
  assert.equal(rewarded.aidMission, null);
  assert.equal(rewarded.guardianForms.cinderpup, 1);
  assert.equal(rewarded.guardianForms.ripplefin, 1);
  assert.equal(rewarded.guardianCopies.emberfox, 1);
  assert.equal(rewarded.guardianCopies.bubblefin, 1);
  assert.ok(rewarded.runUnlocked.includes("bubblefin"));
});

test("declining aid grants one Dewshard and damage for exactly the next wave", () => {
  const choice = EVENT_BY_ID["call-for-aid"].choices.find(option => option.id === "cannot-spare-anyone");
  const rewarded = runReducer({ ...createInitialRunState(), eventOpen: true, activeEventId: "call-for-aid" }, { type: "RESOLVE_EVENT", choice, selectedName: "Emberfox" });
  assert.equal(rewarded.dewshards, 1);
  assert.equal(rewarded.waveDamageMultiplier, 1.1);
  assert.deepEqual(rewarded.blessings, { harvest: 0, warden: 0 });
  const cleared = runReducer(rewarded, { type: "FINISH_WAVE", boss: false, recruitChoices: [], eventId: null });
  assert.equal(cleared.waveDamageMultiplier, 1);
});

test("aid follow-ups wait behind recruitment and then open", () => {
  const base = { ...createInitialRunState(), aidMission: { guardianId: "emberfox", wavesRemaining: 1 } };
  const recruitment = runReducer(base, { type: "FINISH_WAVE", boss: false, recruitChoices: [critter("bubblefin")], eventId: null });
  assert.equal(recruitment.queuedEventId, "aid-answered");
  assert.equal(recruitment.eventOpen, false);
  const recruited = runReducer(recruitment, { type: "RECRUIT_GUARDIAN", critter: critter("bubblefin") });
  assert.equal(recruited.activeEventId, "aid-answered");
  assert.equal(recruited.eventOpen, true);
});

test("endless runs retain their global wave when moving to a new region", () => {
  const started = runReducer(createInitialRunState(), { type: "START_RUN", starterId: "emberfox", mapSeed: 8, gameMode: "endless" });
  const atBoss = { ...started, wave: 10, chapter: 1, towers: [{ slot: 2, critter: critter("emberfox"), cooldown: 0, sourceId: "emberfox" }] };
  const nextRegion = runReducer(atBoss, { type: "ENTER_ENDLESS_REGION", chapter: 2 });
  assert.equal(nextRegion.gameMode, "endless");
  assert.equal(nextRegion.wave, 10);
  assert.equal(nextRegion.chapter, 2);
  assert.deepEqual(nextRegion.towers, []);
});
