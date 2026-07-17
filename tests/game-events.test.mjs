import assert from "node:assert/strict";
import test from "node:test";

import { EVENT_BY_ID, EVENTS, choicesForEvent, eligibleAidTierTwoGuardians, eligiblePoolEvents, selectEventForWave, selectPooledEvent, selectScheduledEvent, tierTwoAidReward } from "../app/game/events.ts";
import { CRITTERS } from "../app/game/content.ts";
import { BLESSING_BY_ID } from "../app/game/blessings.ts";

const context = (overrides = {}) => ({ chapter: 1, wave: 4, seed: 123, recentEventIds: [], resolvedEventIds: [], unplacedGuardianIds: [], ...overrides });

test("no ordinary event is currently guaranteed on a particular wave", () => {
  for (let chapter = 1; chapter <= 3; chapter++) {
    for (let wave = 1; wave <= 9; wave++) assert.equal(selectScheduledEvent(context({ chapter, wave })), null);
  }
  assert.ok(selectEventForWave(context({ wave: 2 })), "wave 2 may still draw from the random event pool");
});

test("pool eligibility respects chapter restrictions", () => {
  const chapterOne = new Set(eligiblePoolEvents(context({ chapter: 1 })).map(event => event.id));
  assert.ok(chapterOne.has("heart-tree-whisper"));
  assert.ok(chapterOne.has("moonlit-crossroads"));
  assert.ok(chapterOne.has("mushroom-circle"));
  assert.ok(!chapterOne.has("fallen-star"));
  assert.ok(!chapterOne.has("gloom-toll"));

  const chapterThree = new Set(eligiblePoolEvents(context({ chapter: 3 })).map(event => event.id));
  assert.ok(chapterThree.has("fallen-star"));
  assert.ok(chapterThree.has("gloom-toll"));
  assert.ok(!chapterThree.has("mushroom-circle"));
});

test("weighted pool selection responds to its random roll", () => {
  assert.equal(selectPooledEvent(context(), () => 0)?.id, "heart-tree-whisper");
  assert.equal(selectPooledEvent(context(), () => 0.999999)?.id, "mushroom-circle");
});

test("different run seeds can draw different eligible events", () => {
  const drawn = new Set(Array.from({ length: 80 }, (_, index) => selectPooledEvent(context({ chapter: 3, seed: index + 1 }))?.id));
  assert.ok(drawn.size > 1, "seeded event selection should not always return the same event");
});

test("the two most recent events are excluded when alternatives exist", () => {
  const selected = selectPooledEvent(context({ chapter: 2, recentEventIds: ["moonlit-crossroads", "mushroom-circle"] }), () => 0.999999);
  assert.equal(selected?.id, "fallen-star");
});

test("event and choice identifiers are unique and catalogue references are stable", () => {
  assert.equal(new Set(EVENTS.map(event => event.id)).size, EVENTS.length);
  for (const event of EVENTS) {
    assert.equal(EVENT_BY_ID[event.id], event);
    assert.equal(new Set(event.choices.map(choice => choice.id)).size, event.choices.length);
    assert.ok(event.choices.length >= 1);
    for (const choice of event.choices) {
      assert.ok(!choice.effects.some(effect => effect.type === "petals"), `${choice.id} must not award petals directly`);
      for (const effect of choice.effects.filter(effect => effect.type === "blessing")) assert.ok(BLESSING_BY_ID[effect.blessingId]);
      for (const effect of choice.effects.filter(effect => effect.type === "nextWave")) assert.ok(!("petalBonus" in effect), `${choice.id} must not add event-based wave petals`);
    }
  }
});

test("the aid event needs an unplaced guardian and cannot repeat", () => {
  assert.ok(!eligiblePoolEvents(context()).some(event => event.id === "call-for-aid"));
  assert.ok(eligiblePoolEvents(context({ unplacedGuardianIds: ["emberfox"] })).some(event => event.id === "call-for-aid"));
  assert.ok(!eligiblePoolEvents(context({ unplacedGuardianIds: ["emberfox"], resolvedEventIds: ["call-for-aid"] })).some(event => event.id === "call-for-aid"));
  assert.ok(!eligiblePoolEvents(context({ unplacedGuardianIds: ["emberfox"] })).some(event => event.id === "aid-answered"));
});

test("the aid event offers one send choice for every unplaced guardian form", () => {
  const guardians = [CRITTERS.find(critter => critter.id === "emberfox"), CRITTERS.find(critter => critter.id === "cinderpup")];
  const choices = choicesForEvent(EVENT_BY_ID["call-for-aid"], guardians);
  assert.deepEqual(choices.map(choice => choice.id), ["send-emberfox", "send-cinderpup", "cannot-spare-anyone"]);
});

test("the aid reward uses only unlocked Tier 2 guardians not yet gained this run", () => {
  const candidates = eligibleAidTierTwoGuardians(["cinderpup", "ripplefin", "thornshell"], { cinderpup: 1 });
  assert.deepEqual(candidates.map(critter => critter.id), ["ripplefin", "thornshell"]);
  const candidateIds = candidates.map(critter => critter.id);
  const first = tierTwoAidReward(123, 2, 6, "emberfox", candidateIds);
  const second = tierTwoAidReward(123, 2, 6, "emberfox", candidateIds);
  assert.equal(first.id, second.id);
  assert.equal(first.tier, 2);
  assert.ok(candidateIds.includes(first.id));
  assert.equal(tierTwoAidReward(123, 2, 6, "emberfox", []), null);
});

test("one-off event rewards do not become run Blessings", () => {
  const spring = EVENT_BY_ID["moonlit-crossroads"].choices.find(choice => choice.id === "listen-to-spring");
  const sporeDew = EVENT_BY_ID["mushroom-circle"].choices.find(choice => choice.id === "drink-spore-dew");
  assert.ok(spring.effects.some(effect => effect.type === "guardianCopy"));
  assert.ok(sporeDew.effects.some(effect => effect.type === "guardianCopy"));
  assert.ok(!spring.effects.some(effect => effect.type === "blessing"));
  assert.ok(!sporeDew.effects.some(effect => effect.type === "blessing"));
});
