import assert from "node:assert/strict";
import test from "node:test";

import { EVENT_BY_ID, EVENTS, eligiblePoolEvents, selectEventForWave, selectPooledEvent, selectScheduledEvent } from "../app/game/events.ts";
import { BLESSING_BY_ID } from "../app/game/blessings.ts";

const context = (overrides = {}) => ({ chapter: 1, wave: 4, seed: 123, recentEventIds: [], ...overrides });

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
    assert.ok(event.choices.length >= 2);
    for (const choice of event.choices) {
      for (const effect of choice.effects.filter(effect => effect.type === "blessing")) assert.ok(BLESSING_BY_ID[effect.blessingId]);
    }
  }
});

test("one-off event rewards do not become run Blessings", () => {
  const spring = EVENT_BY_ID["moonlit-crossroads"].choices.find(choice => choice.id === "listen-to-spring");
  const sporeDew = EVENT_BY_ID["mushroom-circle"].choices.find(choice => choice.id === "drink-spore-dew");
  assert.ok(spring.effects.some(effect => effect.type === "guardianCopy"));
  assert.ok(sporeDew.effects.some(effect => effect.type === "guardianCopy"));
  assert.ok(!spring.effects.some(effect => effect.type === "blessing"));
  assert.ok(!sporeDew.effects.some(effect => effect.type === "blessing"));
});
