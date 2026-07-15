import { BOARD_SIZE, CHAPTERS } from "./content.ts";

export function generateChapterPath(seed: number, chapter: number, version: 1 | 2 = 2) {
  if (!seed) return CHAPTERS[chapter - 1].path;
  let state = (seed ^ Math.imul(chapter, 0x9e3779b9)) >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };

  if (version === 1) {
    const laneBands = [[0, 1], [2, 3], [4, 5], [6, 7]];
    const lanes = laneBands.map(band => band[Math.floor(random() * band.length)]);
    const legacyPath: number[] = [];
    let column = random() < 0.5 ? 0 : BOARD_SIZE - 1;
    let direction = column === 0 ? 1 : -1;
    lanes.forEach((lane, laneIndex) => {
      if (laneIndex > 0) {
        for (let connectorRow = lanes[laneIndex - 1] + 1; connectorRow <= lane; connectorRow++) legacyPath.push(connectorRow * BOARD_SIZE + column);
      } else {
        legacyPath.push(lane * BOARD_SIZE + column);
      }
      while (column + direction >= 0 && column + direction < BOARD_SIZE) {
        column += direction;
        legacyPath.push(lane * BOARD_SIZE + column);
      }
      direction *= -1;
    });
    const rotation = (seed + chapter) % 4;
    return legacyPath.map(cell => {
      const row = Math.floor(cell / BOARD_SIZE);
      const sourceColumn = cell % BOARD_SIZE;
      if (rotation === 1) return sourceColumn * BOARD_SIZE + (BOARD_SIZE - 1 - row);
      if (rotation === 2) return (BOARD_SIZE - 1 - row) * BOARD_SIZE + (BOARD_SIZE - 1 - sourceColumn);
      if (rotation === 3) return (BOARD_SIZE - 1 - sourceColumn) * BOARD_SIZE + row;
      return cell;
    });
  }

  const neighbours = (cell: number) => {
    const row = Math.floor(cell / BOARD_SIZE);
    const column = cell % BOARD_SIZE;
    return [row > 0 ? cell - BOARD_SIZE : -1, column < BOARD_SIZE - 1 ? cell + 1 : -1, row < BOARD_SIZE - 1 ? cell + BOARD_SIZE : -1, column > 0 ? cell - 1 : -1].filter(next => next >= 0);
  };
  const corners = [0, BOARD_SIZE - 1, BOARD_SIZE * (BOARD_SIZE - 1), BOARD_SIZE * BOARD_SIZE - 1];
  const startIndex = Math.floor(random() * corners.length);
  const start = corners[startIndex];
  const goal = corners[corners.length - 1 - startIndex];
  for (let attempt = 0; attempt < 100; attempt++) {
    const parent = new Int16Array(BOARD_SIZE * BOARD_SIZE).fill(-2);
    const visited = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
    const stack = [start];
    visited[start] = 1;
    parent[start] = -1;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const choices = neighbours(current).filter(cell => !visited[cell]);
      if (!choices.length) {
        stack.pop();
        continue;
      }
      const next = choices[Math.floor(random() * choices.length)];
      visited[next] = 1;
      parent[next] = current;
      stack.push(next);
    }
    const path: number[] = [];
    for (let cell = goal; cell >= 0; cell = parent[cell]) path.push(cell);
    path.reverse();
    let turns = 0;
    let straightRun = 1;
    let longestStraight = 1;
    for (let index = 2; index < path.length; index++) {
      if (path[index] - path[index - 1] !== path[index - 1] - path[index - 2]) {
        turns++;
        straightRun = 1;
      } else {
        straightRun++;
        longestStraight = Math.max(longestStraight, straightRun);
      }
    }
    if (path.length >= 30 && path.length <= 40 && turns >= 10 && longestStraight <= 6 && new Set(path).size === path.length) return path;
  }
  throw new Error("Unable to generate a clean winding path for this seed");
}

export function pathRouteClass(path: number[], index: number) {
  const current = path[index];
  const directionTo = (other: number | undefined) => {
    if (other === undefined) return "";
    if (other === current - BOARD_SIZE) return "n";
    if (other === current + BOARD_SIZE) return "s";
    if (other === current - 1) return "w";
    return "e";
  };
  const order = "nesw";
  const directions = [directionTo(path[index - 1]), directionTo(path[index + 1])].filter(Boolean).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return `route-${directions.join("")}`;
}

export const cellPoint = (cell: number) => ({
  x: (cell % BOARD_SIZE) * (100 / BOARD_SIZE) + 100 / BOARD_SIZE / 2,
  y: Math.floor(cell / BOARD_SIZE) * (100 / BOARD_SIZE) + 100 / BOARD_SIZE / 2,
});
