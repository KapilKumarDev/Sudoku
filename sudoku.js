// Puzzle logic only, no DOM. A board is a flat array of 81 numbers: 1-9, or 0 for empty.
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Clue targets. Hard stops early if removing one more clue would break uniqueness.
const CLUES = { easy: 40, medium: 32, hard: 25 };

const row = (i) => Math.floor(i / 9);
const col = (i) => i % 9;
const box = (i) => 3 * Math.floor(row(i) / 3) + Math.floor(col(i) / 3);

// Cells sharing a row, column or box with each cell. Fixed, so computed once.
const PEERS = Array.from({ length: 81 }, (_, i) =>
  [...Array(81).keys()].filter(
    (j) =>
      j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i)),
  ),
);

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const options = (b, i, digits = DIGITS) =>
  digits.filter((d) => !PEERS[i].some((p) => b[p] === d));

// Depth-first search on the empty cell with the fewest options.
// Returns how many solutions it found, stopping at `cap`.
// When it returns `cap`, b holds the last solution found; otherwise b is unchanged.
function solve(b, cap = 1, digits = DIGITS) {
  let target = -1;
  let targetOptions = [];
  for (let i = 0; i < 81; i++) {
    if (b[i]) continue;
    const o = options(b, i, digits);
    if (target < 0 || o.length < targetOptions.length) {
      target = i;
      targetOptions = o;
      if (o.length < 2) break;
    }
  }
  if (target < 0) return 1;

  let found = 0;
  for (const d of targetOptions) {
    b[target] = d;
    found += solve(b, cap - found, digits);
    if (found >= cap) return found;
    b[target] = 0;
  }
  return found;
}

// Full random grid, then remove cells one by one, keeping only removals that leave exactly one solution.
function generate(level) {
  const solution = Array(81).fill(0);
  solve(solution, 1, shuffle(DIGITS));

  const puzzle = [...solution];
  let clues = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (clues === CLUES[level]) break;
    const kept = puzzle[i];
    puzzle[i] = 0;
    if (solve([...puzzle], 2) === 1) clues--;
    else puzzle[i] = kept;
  }
  return { solution, puzzle };
}
