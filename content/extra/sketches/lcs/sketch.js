// Longest Common Subsequence (dynamic programming).
// Ported from a py5 desktop visualizer: same DP table fill order (row by
// row down the second string), same recurrence. Two additions for the web
// version: a text panel to change the two strings, and a highlighted
// backtrace of one actual longest common subsequence once the table is full
// (the original only reported the length).

let str1 = "malina";
let str2 = "manila";

let dpValues = [];
let lcsPath = new Set();

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

  yield { aIndex: null, bIndex: null, dpIndex: null, lcsLen: -1, msg: "Solving longest common subsequence…" };

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      if (str1[i] === str2[j]) {
        const diag = i > 0 && j > 0 ? dpValues[(j - 1) * w + (i - 1)] : 0;
        dpValues[idx] = diag + 1;
      } else {
        const left = i > 0 ? dpValues[j * w + (i - 1)] : 0;
        const top = j > 0 ? dpValues[(j - 1) * w + i] : 0;
        dpValues[idx] = Math.max(left, top);
      }
      yield { aIndex: i, bIndex: j, dpIndex: idx, lcsLen: dpValues[idx], msg: `Comparing '${str1[i]}' with '${str2[j]}'` };
    }
  }

  const finalLen = w > 0 && h > 0 ? dpValues[w * h - 1] : 0;
  lcsPath = backtrackPath(w, h);
  yield { aIndex: null, bIndex: null, dpIndex: null, lcsLen: finalLen, msg: `Done — length of the longest common subsequence is ${finalLen}`, done: true };
}

function backtrackPath(w, h) {
  const path = new Set();
  let i = w - 1;
  let j = h - 1;
  while (i >= 0 && j >= 0) {
    if (str1[i] === str2[j]) {
      path.add(j * w + i);
      i--;
      j--;
    } else {
      const left = i > 0 ? dpValues[j * w + (i - 1)] : 0;
      const top = j > 0 ? dpValues[(j - 1) * w + i] : 0;
      if (left >= top) i--;
      else j--;
    }
  }
  return path;
}

function recomputeLayout() {
  const cols = str1.length + 1;
  const rows = str2.length + 1;
  cellSize = Math.max(18, Math.min(40, Math.floor(540 / cols), Math.floor(340 / rows)));
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  originX = width / 2 - gridW / 2 + cellSize / 2;
  originY = height / 2 - gridH / 2 + cellSize / 2;
}

function resetState() {
  gen = solveGen();
  currentState = null;
  lcsPath = new Set();
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

  // anchor corner
  drawCell(0, 0, "·", false, false);

  // header row: string A across the top
  for (let i = 0; i < w; i++) {
    drawCell(i + 1, 0, str1[i], currentState && currentState.aIndex === i, false);
  }

  // header column: string B down the left
  for (let j = 0; j < h; j++) {
    drawCell(0, j + 1, str2[j], currentState && currentState.bIndex === j, false);
  }

  // dp matrix
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const filled = currentState && (currentState.dpIndex > idx || (currentState.dpIndex === idx) || currentState.done);
      const label = filled ? dpValues[idx] : "";
      const isCurrent = currentState && currentState.dpIndex === idx && !currentState.done;
      const onPath = currentState && currentState.done && lcsPath.has(idx);
      drawCell(i + 1, j + 1, label, isCurrent, onPath);
    }
  }
}

function drawCell(col, row, label, highlighted, onPath) {
  const x = originX + col * cellSize;
  const y = originY + row * cellSize;

  if (onPath) {
    stroke(120, 220, 140);
    strokeWeight(3);
    fill(30, 55, 38);
  } else if (highlighted) {
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
