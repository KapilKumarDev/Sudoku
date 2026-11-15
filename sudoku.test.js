// Run: node sudoku.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/sudoku.js`, 'utf8');
const { generate, solve, CLUES, PEERS } = vm.runInNewContext(`${source};({ generate, solve, CLUES, PEERS })`);

for (const level of Object.keys(CLUES)) {
    for (let run = 0; run < 3; run++) {
        const { solution, puzzle } = generate(level);
        const clues = puzzle.filter(Boolean).length;

        assert(solution.every((d, i) => d >= 1 && d <= 9 && PEERS[i].every((p) => solution[p] !== d)), `${level}: invalid solution`);
        assert(puzzle.every((d, i) => d === 0 || d === solution[i]), `${level}: clue differs from solution`);
        assert.equal(solve([...puzzle], 2), 1, `${level}: puzzle is not unique`);
        assert(clues >= CLUES[level] && clues <= CLUES[level] + 3, `${level}: ${clues} clues`);
    }
}
console.log('ok');