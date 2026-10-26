// Freivalds' algorithm: checking whether A*B = C without ever computing
// the product. Instead of the O(n^3) (or O(n^2.807), with Strassen) cost
// of actually multiplying, pick a random 0/1 vector r and compare A(Br)
// against Cr -- two matrix-VECTOR products, O(n^2) total. If A*B really
// does equal C, this always matches. If it doesn't, it still might match
// by chance, but Freivalds proved that can happen for at most half of all
// possible r -- so repeating the trial drives the odds of being fooled
// down to 2^-k for k independent trials.
//
// This sketch runs actual trials against real matrices: A and B are
// random, and C is either set to the true product (the "correct" case)
// or to the true product with one entry deliberately changed (the
// "wrong" case, guaranteed A*B != C). Running many trials against a
// wrong C is the live version of the proof on the Why it works tab --
// the false-"yes" rate should track its <= 50%-per-trial bound.

let n = 5; // matrix size, 2..10
let A = null;
let B = null;
let trueC = null; // the real product A*B
let wrongC = null; // trueC with one entry changed
let cMode = "correct"; // "correct" | "wrong"

// current trial's vectors
let r = null;
let Br = null;
let ABr = null; // A * (B * r)
let Cr = null;
let matched = null; // true/false once a trial has run, else null

let trials = 0;
let yesCount = 0;
let noCount = 0;
// only meaningful in "wrong" mode: how many of those trials incorrectly said "yes"
let falseYesCount = 0;

let cnv = null;
let theme = null;

let matchColor = [90, 195, 120];
let mismatchColor = [235, 90, 90];
const VEC_COLOR = [110, 150, 230];

let statusEl, statsEl, cSelect;

// ---- matrix/vector helpers ----

function zeros(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function randomMatrix(rows, cols) {
  const m = zeros(rows, cols);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) m[i][j] = 1 + Math.floor(Math.random() * 9);
  return m;
}

function multiply(X, Y) {
  const rows = X.length,
    inner = Y.length,
    cols = Y[0].length;
  const out = zeros(rows, cols);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < inner; k++) s += X[i][k] * Y[k][j];
      out[i][j] = s;
    }
  return out;
}

function randomVector01(len) {
  const v = zeros(len, 1);
  for (let i = 0; i < len; i++) v[i][0] = Math.random() < 0.5 ? 0 : 1;
  return v;
}

function vecEqual(u, v) {
  for (let i = 0; i < u.length; i++) if (u[i][0] !== v[i][0]) return false;
  return true;
}

function perturb(mat) {
  const out = mat.map((row) => row.slice());
  const i = Math.floor(Math.random() * out.length);
  const j = Math.floor(Math.random() * out[0].length);
  let delta = 0;
  while (delta === 0) delta = Math.floor(Math.random() * 11) - 5; // -5..5, excluding 0
  out[i][j] += delta;
  return out;
}

function currentC() {
  return cMode === "correct" ? trueC : wrongC;
}

// ---- state setup ----

function newMatrices() {
  A = randomMatrix(n, n);
  B = randomMatrix(n, n);
  trueC = multiply(A, B);
  wrongC = perturb(trueC);
  resetTally();
  clearTrial();
}

function clearTrial() {
  r = null;
  Br = null;
  ABr = null;
  Cr = null;
  matched = null;
  updateStatus("Ready -- press Run trial.");
}

function resetTally() {
  trials = 0;
  yesCount = 0;
  noCount = 0;
  falseYesCount = 0;
  updateStats();
}

function runTrial() {
  r = randomVector01(n);
  Br = multiply(B, r);
  ABr = multiply(A, Br);
  Cr = multiply(currentC(), r);
  matched = vecEqual(ABr, Cr);
  trials++;
  if (matched) {
    yesCount++;
    if (cMode === "wrong") falseYesCount++;
  } else {
    noCount++;
  }
  const verdict = matched ? "“Yes, A×B = C”" : "“No, A×B ≠ C”";
  const truth = cMode === "correct" ? "C really is A×B" : "C was deliberately changed, so A×B ≠ C";
  updateStatus(`Trial ${trials}: ${verdict} -- and ${truth}, so that's ${matched === (cMode === "correct") ? "correct" : "a false positive (as the theorem allows, at most half the time)"}.`);
  updateStats();
}

function runManyTrials(count) {
  for (let i = 0; i < count; i++) runTrial();
}

function updateStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function updateStats() {
  if (!statsEl) return;
  let extra = "";
  if (cMode === "wrong" && trials > 0) {
    const rate = ((falseYesCount / trials) * 100).toFixed(1);
    extra = `   False "yes" rate: ${falseYesCount}/${trials} = ${rate}% (theory: ≤ 50% per trial)`;
  }
  statsEl.textContent = `Trials: ${trials}   Yes: ${yesCount}   No: ${noCount}${extra}`;
}

