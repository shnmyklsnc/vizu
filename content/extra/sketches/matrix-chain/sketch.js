// Matrix Chain Multiplication -- interval DP over an upper-triangular
// table m[i][j] = cheapest scalar-multiplication cost to fully
// parenthesize matrices A[i]..A[j] (0-indexed, n matrices, dims p[0..n]
// with matrix k sized p[k] x p[k+1]).
//
// Same table-filling visual language as edit-distance/LCS's grid (row/col
// headers, current-cell highlight, a backtrace highlight once done) --
// but this table is triangular (only i<=j is meaningful) and every cell
// itself requires a small inner search over split point k, which is
// stepped through and shown live rather than computed silently.

let n = 6; // number of matrices
let dims = []; // length n+1
let m = []; // m[i][j], i<=j
let s = []; // split point s[i][j]
let gen = null;
let state = null; // {phase, i, j, k, cost, bestK, bestCost}
let optimalCells = new Set(); // "i,j" keys on the optimal decomposition, filled once done
let filledCells = new Set(); // "i,j" keys already computed, in true fill order (by chain length)
let leftToRightCost = 0;

let currentColor = [255, 165, 0]; // cell being decided
let sourceColor = [180, 130, 230]; // the two sub-cells feeding the current trial
let doneColor = [90, 195, 120]; // filled, not on the optimal path
let pathColor = [255, 210, 70]; // on the optimal decomposition, once done

let playing = false;
let stepInterval = 5;
let playBtn, statusEl, hintEl;
let theme = null;

let cellSize = 40;
let originX = 0;
let originY = 0;

function randomDims(count) {
  const p = [];
  for (let i = 0; i <= count; i++) p.push(2 + Math.floor(Math.random() * 38));
  return p;
}

function computeLeftToRight(p) {
  // cost of (((A0 A1) A2) ... A(n-1)), i.e. strictly left-to-right
  const nn = p.length - 1;
  if (nn < 2) return 0;
  let cost = 0;
  for (let k = 1; k < nn; k++) cost += p[0] * p[k] * p[k + 1];
  return cost;
}

function* solveGen() {
  m = Array.from({ length: n }, () => new Array(n).fill(0));
  s = Array.from({ length: n }, () => new Array(n).fill(-1));
  filledCells = new Set();
  for (let i = 0; i < n; i++) filledCells.add(i + "," + i);

  yield { phase: "base", i: -1, j: -1, k: -1, msg: "Base case: one matrix alone costs 0 to “parenthesize.”" };

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      let best = Infinity;
      let bestK = i;
      for (let k = i; k < j; k++) {
        const cost = m[i][k] + m[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        if (cost < best) {
          best = cost;
          bestK = k;
        }
        yield {
          phase: "trying",
          i,
          j,
          k,
          cost,
          bestCost: best,
          bestK,
          msg: `(A${i + 1}..A${j + 1}): split after A${k + 1} costs ${m[i][k]} + ${m[k + 1][j]} + ${dims[i]}×${dims[k + 1]}×${dims[j + 1]} = ${cost}  (best so far: ${best})`,
        };
      }
      m[i][j] = best;
      s[i][j] = bestK;
      filledCells.add(i + "," + j);
      yield {
        phase: "cell_done",
        i,
        j,
        k: bestK,
        cost: best,
        msg: `m[A${i + 1}..A${j + 1}] = ${best}, splitting after A${bestK + 1}`,
      };
    }
  }

  optimalCells = new Set();
  collectOptimalCells(0, n - 1, optimalCells);
  const order = printOrder(0, n - 1);
  leftToRightCost = computeLeftToRight(dims);
  yield {
    phase: "done",
    i: -1,
    j: -1,
    k: -1,
    done: true,
    msg: `Done — optimal cost ${m[0][n - 1]} scalar multiplications via ${order}. Left-to-right order would cost ${leftToRightCost}.`,
  };
}

function collectOptimalCells(i, j, set) {
  set.add(i + "," + j);
  if (i === j) return;
  const k = s[i][j];
  collectOptimalCells(i, k, set);
  collectOptimalCells(k + 1, j, set);
}

function printOrder(i, j) {
  if (i === j) return `A${i + 1}`;
  const k = s[i][j];
  return `(${printOrder(i, k)}×${printOrder(k + 1, j)})`;
}

function recomputeLayout() {
  cellSize = Math.max(20, Math.min(44, Math.floor(500 / (n + 1)), Math.floor(340 / (n + 1))));
  const gridW = (n + 1) * cellSize;
  const gridH = (n + 1) * cellSize;
  originX = width / 2 - gridW / 2 + cellSize;
  originY = height / 2 - gridH / 2 + cellSize * 1.1;
}

