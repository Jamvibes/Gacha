import assert from "node:assert/strict";
import test from "node:test";

import { BOARD_SIZE, CHAPTERS, CRITTERS } from "../app/game/content.ts";
import { cellPoint, generateChapterPath, pathProgressPoint, pathRouteClass } from "../app/game/map.ts";

const corners = new Set([0, BOARD_SIZE - 1, BOARD_SIZE * (BOARD_SIZE - 1), BOARD_SIZE * BOARD_SIZE - 1]);

function assertValidPath(path) {
  assert.ok(path.length >= 30 && path.length <= 40, `expected 30-40 path cells, received ${path.length}`);
  assert.equal(new Set(path).size, path.length, "path must not visit a tile twice");
  assert.ok(corners.has(path[0]), "path must begin in a corner");
  assert.ok(corners.has(path.at(-1)), "path must end in a corner");

  for (let index = 1; index < path.length; index++) {
    const difference = Math.abs(path[index] - path[index - 1]);
    assert.ok(difference === 1 || difference === BOARD_SIZE, `cells ${path[index - 1]} and ${path[index]} must be adjacent`);
    if (difference === 1) assert.equal(Math.floor(path[index] / BOARD_SIZE), Math.floor(path[index - 1] / BOARD_SIZE), "horizontal steps may not wrap around the board");
  }
}

test("critter catalogue has stable ids and valid evolution links", () => {
  const ids = new Set(CRITTERS.map(critter => critter.id));
  assert.equal(ids.size, CRITTERS.length, "critter ids must be unique");

  for (const critter of CRITTERS) {
    if (!critter.upgradeOf) continue;
    const parent = CRITTERS.find(option => option.id === critter.upgradeOf);
    assert.ok(parent, `${critter.id} must reference an existing evolution parent`);
    assert.equal(critter.tier, parent.tier + 1, `${critter.id} must be exactly one tier above its parent`);
    assert.equal(critter.faction, parent.faction, `${critter.id} must remain in its evolution family's faction`);
  }
});

test("procedural maps are deterministic and obey the route rules", () => {
  for (let chapter = 1; chapter <= CHAPTERS.length; chapter++) {
    for (let seed = 1; seed <= 40; seed++) {
      const path = generateChapterPath(seed, chapter);
      assert.deepEqual(path, generateChapterPath(seed, chapter), "the same seed must reproduce the same map");
      assertValidPath(path);

      for (let index = 0; index < path.length; index++) {
        assert.match(pathRouteClass(path, index), /^route-(n|e|s|w|ne|ns|nw|es|ew|sw)$/);
      }
    }
  }
});

test("zero seed retains each chapter's authored fallback map", () => {
  for (const chapter of CHAPTERS) {
    assert.deepEqual(generateChapterPath(0, chapter.number), chapter.path);
  }
});

test("enemy path progress interpolates continuously between tile centres", () => {
  const path = [0, 1, 9];
  const first = cellPoint(0);
  const second = cellPoint(1);
  const third = cellPoint(9);
  assert.deepEqual(pathProgressPoint(path, 0), first);
  assert.deepEqual(pathProgressPoint(path, 0.5), { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  assert.deepEqual(pathProgressPoint(path, 1.5), { x: (second.x + third.x) / 2, y: (second.y + third.y) / 2 });
  assert.deepEqual(pathProgressPoint(path, 99), third);
});
