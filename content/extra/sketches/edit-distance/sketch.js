// Edit Distance (Levenshtein), dynamic programming.
// Ported from a py5 desktop visualizer: same DP table, same fill order and
// recurrence (insert / delete / substitute, each cost 1) as solver.py, with
// a panel added to change the two words. The source project also had a
// separate bit-parallel approximate string search demo (searching for a
// pattern inside a block of text) — that's a different feature and was left
// out of this pass; this sketch is the core DP visualizer only.

let str1 = "House";
let str2 = "Logarithm";

let dpValues = [];

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 6;

let cellSize = 32;
let originX = 0;
let originY = 0;

let playBtn, statusEl, inputA, inputB;

function* solveGen() {
  const w = str1.length;
  const h = str2.length;
  dpValues = new Array(w * h).fill(0);

  yield { aIndex: null, bIndex: null, dpIndex: null, dist: -1, msg: "Solving edit distance…" };

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const diag = i > 0 && j > 0 ? dpValues[(j - 1) * w + (i - 1)] : Math.max(i, j);

      if (str1[i] !== str2[j]) {
        const fromLeft = i > 0 ? dpValues[j * w + (i - 1)] : j + 1; // same row, previous column
        const fromTop = j > 0 ? dpValues[(j - 1) * w + i] : i + 1; // previous row, same column
        dpValues[idx] = 1 + Math.min(diag, fromLeft, fromTop);
      } else {
        dpValues[idx] = diag;
      }

      yield { aIndex: i, bIndex: j, dpIndex: idx, dist: dpValues[idx], msg: `Comparing '${str1[i]}' with '${str2[j]}'` };
    }
  }

  const finalDist = w > 0 && h > 0 ? dpValues[w * h - 1] : Math.max(w, h);
  yield { aIndex: null, bIndex: null, dpIndex: null, dist: finalDist, msg: `Done — edit (Levenshtein) distance is ${finalDist}`, done: true };
}

function recomputeLayout() {
  const cols = str1.length + 1;
  const rows = str2.length + 1;
  cellSize = Math.max(16, Math.min(38, Math.floor(540 / cols), Math.floor(340 / rows)));
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  originX = width / 2 - gridW / 2 + cellSize / 2;
  originY = height / 2 - gridH / 2 + cellSize / 2;
}

function resetState() {
  gen = solveGen();
  currentState = null;
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  updateStatus("Ready — press Play or Step.");
  recomputeLayout();
}

function stepOnce() {
  if (!gen) return;
  const res = gen.next();
  if (!res.done) {
    currentState = res.value;
    updateStatus(currentState.msg);
    if (currentState.done) {
      playing = false;
      if (playBtn) playBtn.textContent = "Play";
    }
  }
}

function updateStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function sanitizeWord(text, fallback) {
  const cleaned = text.replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
  return cleaned.length > 0 ? cleaned : fallback;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");

  const row1 = panelRow(holder);
  inputA = panelTextInput(row1, {
    label: "String A",
    value: str1,
    maxLength: 10,
    onChange: (text) => {
      str1 = sanitizeWord(text, str1);
      inputA.value = str1;
      resetState();
    },
  });
  inputB = panelTextInput(row1, {
    label: "String B",
    value: str2,
    maxLength: 10,
    onChange: (text) => {
      str2 = sanitizeWord(text, str2);
      inputB.value = str2;
      resetState();
    },
  });

  const row2 = panelRow(holder);
  playBtn = panelButton(row2, "Play", togglePlay);
  panelButton(row2, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(row2, "Restart", resetState);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Letters only, up to 10 characters each.";
  holder.appendChild(hint);

  statusEl = panelStatusLine(holder);
}

function setup() {
  const cnv = createCanvas(600, 400);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  background(15, 15, 20);

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }

  drawGrid();
}

function drawGrid() {
  const w = str1.length;
  const h = str2.length;

  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(cellSize * 0.42);

  drawCell(0, 0, "·", false);

  for (let i = 0; i < w; i++) {
    drawCell(i + 1, 0, str1[i], currentState && currentState.aIndex === i);
  }

  for (let j = 0; j < h; j++) {
    drawCell(0, j + 1, str2[j], currentState && currentState.bIndex === j);
  }

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const filled = currentState && (currentState.dpIndex >= idx || currentState.done);
      const label = filled ? dpValues[idx] : "";
      const isCurrent = currentState && currentState.dpIndex === idx && !currentState.done;
      drawCell(i + 1, j + 1, label, isCurrent);
    }
  }
}

function drawCell(col, row, label, highlighted) {
  const x = originX + col * cellSize;
  const y = originY + row * cellSize;

  if (highlighted) {
    stroke(255, 165, 0);
    strokeWeight(3);
    fill(255, 165, 0);
  } else {
    stroke(70, 70, 80);
    strokeWeight(1);
    fill(22, 22, 28);
  }
  rect(x, y, cellSize, cellSize, 3);

  noStroke();
  fill(highlighted ? 30 : 225);
  text(label, x, y);
}
