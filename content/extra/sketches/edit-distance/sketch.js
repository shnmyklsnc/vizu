// Edit Distance (Levenshtein) -- and two variations on the same underlying
// problem, ported from the same desktop py5 project (main.py, plus the two
// approximate-matching companions it left out of the first web pass):
//
//   - "dp"          Standard DP: full O(nm) table, insert/delete/substitute
//                    each cost 1 (solver.py).
//   - "bitparallel"  Bit-parallel (Myers 1999): full edit distance between
//                    the SAME two words, computed via bit-vector deltas
//                    instead of a table (bit_parallel_solver.py /
//                    bit_parallel_window.py, opened with "b" in the
//                    original desktop app).
//   - "rolling"      Rolling array with free start (Sellers 1980): searches
//                    a pattern inside a longer text allowing k errors, using
//                    a single reused row of size m+1 -- dp[0] is reset to 0
//                    every column so a match can start anywhere in the text
//                    (approx_match_rolling_array.py / approx_match.cpp).
//
// All three are switched from one "Variant" dropdown at the top of the
// panel, per the same article -- they're the same topic, just three ways of
// computing (or extending) the same distance.

let variant = "dp"; // "dp" | "bitparallel" | "rolling"

// --- shared with "dp" and "bitparallel" (both compare the same two words) ---
let str1 = "House";
let str2 = "Logarithm";
let maxWordLen = 10;

let highlightColor = [255, 165, 0];

// --- "dp" state ---
let dpValues = [];
let gen = null;
let currentState = null;
let cellSize = 32;
let originX = 0;
let originY = 0;

// --- "bitparallel" state ---
const BIT_ONE_COLOR = [100, 180, 100];
let bpSolver = null;
let bpGen = null;
let bpState = null;

// --- "rolling" state ---
let rollPattern = "pets";
let rollText = "the pesto recipe";
let rollK = 1;
const ROLL_TEXT_MAX = 24;
let rollBestColor = [66, 133, 244];
let rollSolver = null;
let rollGen = null;
let rollState = null;
let rollCellSize = 28;
let rollStartX = 0;
let rollStartY = 0;

// --- shared playback / DOM ---
let playing = false;
let stepInterval = 6;
let playBtn, statusEl, inputA, inputB, patternInput, textInput;
let theme = null; // refreshed every frame in draw() -- see themePalette() in panel.js

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

// Bit-parallel (Myers 1999), ported from bit_parallel_solver.py. Uses BigInt
// throughout (not JS's 32-bit bitwise operators) so it's a direct,
// overflow-free port of the Python's arbitrary-precision bit tricks --
// m is capped at maxWordLen (well under 64) so this is never a perf concern.
function makeBitParallelSolver(pattern, text) {
  const W = 64n;
  const FULL = (1n << W) - 1n;
  const m = pattern.length;
  const smallMask = m > 0 ? (1n << BigInt(m)) - 1n : 0n;

  const Peq = new Map();
  for (let i = 0; i < m; i++) {
    const ch = pattern[i];
    Peq.set(ch, (Peq.get(ch) || 0n) | (1n << BigInt(i)));
  }

  function popcount(x) {
    let count = 0;
    let v = x;
    while (v > 0n) {
      count += Number(v & 1n);
      v >>= 1n;
    }
    return count;
  }

  function* solve() {
    if (m === 0) {
      const finalDistance = text.length;
      yield { char: null, index: -1, eq: null, ph: 0n, mh: 0n, score: finalDistance, msg: "Empty pattern" };
      return;
    }

    let ph = FULL;
    let mh = 0n;

    yield { char: null, index: -1, eq: null, ph, mh, score: m, msg: `Preprocessed Peq for pattern "${pattern}" (${m} bits)` };

    let score = m;
    for (let j = 0; j < text.length; j++) {
      const ch = text[j];
      const eq = Peq.get(ch) || 0n;
      const xh = eq | mh;
      const xv = ((((eq & ph) + ph) & FULL) ^ ph) | eq;
      let pv = mh | (~(xv | ph) & FULL);
      let mv = ph & xv;
      pv = ((pv << 1n) | 1n) & FULL;
      mv = (mv << 1n) & FULL;
      ph = (mv | (~(xh | pv) & FULL)) & FULL;
      mh = (pv & xh) & FULL;

      score = j + 1 + popcount(ph & smallMask) - popcount(mh & smallMask);

      yield { char: ch, index: j, eq, ph, mh, score, msg: `Processed '${ch}' (${j + 1}/${text.length}) — running distance = ${score}` };
    }

    yield { char: null, index: text.length, eq: null, ph, mh, score, msg: `Done — edit distance = ${score}` };
  }

  return { pattern, text, m, Peq, solve };
}

