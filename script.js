const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const MOVES = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

const $ = (selector) => document.querySelector(selector);
const boardEl = $('#board');
const statusEl = $('#status');
const mistakesEl = $('#mistakes');
const hintsEl = $('#hints');
const hintBtn = $('#hint');
const difficultyEl = $('#difficulty');

let solution, puzzle;
let mistakes, hints, selected, over;

const cells = Array.from({ length: 81 }, (_, i) => {
    const cell = document.createElement('input');
    cell.type = 'text';
    cell.inputMode = 'numeric';
    cell.autocomplete = 'off';
    cell.setAttribute('aria-label', `Row ${row(i) + 1}, column ${col(i) + 1}`);
    return cell;
});
boardEl.append(...cells);

function render() {
    mistakesEl.textContent = `${mistakes} / ${MAX_MISTAKES}`;
    hintsEl.textContent = hints;
    hintBtn.disabled = over || hints === 0;
}

function reset() {
    mistakes = 0;
    hints = MAX_HINTS;
    selected = -1;
    over = false;
    cells.forEach((cell, i) => {
        cell.value = puzzle[i] || '';
        cell.readOnly = puzzle[i] !== 0;
        cell.className = puzzle[i] ? 'cell given' : 'cell';
    });
    statusEl.textContent = '';
    render();
}

function newGame() {
    ({ solution, puzzle } = generate(difficultyEl.value));
    reset();
}

function finish(message) {
    over = true;
    cells.forEach((cell) => { cell.readOnly = true; });
    statusEl.textContent = message;
    render();
}

function check() {
    if (mistakes >= MAX_MISTAKES) finish('Out of mistakes. Restart or start a new game.');
    else if (cells.every((cell, i) => +cell.value === solution[i])) finish('Solved. Well done.');
    else render();
}

function highlight(i) {
    selected = i;
    cells.forEach((cell, j) => {
        cell.classList.toggle('selected', j === i);
        cell.classList.toggle('peer', PEERS[i].includes(j));
    });
}

function enter(i) {
    const cell = cells[i];
    cell.value = cell.value.replace(/[^1-9]/g, '').slice(-1);
    const wrong = cell.value !== '' && +cell.value !== solution[i];
    cell.classList.toggle('wrong', wrong);
    if (wrong) mistakes++;
    check();
}

function giveHint() {
    const board = cells.map((cell) => +cell.value);
    const open = [...cells.keys()].filter((i) => !cells[i].readOnly && board[i] !== solution[i]);
    const target = open.includes(selected)
        ? selected
        : open.reduce((a, b) => (options(board, b).length < options(board, a).length ? b : a));

    cells[target].value = solution[target];
    cells[target].readOnly = true;
    cells[target].classList.remove('wrong');
    cells[target].classList.add('hinted');
    hints--;
    check();
}

boardEl.addEventListener('focusin', (e) => highlight(cells.indexOf(e.target)));
boardEl.addEventListener('input', (e) => enter(cells.indexOf(e.target)));
boardEl.addEventListener('keydown', (e) => {
    const move = MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    const i = cells.indexOf(e.target);
    const r = row(i) + move[0];
    const c = col(i) + move[1];
    if (Math.min(r, c) >= 0 && Math.max(r, c) < 9) cells[r * 9 + c].focus();
});

$('#new-game').addEventListener('click', newGame);
difficultyEl.addEventListener('change', newGame);
$('#restart').addEventListener('click', reset);
hintBtn.addEventListener('click', giveHint);
$('#solve').addEventListener('click', () => {
    cells.forEach((cell, i) => {
        cell.value = solution[i];
        cell.classList.remove('wrong');
    });
    finish('Solution shown.');
});

newGame();