function resetState() {
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  gen = solveGen();
  state = null;
  optimalCells = new Set();
  filledCells = new Set();
  recomputeLayout();
  updateStatus(`Ready — A1..A${n}, dims [${dims.join(", ")}]. Press Play or Step.`);
}

function stepOnce() {
  if (!gen) return;
  const res = gen.next();
  if (!res.done) {
    state = res.value;
    updateStatus(state.msg);
    if (state.done) {
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

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Chain");
  const row1 = panelRow(holder);
  panelSlider(row1, {
    label: "Number of matrices",
    min: 3,
    max: 8,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
      dims = randomDims(n);
      resetState();
    },
  });
  const row2 = panelRow(holder);
  panelButton(row2, "Randomize dimensions", () => {
    dims = randomDims(n);
    resetState();
  });

  panelHeading(holder, "Playback");
  const row3 = panelRow(holder);
  panelSlider(row3, {
    label: "Speed",
    min: 1,
    max: 10,
    value: 6,
    grow: true,
    onInput: (v) => {
      stepInterval = Math.round(20 - v * 1.8);
    },
  });

  panelHeading(holder, "Appearance");
  const row4 = panelRow(holder);
  panelColor(row4, {
    label: "Current cell",
    value: currentColor,
    onChange: (rgb) => (currentColor = rgb),
  });
  panelColor(row4, {
    label: "Optimal path",
    value: pathColor,
    onChange: (rgb) => (pathColor = rgb),
  });

  const row5 = panelRow(holder);
  row5.classList.add("buttons");
  playBtn = panelButton(row5, "Play", togglePlay);
  panelButton(row5, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(row5, "Restart", resetState);

  hintEl = document.createElement("div");
  hintEl.className = "hint";
  hintEl.textContent = "Only the upper triangle (i ≤ j) is meaningful -- a chain can't run backward.";
  holder.appendChild(hintEl);

  statusEl = panelStatusLine(holder);
}

function setup() {
  const cnv = createCanvas(600, 400);
  cnv.parent("sketch-holder");
  dims = randomDims(n);
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }

  drawGrid();
}

function readableTextColor(rgb) {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return luma > 150 ? 30 : 250;
}

function drawGrid() {
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(Math.max(9, cellSize * 0.32));

  // headers
  for (let c = 0; c < n; c++) {
    drawHeaderCell(originX + (c + 1) * cellSize, originY, `A${c + 1}`);
    drawHeaderCell(originX, originY + (c + 1) * cellSize, `A${c + 1}`);
  }
  drawHeaderCell(originX, originY, "");

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i > j) continue; // lower triangle unused -- leave blank
      const x = originX + (j + 1) * cellSize;
      const y = originY + (i + 1) * cellSize;
      const key = i + "," + j;

      let kind = "empty";
      let label = "";
      const isCurrentCell = state && (state.phase === "trying" || state.phase === "cell_done") && state.i === i && state.j === j;
      const isSourceCell =
        state &&
        (state.phase === "trying" || state.phase === "cell_done") &&
        !isCurrentCell &&
        ((i === state.i && j === state.k) || (i === state.k + 1 && j === state.j));

      if (state && state.done && optimalCells.has(key)) {
        label = String(m[i][j]);
        kind = "path";
      } else if (isCurrentCell) {
        label = state.phase === "cell_done" ? String(m[i][j]) : "";
        kind = "current";
      } else if (isSourceCell) {
        label = String(m[i][j]);
        kind = "source";
      } else if (i === j) {
        label = "0";
        kind = "base";
      } else if (filledCells.has(key)) {
        label = String(m[i][j]);
        kind = "done";
      } else {
        label = "";
        kind = "empty";
      }
      drawCell(x, y, label, kind);
    }
  }

  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(LEFT, TOP);
  textSize(11);
  text(`p = [${dims.join(", ")}]  (A_k is p[k] × p[k+1])`, 12, height - 20);
}

function drawHeaderCell(x, y, label) {
  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(CENTER, CENTER);
  text(label, x, y);
}

function drawCell(x, y, label, kind) {
  let col;
  if (kind === "current") col = currentColor;
  else if (kind === "source") col = sourceColor;
  else if (kind === "path") col = pathColor;
  else if (kind === "done" || kind === "base") col = doneColor;
  else col = null;

  if (col) {
    stroke(col[0], col[1], col[2]);
    strokeWeight(kind === "path" ? 3 : 2);
    fill(col[0], col[1], col[2], kind === "base" ? 140 : 255);
  } else {
    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(1);
    fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
  }
  rect(x, y, cellSize, cellSize, 3);

  noStroke();
  if (col) {
    fill(readableTextColor(col));
  } else {
    fill(theme.text[0], theme.text[1], theme.text[2]);
  }
  textAlign(CENTER, CENTER);
  text(label, x, y);
}
