const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const MOVES = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const boardEl = $("#board");
const padEl = $("#pad");
const levelsEl = $("#levels");
const pausedEl = $("#paused");
const menu = $("#menu");
const result = $("#result");
const levelEl = $("#level");
const mistakesEl = $("#mistakes");
const timeEl = $("#time");
const hintsEl = $("#hints");

let level, solution, puzzle, v, notes, undoStack;
let mistakes, hints, selected, notesMode, over, paused, elapsed, last;

const makeButton = (text, value) => {
  const button = document.createElement("button");
  button.type = "button";
  button.value = value;
  button.textContent = text;
  return button;
};

const cells = Array.from({ length: 81 }, () => makeButton("", ""));
boardEl.append(...cells);
padEl.append(...DIGITS.map((d) => makeButton(d, d)));
levelsEl.append(
  ...Object.keys(CLUES).map((name, i, all) => {
    const button = makeButton("", name);
    const label = document.createElement("span");
    const position = document.createElement("small");
    label.textContent = name;
    position.textContent = `${i + 1}/${all.length}`;
    button.append(label, position);
    return button;
  }),
);

const fmt = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
const idle = () => !over && !paused && !menu.open && !result.open;
const isOpen = (i) => v[i] !== solution[i];
const noteText = (mask) =>
  DIGITS.map(
    (d, k) =>
      ((mask >> k) & 1 ? d : "\u2007") +
      (k % 3 === 2 ? (k < 8 ? "\n" : "") : " "),
  ).join("");

function tick() {
  const now = performance.now();
  if (!over && !paused) elapsed += now - last;
  last = now;
  timeEl.textContent = fmt(elapsed);
}

function render() {
  const digit = selected >= 0 ? v[selected] : 0;
  const placed = Array(10).fill(0);
  v.forEach((d, i) => {
    if (d === solution[i]) placed[d]++;
  });

  cells.forEach((cell, i) => {
    const d = v[i];
    const classes = ["cell"];
    if (puzzle[i]) classes.push("given");
    else if (d && d !== solution[i]) classes.push("wrong");
    if (i === selected) classes.push("selected");
    else if (digit && d === digit) classes.push("same");
    else if (selected >= 0 && PEERS[selected].includes(i)) classes.push("peer");
    if (!d && notes[i]) classes.push("notes");

    cell.className = classes.join(" ");
    cell.textContent = d || (notes[i] ? noteText(notes[i]) : "");
    cell.tabIndex = i === Math.max(selected, 0) ? 0 : -1;
    cell.setAttribute(
      "aria-label",
      `Row ${row(i) + 1}, column ${col(i) + 1}, ${d || "empty"}`,
    );
  });

  levelEl.textContent = level;
  mistakesEl.textContent = `${mistakes}/${MAX_MISTAKES}`;
  hintsEl.textContent = hints;
  $("#undo").disabled = over || !undoStack.length;
  $("#hint").disabled = over || hints === 0;
  $("#pause").disabled = over;
  $("#erase").disabled = over;
  $("#notes").disabled = over;
  $("#notes").setAttribute("aria-pressed", notesMode);
  [...padEl.children].forEach((button, k) => {
    button.disabled = over || placed[k + 1] === 9;
  });
}

function setPaused(on) {
  tick();
  paused = on;
  pausedEl.hidden = !on;
  if (on) $("#resume").focus();
}

function reset() {
  v = [...puzzle];
  notes = Array(81).fill(0);
  undoStack = [];
  mistakes = 0;
  hints = MAX_HINTS;
  selected = -1;
  notesMode = false;
  over = false;
  elapsed = 0;
  last = performance.now();
  setPaused(false);
  render();
}

function newGame(name) {
  level = name;
  ({ solution, puzzle } = generate(name));
  reset();
}

function finish(title, detail) {
  tick();
  over = true;
  $("#result-title").textContent = title;
  $("#result-detail").textContent = `${detail}Time ${fmt(elapsed)}`;
  render();
  setTimeout(() => over && result.showModal(), 400);
}

function check() {
  if (mistakes >= MAX_MISTAKES) finish("Game over", "Three mistakes. ");
  else if (v.every((d, i) => d === solution[i])) finish("Solved!", "");
  else render();
}