// ---- control panel ----

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Matrices");
  const rowSize = panelRow(holder);
  panelSlider(rowSize, {
    label: "Size (n)",
    min: 2,
    max: 10,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
      newMatrices();
    },
  });
  const rowRandom = panelRow(holder);
  rowRandom.classList.add("buttons");
  panelButton(rowRandom, "Randomize A, B", () => {
    newMatrices();
  });

  panelHeading(holder, "Is C correct?");
  const rowC = panelRow(holder);
  cSelect = panelSelect(rowC, {
    label: "C is",
    options: [
      { value: "correct", label: "Correct (C = A×B)" },
      { value: "wrong", label: "Wrong (one entry changed)" },
    ],
    value: cMode,
    onChange: (v) => {
      cMode = v;
      resetTally();
      clearTrial();
    },
  });

  panelHeading(holder, "Trials");
  const rowTrial = panelRow(holder);
  rowTrial.classList.add("buttons");
  panelButton(rowTrial, "Run trial", runTrial);
  panelButton(rowTrial, "Run 100 trials", () => runManyTrials(100));
  panelButton(rowTrial, "Reset tally", resetTally);

  panelHeading(holder, "Appearance");
  const rowColor = panelRow(holder);
  panelColor(rowColor, {
    label: "Match color",
    value: matchColor,
    onChange: (rgb) => {
      matchColor = rgb;
    },
  });
  panelColor(rowColor, {
    label: "Mismatch color",
    value: mismatchColor,
    onChange: (rgb) => {
      mismatchColor = rgb;
    },
  });

  const legend = document.createElement("div");
  legend.className = "hint";
  legend.textContent =
    "Each trial picks a fresh random 0/1 vector r, computes A(Br) and Cr -- two matrix-vector products, O(n²) each -- and checks whether they match. A match always happens when C really is A×B; when it isn't, a match can still happen by chance, but for at most half of all possible r.";
  holder.appendChild(legend);

  statsEl = document.createElement("div");
  statsEl.className = "hint";
  holder.appendChild(statsEl);

  statusEl = panelStatusLine(holder);
}

// ---- p5 lifecycle ----

function setup() {
  cnv = createCanvas(700, 560);
  cnv.parent("sketch-holder");
  newMatrices();
  buildPanel();
  updateStats();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  drawMatrices();
  drawVectorChain();
}

function drawGrid(m, x, y, boxSize, label, col) {
  const rows = m.length,
    cols = m[0].length;
  const cellW = boxSize / cols;
  const cellH = boxSize / rows;
  fill(col[0], col[1], col[2]);
  noStroke();
  textAlign(CENTER);
  textSize(12);
  text(label, x + boxSize / 2, y - 8);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cx = x + j * cellW;
      const cy = y + i * cellH;
      stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
      strokeWeight(1);
      fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
      rect(cx, cy, cellW, cellH);
      noStroke();
      fill(theme.text[0], theme.text[1], theme.text[2]);
      textSize(constrain(Math.min(cellW, cellH) * 0.38, 6, 13));
      text(m[i][j], cx + cellW / 2, cy + cellH / 2 + 4);
    }
  }
}

function drawMatrices() {
  const boxSize = Math.min(170, (width - 4 * 30) / 3);
  const y = 30;
  drawGrid(A, 24, y, boxSize, "A", [90, 140, 220]);
  drawGrid(B, 24 + boxSize + 30, y, boxSize, "B", [197, 139, 224]);
  const cLabel = cMode === "correct" ? "C (= A×B)" : "C (wrong)";
  drawGrid(currentC(), 24 + 2 * (boxSize + 30), y, boxSize, cLabel, cMode === "correct" ? [90, 195, 120] : [235, 90, 90]);
}

function drawVectorChain() {
  const top = 260;
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  noStroke();
  textAlign(LEFT);
  textSize(12);
  text("Current trial:", 24, top);

  if (!r) {
    textAlign(CENTER);
    text("Press Run trial to pick a random vector r and check A(Br) against Cr.", width / 2, top + 60);
    return;
  }

  const colW = 64;
  const gap = 46;
  const y0 = top + 26;
  const cellH = Math.min(28, (560 - y0 - 40) / n);

  function drawVec(v, x, label, col) {
    fill(col[0], col[1], col[2]);
    noStroke();
    textAlign(CENTER);
    textSize(12);
    text(label, x + colW / 2, y0 - 6);
    for (let i = 0; i < v.length; i++) {
      const cy = y0 + i * cellH;
      stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
      strokeWeight(1);
      fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
      rect(x, cy, colW, cellH);
      noStroke();
      fill(theme.text[0], theme.text[1], theme.text[2]);
      textSize(constrain(cellH * 0.4, 7, 13));
      text(v[i][0], x + colW / 2, cy + cellH / 2 + 4);
    }
  }

  let x = 24;
  drawVec(r, x, "r", VEC_COLOR);
  x += colW + gap;
  drawArrow(x - gap + 8, y0 + (n * cellH) / 2, x - 8, y0 + (n * cellH) / 2, "B·");
  drawVec(Br, x, "Br", VEC_COLOR);
  x += colW + gap;
  drawArrow(x - gap + 8, y0 + (n * cellH) / 2, x - 8, y0 + (n * cellH) / 2, "A·");
  drawVec(ABr, x, "A(Br)", VEC_COLOR);

  const cCol = cMode === "correct" ? [90, 195, 120] : [235, 90, 90];
  const crX = x + colW + gap + 70;
  drawVec(Cr, crX, "Cr", cCol);

  // comparison indicator between A(Br) and Cr
  const midX = x + colW + (crX - (x + colW)) / 2;
  const midY = y0 + (n * cellH) / 2;
  const col = matched ? matchColor : mismatchColor;
  fill(col[0], col[1], col[2]);
  noStroke();
  textAlign(CENTER);
  textSize(22);
  text(matched ? "=" : "≠", midX, midY + 8);
  textSize(11);
  text(matched ? "match" : "differ", midX, midY + 26);
}

function drawArrow(x1, y1, x2, y2, label) {
  stroke(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  strokeWeight(1.5);
  line(x1, y1, x2, y2);
  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(CENTER);
  textSize(10);
  text(label, (x1 + x2) / 2, y1 - 6);
}
