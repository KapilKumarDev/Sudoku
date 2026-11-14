const qs = (s) => document.querySelector(s);
const board = qs('#sudoku-board');
const modal = qs('#win-modal');
const modalTitle = qs('#modal-title');
const errorCountEl = qs('#error-count');
const hintCountEl = qs('#hint-count');
const hintBtn = qs('#hint-btn');

let cells = [];
let solution = [];
let errorCount = 0;
let hintCount = 3;
let lastFocused = -1;
const MAX_ERRORS = 3;
const MAX_HINTS = 3;

function init() {
    board.innerHTML = '';
    errorCount = 0;
    hintCount = MAX_HINTS;
    lastFocused = -1;
    errorCountEl.textContent = 0;
    hintCountEl.textContent = MAX_HINTS;
    hintBtn.disabled = false;
    hintBtn.textContent = `Hint (${MAX_HINTS} left)`;

    cells = Array.from({ length: 81 }, (_, i) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'cell';
        input.addEventListener('input', (e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            e.target.value = (digit >= '1' && digit <= '9') ? digit : '';
            onCellInput(i);
        });
        input.addEventListener('keydown', (e) => {
            const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
            if (!(e.key in moves)) return;
            e.preventDefault();
            const next = i + moves[e.key];
            const sameRow = Math.abs(moves[e.key]) !== 1 || Math.floor(next / 9) === Math.floor(i / 9);
            if (next >= 0 && next < 81 && sameRow) cells[next].focus();
        });
        input.addEventListener('focus', () => { lastFocused = i; highlight(i, true); });
        input.addEventListener('blur', () => { highlight(i, false); });
        board.appendChild(input);
        return input;
    });
}

function onCellInput(i) {
    const val = cells[i].value;
    if (val && val !== solution[i]) {
        errorCount++;
        errorCountEl.textContent = errorCount;
        if (errorCount >= MAX_ERRORS) {
            modalTitle.textContent = 'Game Over!';
            modal.classList.remove('hidden');
            return;
        }
    }
    validate();
    checkWin();
}

function highlight(idx, on) {
    const r = Math.floor(idx / 9), c = idx % 9;
    cells.forEach((cell, i) => {
        cell.classList.toggle('highlight-cross', on && (Math.floor(i / 9) === r || i % 9 === c));
    });
}

function isValid(b, r, c, v) {
    for (let i = 0; i < 9; i++) {
        if (i !== c && b[r * 9 + i] === v) return false;
        if (i !== r && b[i * 9 + c] === v) return false;
        const br = r - (r % 3) + Math.floor(i / 3);
        const bc = c - (c % 3) + (i % 3);
        if ((br !== r || bc !== c) && b[br * 9 + bc] === v) return false;
    }
    return true;
}

function validate() {
    const b = cells.map(c => c.value);
    cells.forEach((cell, i) => {
        cell.classList.remove('error');
        if (b[i] && !isValid(b, Math.floor(i / 9), i % 9, b[i])) {
            cell.classList.add('error');
        }
    });
}

function checkWin() {
    if (cells.every(c => c.value) && !qs('.error')) {
        modalTitle.textContent = 'You Won!';
        modal.classList.remove('hidden');
    }
}

function solve(b, i = 0) {
    while (i < 81 && b[i]) i++;
    if (i === 81) return true;
    const r = Math.floor(i / 9), c = i % 9;
    for (let v = 1; v <= 9; v++) {
        const s = v.toString();
        if (isValid(b, r, c, s)) {
            b[i] = s;
            if (solve(b, i + 1)) return true;
            b[i] = '';
        }
    }
    return false;
}

function generate() {
    init();
    const b = Array(81).fill('');
    for (let i = 0; i < 9; i += 3) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (let j = 0; j < 9; j++) {
            b[(i + Math.floor(j / 3)) * 9 + (i + j % 3)] = nums[j].toString();
        }
    }
    solve(b);
    solution = [...b];
    const clues = { easy: 40, medium: 30, hard: 20 }[qs('#difficulty').value];
    let toRemove = 81 - clues;
    while (toRemove > 0) {
        const idx = Math.floor(Math.random() * 81);
        if (b[idx]) { b[idx] = ''; toRemove--; }
    }
    cells.forEach((cell, i) => {
        cell.value = b[i];
        if (b[i]) cell.classList.add('read-only');
    });
    modal.classList.add('hidden');
}

function hint() {
    if (hintCount <= 0) return;
    let idx = -1;
    if (lastFocused !== -1 && !cells[lastFocused].value && !cells[lastFocused].classList.contains('read-only')) {
        idx = lastFocused;
    } else {
        let minOptions = 10;
        const b = cells.map(c => c.value);
        cells.forEach((cell, i) => {
            if (cell.value || cell.classList.contains('read-only')) return;
            let count = 0;
            for (let v = 1; v <= 9; v++) {
                if (isValid(b, Math.floor(i / 9), i % 9, v.toString())) count++;
            }
            if (count < minOptions) { minOptions = count; idx = i; }
        });
    }
    if (idx === -1) return;
    cells[idx].value = solution[idx];
    cells[idx].classList.add('read-only');
    hintCount--;
    hintCountEl.textContent = hintCount;
    hintBtn.textContent = `Hint (${hintCount} left)`;
    if (hintCount === 0) hintBtn.disabled = true;
    validate();
    checkWin();
}

qs('#generate-btn').addEventListener('click', generate);
qs('#difficulty').addEventListener('change', generate);
qs('#modal-new-btn').addEventListener('click', generate);
qs('#hint-btn').addEventListener('click', hint);

qs('#clear-btn').addEventListener('click', () => {
    cells.forEach(c => { if (!c.classList.contains('read-only')) c.value = ''; });
    validate();
    modal.classList.add('hidden');
});
qs('#modal-replay-btn').addEventListener('click', () => {
    cells.forEach(c => { if (!c.classList.contains('read-only')) c.value = ''; });
    errorCount = 0;
    errorCountEl.textContent = 0;
    validate();
    modal.classList.add('hidden');
});

qs('#solve-btn').addEventListener('click', () => {
    if (qs('.error')) { alert('Fix highlighted errors before solving.'); return; }
    cells.forEach((c, i) => { c.value = solution[i]; });
    validate();
    modalTitle.textContent = 'Solved!';
    modal.classList.remove('hidden');
});

generate();