// Rolling array with free start (Sellers 1980), ported from
// approx_match_rolling_array.py -- same diag/temp in-place trick as
// approx_match.cpp: exactly one row of (m+1) cells is ever kept, no 2D
// table. dp[0] is reset to 0 every column ("free start": a match may begin
// at any position in the text, not just position 0).
function makeRollingSolver(pattern, text, k) {
  const m = pattern.length;
  const n = text.length;

  function* solve() {
    const dp = [];
    for (let i = 0; i <= m; i++) dp.push(i);
    let bestDist = k + 1;
    let bestEnd = -1;

    yield { j: 0, i: null, dp: dp.slice(), best: false, msg: "Initial column (j=0): dp[i]=i" };

    for (let j = 1; j <= n; j++) {
      const c = text[j - 1];
      let diag = dp[0];
      dp[0] = 0; // free-start boundary: dp[0] = 0, every column
      yield { j, i: 0, dp: dp.slice(), best: false, msg: `Column j=${j} ('${c}'): dp[0] reset to 0 (free start)` };

      for (let i = 1; i <= m; i++) {
        const temp = dp[i]; // old dp[i] (left neighbor), before this overwrites it
        const cost = pattern[i - 1] === c ? 0 : 1;
        const subst = diag + cost;
        const del = dp[i - 1] + 1; // already-updated same-column neighbor above
        const ins = dp[i] + 1; // not-yet-updated left neighbor
        dp[i] = Math.min(subst, del, ins);
        diag = temp; // becomes the diagonal for the next i

        const matchWord = cost === 0 ? "match" : "mismatch";
        yield {
          j,
          i,
          dp: dp.slice(),
          best: false,
          msg: `dp[${i}] (pattern[${i - 1}]='${pattern[i - 1]}' vs text[${j - 1}]='${c}', ${matchWord}): subst=${subst} delete=${del} insert=${ins} -> ${dp[i]}`,
        };
      }

      if (dp[m] <= bestDist) {
        bestDist = dp[m];
        bestEnd = j;
        yield { j, i: m, dp: dp.slice(), best: true, msg: `New best: distance=${bestDist}, ends at text pos ${j}` };
      }
    }

    const verdict = bestDist <= k ? `MATCH (k=${k})` : `NO MATCH within k=${k}`;
    yield { j: n, i: m, dp: dp.slice(), best: false, msg: `Done. best_dist=${bestDist}, best_end=${bestEnd} — ${verdict}` };
  }

  return { pattern, text, k, m, n, solve };
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

function recomputeRollingLayout() {
  const cols = rollSolver.n + 1;
  const rows = rollSolver.m + 1;
  rollCellSize = Math.max(14, Math.min(32, Math.floor((width - 110) / cols), Math.floor((height - 90) / rows)));
  rollStartX = 70 + rollCellSize;
  rollStartY = 50 + rollCellSize;
}

function resetState() {
  playing = false;
  if (playBtn) playBtn.textContent = "Play";

  if (variant === "dp") {
    // The table's headers draw regardless of currentState (see drawGrid()),
    // so it's already fully visible with no values filled in yet -- no
    // priming step needed.
    gen = solveGen();
    currentState = null;
    updateStatus("Ready — press Play or Step.");
    recomputeLayout();
  } else if (variant === "bitparallel") {
    // Unlike the DP table, drawBitParallel()/drawRolling() have nothing
    // static to show (no fixed grid of headers) until a state exists, so
    // they'd render as a blank canvas until the first Play/Step. Prime
    // them with one automatic step so the initial preprocessing state
    // (Peq / dp[i]=i) is visible immediately, same as the desktop
    // bit-parallel window did (its setup() also step_once()s right away).
    bpSolver = makeBitParallelSolver(str1, str2);
    bpGen = bpSolver.solve();
    bpState = null;
    stepOnce();
  } else {
    rollSolver = makeRollingSolver(rollPattern, rollText, rollK);
    rollGen = rollSolver.solve();
    rollState = null;
    recomputeRollingLayout();
    stepOnce();
  }
}

function stepOnce() {
  if (variant === "dp") {
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
  } else if (variant === "bitparallel") {
    if (!bpGen) return;
    const res = bpGen.next();
    if (res.done) {
      playing = false;
      if (playBtn) playBtn.textContent = "Play";
      return;
    }
    bpState = res.value;
    updateStatus(bpState.msg);
  } else {
    if (!rollGen) return;
    const res = rollGen.next();
    if (res.done) {
      playing = false;
      if (playBtn) playBtn.textContent = "Play";
      return;
    }
    rollState = res.value;
    updateStatus(rollState.msg);
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
  const cleaned = text.replace(/[^A-Za-z0-9]/g, "").slice(0, maxWordLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeRollPattern(text, fallback) {
  const cleaned = text.replace(/[^A-Za-z0-9]/g, "").slice(0, 10);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeRollText(text, fallback) {
  const cleaned = text.replace(/[^A-Za-z0-9 ]/g, "").slice(0, ROLL_TEXT_MAX);
  return cleaned.length > 0 ? cleaned : fallback;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Algorithm");
  const rowVariant = panelRow(holder);
  panelSelect(rowVariant, {
    label: "Variant",
    grow: true,
    value: variant,
    options: [
      { value: "dp", label: "Standard DP (full table)" },
      { value: "bitparallel", label: "Bit-parallel (Myers)" },
      { value: "rolling", label: "Rolling array (free start)" },
    ],
    onChange: (v) => {
      variant = v;
      buildPanel();
      resetState();
    },
  });

  if (variant === "dp" || variant === "bitparallel") {
    panelHeading(holder, "Data");
    const row1 = panelRow(holder);
    inputA = panelTextInput(row1, {
      label: "String A",
      value: str1,
      maxLength: maxWordLen,
      onChange: (text) => {
        str1 = sanitizeWord(text, str1);
        inputA.value = str1;
        resetState();
      },
    });
    inputB = panelTextInput(row1, {
      label: "String B",
      value: str2,
      maxLength: maxWordLen,
      onChange: (text) => {
        str2 = sanitizeWord(text, str2);
        inputB.value = str2;
        resetState();
      },
    });

    const row2 = panelRow(holder);
    panelSlider(row2, {
      label: "Max length",
      min: 4,
      max: 12,
      value: maxWordLen,
      grow: true,
      format: (v) => `${v} chars`,
      onInput: (v) => {
        maxWordLen = v;
        inputA.maxLength = maxWordLen;
        inputB.maxLength = maxWordLen;
        str1 = sanitizeWord(str1, "a");
        str2 = sanitizeWord(str2, "a");
        inputA.value = str1;
        inputB.value = str2;
        resetState();
      },
    });
  } else {
    panelHeading(holder, "Data");
    const row1 = panelRow(holder);
    patternInput = panelTextInput(row1, {
      label: "Pattern",
      value: rollPattern,
      maxLength: 10,
      onChange: (text) => {
        rollPattern = sanitizeRollPattern(text, rollPattern);
        patternInput.value = rollPattern;
        resetState();
      },
    });

    const row1b = panelRow(holder);
    textInput = panelTextInput(row1b, {
      label: "Text (searched for the pattern)",
      value: rollText,
      maxLength: ROLL_TEXT_MAX,
      grow: true,
      onChange: (text) => {
        rollText = sanitizeRollText(text, rollText);
        textInput.value = rollText;
        resetState();
      },
    });

    const row2 = panelRow(holder);
    panelSlider(row2, {
      label: "k (max errors allowed)",
      min: 0,
      max: 5,
      value: rollK,
      grow: true,
      onInput: (v) => {
        rollK = v;
        resetState();
      },
    });
  }

  panelHeading(holder, "Playback");
  const row3 = panelRow(holder);
  panelSlider(row3, {
    label: "Speed",
    min: 1,
    max: 10,
    value: 8,
    grow: true,
    onInput: (v) => {
      stepInterval = Math.round(20 - v * 1.8);
    },
  });

  panelHeading(holder, "Appearance");
  const row4 = panelRow(holder);
  panelColor(row4, {
    label: "Highlight color",
    value: highlightColor,
    onChange: (rgb) => {
      highlightColor = rgb;
    },
  });
  if (variant === "rolling") {
    panelColor(row4, {
      label: "Best-match color",
      value: rollBestColor,
      onChange: (rgb) => {
        rollBestColor = rgb;
      },
    });
  }

  const row5 = panelRow(holder);
  row5.classList.add("buttons");
  playBtn = panelButton(row5, "Play", togglePlay);
  panelButton(row5, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(row5, "Restart", resetState);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent =
    variant === "rolling" ? "Pattern: letters and digits. Text: letters, digits and spaces." : "Letters and digits only.";
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
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }

  if (variant === "dp") {
    drawGrid();
  } else if (variant === "bitparallel") {
    drawBitParallel();
  } else {
    drawRolling();
  }
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

// The highlight color is user-tweakable, so pick dark or light label text
// by perceived luminance instead of assuming it stays a pale orange.
function readableTextColor(rgb) {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return luma > 150 ? 30 : 250;
}

function drawCell(col, row, label, highlighted) {
  const x = originX + col * cellSize;
  const y = originY + row * cellSize;

  if (highlighted) {
    stroke(highlightColor[0], highlightColor[1], highlightColor[2]);
    strokeWeight(3);
    fill(highlightColor[0], highlightColor[1], highlightColor[2]);
  } else {
    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(1);
    fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
  }
  rect(x, y, cellSize, cellSize, 3);

  noStroke();
  if (highlighted) {
    fill(readableTextColor(highlightColor));
  } else {
    fill(theme.text[0], theme.text[1], theme.text[2]);
  }
  text(label, x, y);
}

function drawBitParallel() {
  noStroke();
  fill(theme.text[0], theme.text[1], theme.text[2]);
  textAlign(LEFT, TOP);
  textSize(13);
  text(`Bit-parallel (Myers) — pattern="${str1}"  text="${str2}"`, 14, 10);

  if (!bpState || !bpSolver) {
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    text("Press Step or Play to begin.", 14, 30);
    return;
  }

  const m = bpSolver.m;
  const labelWidth = 68;
  const marginLeft = 14;
  const topY = 38;

  const rows = [];
  for (const [ch, mask] of bpSolver.Peq) {
    rows.push({ label: `'${ch}'`, value: mask, highlight: bpState.char === ch });
  }
  if (bpState.char !== null && bpState.eq !== null) {
    rows.push({ label: `eq('${bpState.char}')`, value: bpState.eq, highlight: false });
  }
  rows.push({ label: "ph", value: bpState.ph, highlight: false });
  rows.push({ label: "mh", value: bpState.mh, highlight: false });

  const bottomReserved = 56;
  const availH = height - topY - bottomReserved;
  const availW = width - marginLeft - labelWidth;
  const bitSize = Math.max(13, Math.min(30, Math.floor(availH / rows.length) - 6, Math.floor(availW / Math.max(1, m)) - 4));
  const gap = 5;

  let y = topY;
  for (const row of rows) {
    drawBitRow(row.label, row.value, marginLeft, y, m, bitSize, gap, labelWidth, row.highlight);
    y += bitSize + gap;
  }

  y += 12;
  noStroke();
  fill(theme.text[0], theme.text[1], theme.text[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  text(bpState.msg, marginLeft, Math.min(y, height - 38));
  text(`running edit distance = ${bpState.score}`, marginLeft, Math.min(y + 16, height - 20));
}

function drawBitRow(label, value, x, y, m, bitSize, gap, labelWidth, highlight) {
  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(RIGHT, CENTER);
  textSize(Math.min(12, bitSize * 0.4));
  text(label, x + labelWidth - 8, y + bitSize / 2);

  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < m; i++) {
    const bit = value === null ? 0 : Number((value >> BigInt(i)) & 1n);
    const bx = x + labelWidth + i * (bitSize + gap);

    let fillColor;
    if (highlight) {
      fillColor = highlightColor;
    } else if (bit) {
      fillColor = BIT_ONE_COLOR;
    } else {
      fillColor = theme.cellBg;
    }

    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(highlight ? 2 : 1);
    fill(fillColor[0], fillColor[1], fillColor[2]);
    rect(bx, y, bitSize, bitSize, 3);

    noStroke();
    if (highlight) {
      fill(readableTextColor(highlightColor));
    } else if (bit) {
      fill(255);
    } else {
      fill(theme.text[0], theme.text[1], theme.text[2]);
    }
    textSize(Math.min(12, bitSize * 0.4));
    text(String(bit), bx + bitSize / 2, y + bitSize / 2);
  }
}

function drawRolling() {
  noStroke();
  fill(theme.text[0], theme.text[1], theme.text[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  const label = rollSolver
    ? `pattern="${rollSolver.pattern}"  text="${rollSolver.text}"  k=${rollSolver.k}  (one rolling array, size m+1=${rollSolver.m + 1})`
    : "";
  text(label, 14, 10);

  if (!rollState || !rollSolver) {
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    text("Press Step or Play to begin.", 14, 30);
    return;
  }

  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(rollCellSize * 0.42);

  const { j, i: activeI, dp, best } = rollState;

  // column headers: text characters across the top, blank in column 0
  for (let jj = 0; jj <= rollSolver.n; jj++) {
    const colLabel = jj === 0 ? "·" : rollSolver.text[jj - 1];
    const x = rollStartX + jj * rollCellSize;
    const y = rollStartY - rollCellSize;
    drawRollCell(x, y, colLabel, jj === j ? "col" : null);
  }

  // row headers: pattern characters down the left, blank in row 0
  for (let ii = 0; ii <= rollSolver.m; ii++) {
    const rowLabel = ii === 0 ? "·" : rollSolver.pattern[ii - 1];
    const x = rollStartX - rollCellSize;
    const y = rollStartY + ii * rollCellSize;
    drawRollCell(x, y, rowLabel, null);
  }

  // the single rolling array -- slides to sit under the current column j
  const colX = rollStartX + j * rollCellSize;
  for (let ii = 0; ii <= rollSolver.m; ii++) {
    const y = rollStartY + ii * rollCellSize;
    let kind = null;
    if (ii === activeI) kind = best ? "best" : "active";
    drawRollCell(colX, y, dp[ii], kind);
  }

  noStroke();
  fill(theme.text[0], theme.text[1], theme.text[2]);
  textAlign(LEFT, TOP);
  textSize(12);
  text(rollState.msg, 14, height - 36);
}

function drawRollCell(x, y, label, kind) {
  if (kind === "col") {
    stroke(highlightColor[0], highlightColor[1], highlightColor[2]);
    strokeWeight(1);
    fill(highlightColor[0], highlightColor[1], highlightColor[2], 55);
  } else if (kind === "active") {
    stroke(highlightColor[0], highlightColor[1], highlightColor[2]);
    strokeWeight(3);
    fill(highlightColor[0], highlightColor[1], highlightColor[2]);
  } else if (kind === "best") {
    stroke(rollBestColor[0], rollBestColor[1], rollBestColor[2]);
    strokeWeight(3);
    fill(rollBestColor[0], rollBestColor[1], rollBestColor[2]);
  } else {
    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(1);
    fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
  }
  rect(x, y, rollCellSize, rollCellSize, 3);

  noStroke();
  if (kind === "active") {
    fill(readableTextColor(highlightColor));
  } else if (kind === "best") {
    fill(readableTextColor(rollBestColor));
  } else {
    fill(theme.text[0], theme.text[1], theme.text[2]);
  }
  text(label, x, y);
}