const remember = (i) => undoStack.push({ i, value: v[i], mask: notes[i] });
const dropNote = (i, d) =>
  PEERS[i].forEach((j) => {
    notes[j] &= ~(1 << (d - 1));
  });

function select(i) {
  selected = i;
  render();
  cells[i].focus();
}

function enter(d) {
  const i = selected;
  if (!idle() || i < 0 || !isOpen(i)) return;
  if (notesMode) {
    if (v[i]) return;
    remember(i);
    notes[i] ^= 1 << (d - 1);
  } else {
    remember(i);
    v[i] = d;
    notes[i] = 0;
    if (d === solution[i]) dropNote(i, d);
    else mistakes++;
  }
  check();
}

function erase() {
  const i = selected;
  if (!idle() || i < 0 || !isOpen(i) || !(v[i] || notes[i])) return;
  remember(i);
  v[i] = 0;
  notes[i] = 0;
  render();
}

function undo() {
  if (!idle() || !undoStack.length) return;
  const { i, value, mask } = undoStack.pop();
  v[i] = value;
  notes[i] = mask;
  selected = i;
  render();
}

function giveHint() {
  if (!idle() || hints === 0) return;
  const open = cells.map((_, i) => i).filter(isOpen);
  const target = open.includes(selected)
    ? selected
    : open.reduce((a, b) =>
        options(v, b).length < options(v, a).length ? b : a,
      );
  v[target] = solution[target];
  notes[target] = 0;
  dropNote(target, solution[target]);
  selected = target;
  hints--;
  check();
}

function reveal() {
  v = [...solution];
  notes.fill(0);
  finish("Solution shown", "");
}

function openMenu() {
  [...levelsEl.children].forEach((button) =>
    button.toggleAttribute("aria-current", button.value === level),
  );
  menu.showModal();
}

// Board and keyboard
boardEl.addEventListener("click", (e) => {
  const i = cells.indexOf(e.target.closest(".cell"));
  if (i >= 0 && idle()) select(i);
});
boardEl.addEventListener("keydown", (e) => {
  const move = MOVES[e.key];
  if (!move || !idle()) return;
  e.preventDefault();
  const i = cells.indexOf(e.target);
  const r = row(i) + move[0];
  const c = col(i) + move[1];
  if (Math.min(r, c) >= 0 && Math.max(r, c) < 9) select(r * 9 + c);
});
document.addEventListener("keydown", (e) => {
  if (/^[1-9]$/.test(e.key)) enter(+e.key);
  else if (e.key === "Backspace" || e.key === "Delete") erase();
});
padEl.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (button) enter(+button.value);
});

// Actions
$("#undo").addEventListener("click", undo);
$("#erase").addEventListener("click", erase);
$("#hint").addEventListener("click", giveHint);
$("#notes").addEventListener("click", () => {
  notesMode = !notesMode;
  render();
});
$("#pause").addEventListener("click", () => setPaused(true));
$("#resume").addEventListener("click", () => setPaused(false));
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !over) setPaused(true);
});
setInterval(tick, 1000);

// Dialogs
$("#new-game").addEventListener("click", openMenu);
levelsEl.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  menu.close();
  newGame(button.value);
});
$("#restart").addEventListener("click", () => {
  menu.close();
  reset();
});
$("#solve").addEventListener("click", () => {
  menu.close();
  reveal();
});
$("#result-restart").addEventListener("click", () => {
  result.close();
  reset();
});
$("#result-new").addEventListener("click", () => {
  result.close();
  openMenu();
});
[menu, result].forEach((dialog) =>
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  }),
);

// Theme: follows the system until the toggle is used, then remembers the choice.
const syncThemeColor = () => {
  $("meta[name=theme-color]").content = getComputedStyle(
    document.body,
  ).backgroundColor;
};
let saved = null;
try {
  saved = localStorage.getItem("theme");
} catch {
  /* storage blocked */
}
if (saved) root.dataset.theme = saved;
syncThemeColor();
$("#theme").addEventListener("click", () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  syncThemeColor();
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch {
    /* storage blocked */
  }
});

newGame("medium");
