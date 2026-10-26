// Computing C(n,k), the number of ways to choose k items from n, two ways:
//
//   "naive"  -- recurse exactly on Pascal's rule, C(n,k) = C(n-1,k-1) +
//               C(n-1,k), with base cases C(n,0) = C(n,n) = 1. Exactly the
//               same overlapping-subproblem shape as Fibonacci's naive
//               recursion -- C(n-1,k) gets recomputed from scratch every
//               time it's needed by a sibling call -- except the blowup is
//               worse: the number of calls made is exactly 2*C(n,k) - 1,
//               and central binomial coefficients grow close to 4^n, not
//               the golden ratio's ~1.618^n.
//   "pascal" -- no recursion at all. Fill the triangle row by row, top to
//               bottom, left to right within a row: row 0 is just C(0,0)=1,
//               and every interior cell of row i is the sum of the two
//               cells diagonally above it in row i-1. C(n,k) falls out as
//               one cell in that fill, and every other cell filled along
//               the way is itself some other valid C(i,j) -- nothing
//               wasted, unlike the naive tree's repetition.
//
// Naive mode reuses the same buildTree/animateGen tree-walking pattern as
// Fibonacci, Karatsuba and Strassen's sketches (each node = one recursive
// call, colored by phase). Pascal mode is a 2D table fill, structurally
// the same idea as Fibonacci's bottom-up array fill, just triangular
// instead of a single row.

let n = 6; // 2..12
let k = 3; // 0..n
let variant = "naive"; // "naive" | "pascal"

let root = null;
let nodeById = new Map();
let nodeStatus = new Map(); // id -> "pending" | "active" | "done"
let countAtDepth = [];
let maxDepth = 0;
let totalCalls = 0;

let table = null; // pascal mode's table[i][j], null entries = not yet filled

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 20;

let cnv = null;
let theme = null;

let activeColor = [255, 165, 0];
let doneColor = [90, 195, 120];
let targetColor = [255, 210, 70];
const LEAF_COLOR = [255, 210, 70];
const COMBINE_COLOR = [190, 120, 230];

let playBtn, statusEl, statsEl, compareEl;
let nSlider, kSlider;

// ---- recursion tree (naive) -- pure function, no animation state ----

let idCounter = 0;

function buildTree(nn, kk, depth) {
  const id = idCounter++;
  const leaf = kk === 0 || kk === nn;
  const node = { id, n: nn, k: kk, depth, leaf, children: [] };
  countAtDepth[depth] = (countAtDepth[depth] || 0) + 1;
  maxDepth = Math.max(maxDepth, depth);
  nodeById.set(id, node);

  if (leaf) {
    node.result = 1;
    node.callCount = 1;
    return node;
  }

  const c1 = buildTree(nn - 1, kk - 1, depth + 1);
  const c2 = buildTree(nn - 1, kk, depth + 1);
  node.children = [c1, c2];
  node.result = c1.result + c2.result;
  node.callCount = 1 + c1.callCount + c2.callCount;
  return node;
}

function rebuildTree() {
  idCounter = 0;
  nodeById = new Map();
  countAtDepth = [];
  maxDepth = 0;
  root = buildTree(n, k, 0);
  totalCalls = root.callCount;
  layoutCounter = 0;
  assignLayout(root);
  totalLeavesLayout = layoutCounter;
}

function makeStep(phase, node, msg) {
  return { phase, nodeId: node.id, depth: node.depth, msg };
}

function* animateGen(node) {
  nodeStatus.set(node.id, "active");
  if (node.leaf) {
    yield makeStep("leaf", node, `Base case: C(${node.n}, ${node.k}) = 1 -- choosing ${node.k === 0 ? "none" : "all"} of ${node.n} items has exactly one way to do it.`);
  } else {
    yield makeStep("enter", node, `C(${node.n}, ${node.k}) = C(${node.n - 1}, ${node.k - 1}) + C(${node.n - 1}, ${node.k})`);
    for (const c of node.children) yield* animateGen(c);
    yield makeStep("combine", node, `C(${node.n}, ${node.k}) = C(${node.n - 1}, ${node.k - 1}) + C(${node.n - 1}, ${node.k}) = ${node.children[0].result} + ${node.children[1].result} = ${node.result}`);
  }
  nodeStatus.set(node.id, "done");
  yield makeStep("done_node", node, `C(${node.n}, ${node.k}) = ${node.result}`);
}

function* solveGenTree() {
  nodeStatus = new Map();
  yield* animateGen(root);
  yield {
    phase: "done",
    nodeId: root.id,
    depth: 0,
    msg: `Done -- C(${n}, ${k}) = ${root.result}, using naive recursion: ${totalCalls} total call${totalCalls === 1 ? "" : "s"} (exactly 2×${root.result}−1, every one of them recomputing something a sibling call already worked out).`,
  };
}

// ---- Pascal's triangle: a 2D table fill, no recursion ----

function* solveGenPascal() {
  table = [];
  for (let i = 0; i <= n; i++) {
    table[i] = new Array(i + 1).fill(null);
    for (let j = 0; j <= i; j++) {
      if (j === 0 || j === i) {
        table[i][j] = 1;
        yield { phase: "base", i, j, msg: `C(${i}, ${j}) = 1 (the triangle's edge -- choosing ${j === 0 ? "none" : "all"} of ${i} items).` };
      } else {
        table[i][j] = table[i - 1][j - 1] + table[i - 1][j];
        yield { phase: "fill", i, j, msg: `C(${i}, ${j}) = C(${i - 1}, ${j - 1}) + C(${i - 1}, ${j}) = ${table[i - 1][j - 1]} + ${table[i - 1][j]} = ${table[i][j]}` };
      }
    }
  }
  const totalCells = ((n + 1) * (n + 2)) / 2;
  yield { phase: "done", i: n, j: k, msg: `Done -- C(${n}, ${k}) = ${table[n][k]}, using Pascal's-triangle DP: ${totalCells} table entries filled across ${n + 1} rows, no recursion at all.` };
}

// ---- control panel ----

function resetState() {
  if (variant === "pascal") {
    table = null;
    gen = solveGenPascal();
  } else {
    rebuildTree();
    gen = solveGenTree();
  }
  currentState = null;
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  updateStatus("Ready -- press Play or Step.");
  updateStats();
}

function stepOnce() {
  if (!gen) return;
  const res = gen.next();
  if (!res.done) {
    currentState = res.value;
    updateStatus(currentState.msg);
    updateStats();
    if (currentState.phase === "done") {
      playing = false;
      if (playBtn) playBtn.textContent = "Play";
    }
  } else {
    playing = false;
    if (playBtn) playBtn.textContent = "Play";
  }
}

function updateStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function updateStats() {
  if (!statsEl) return;
  if (variant === "pascal") {
    let filled = 0;
    if (table) for (const row of table) for (const v of row) if (v !== null) filled++;
    const totalCells = ((n + 1) * (n + 2)) / 2;
    statsEl.textContent = `Table entries filled: ${filled} / ${totalCells}`;
  } else {
    const depth = currentState ? currentState.depth : 0;
    statsEl.textContent = `Calls made so far: ${nodeStatus.size}   Total calls: ${totalCalls}   Current depth: ${depth} / ${maxDepth}`;
  }
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function updateCompareHint() {
  if (!compareEl) return;
  const target = binomApprox(n, k);
  const naiveCalls = 2 * target - 1;
  const dpCells = ((n + 1) * (n + 2)) / 2;
  compareEl.textContent = `C(${n}, ${k}) = ${target}. Naive recursion makes exactly 2×${target}−1 = ${naiveCalls} calls; Pascal's-triangle DP fills exactly (n+1)(n+2)/2 = ${dpCells} table entries, no matter which cell k picks out.`;
}

// exact integer C(n,k) via the same recurrence the sketch itself uses --
// n is capped low enough (<=12) that plain doubles never lose precision.
function binomApprox(nn, kk) {
  if (kk === 0 || kk === nn) return 1;
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (nn - i)) / (i + 1);
  }
  return Math.round(result);
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Input");
  const rowN = panelRow(holder);
  nSlider = panelSlider(rowN, {
    label: "n",
    min: 2,
    max: 12,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
      if (k > n) {
        k = n;
        kSlider.value = k;
        kSlider.parentElement.firstChild.textContent = "k: " + k;
      }
      kSlider.max = n;
      resetState();
      updateCompareHint();
    },
  });
  const rowK = panelRow(holder);
  kSlider = panelSlider(rowK, {
    label: "k",
    min: 0,
    max: n,
    value: k,
    grow: true,
    onInput: (v) => {
      k = v;
      resetState();
      updateCompareHint();
    },
  });

  panelHeading(holder, "Algorithm");
  const rowVariant = panelRow(holder);
  panelSelect(rowVariant, {
    label: "Mode",
    options: [
      { value: "naive", label: "Naive recursion" },
      { value: "pascal", label: "Pascal's triangle (DP)" },
    ],
    value: variant,
    onChange: (v) => {
      variant = v;
      resetState();
      updateCompareHint();
    },
  });

  panelHeading(holder, "Playback");
  const rowSpeed = panelRow(holder);
  panelSlider(rowSpeed, {
    label: "Speed",
    min: 1,
    max: 10,
    value: 6,
    grow: true,
    onInput: (v) => {
      stepInterval = Math.round(38 - v * 3);
    },
  });
  const rowBtns = panelRow(holder);
  rowBtns.classList.add("buttons");
  playBtn = panelButton(rowBtns, "Play", togglePlay);
  panelButton(rowBtns, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(rowBtns, "Reset", resetState);

  panelHeading(holder, "Appearance");
  const rowColor = panelRow(holder);
  panelColor(rowColor, {
    label: "In-progress color",
    value: activeColor,
    onChange: (rgb) => {
      activeColor = rgb;
    },
  });
  panelColor(rowColor, {
    label: "Done color",
    value: doneColor,
    onChange: (rgb) => {
      doneColor = rgb;
    },
  });

  const legend = document.createElement("div");
  legend.className = "hint";
  legend.textContent =
    variant === "pascal"
      ? "Each cell is filled once, as the sum of the two cells diagonally above it (edges of the triangle are always 1). Orange = the cell currently being computed, green = filled, gold = the target cell C(n,k)."
      : "Orange = a call currently in progress · yellow = a base case (the triangle's edge) · purple = combining two results into this call's answer · green = this call's result is ready.";
  holder.appendChild(legend);

  compareEl = document.createElement("div");
  compareEl.className = "hint";
  holder.appendChild(compareEl);
  updateCompareHint();

  statsEl = document.createElement("div");
  statsEl.className = "hint";
  holder.appendChild(statsEl);

  statusEl = panelStatusLine(holder);
  updateStats();
}

// ---- p5 lifecycle ----

function setup() {
  cnv = createCanvas(700, 480);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  if (variant === "pascal") {
    drawPascal();
  } else {
    drawTree();
  }

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}

// ---- tree rendering (naive) ----

function nodeRadius(depth) {
  const margin = 34;
  const chartW = width - margin * 2;
  const count = countAtDepth[depth] || 1;
  return constrain(chartW / (2 * count) - 3, 3, 16);
}

let layoutCounter = 0;
function assignLayout(node) {
  if (node.children.length === 0) {
    node.x = layoutCounter;
    layoutCounter += 1;
    return;
  }
  for (const c of node.children) assignLayout(c);
  const xs = node.children.map((c) => c.x);
  node.x = (Math.min(...xs) + Math.max(...xs)) / 2;
}
let totalLeavesLayout = 1;

function nodeXY(node) {
  const margin = 34;
  const topMargin = 28;
  const bottomMargin = 46;
  const chartW = width - margin * 2;
  const chartH = height - topMargin - bottomMargin;
  const levelH = maxDepth > 0 ? chartH / maxDepth : 0;
  const slot = chartW / Math.max(1, totalLeavesLayout);
  const x = margin + (node.x + 0.5) * slot;
  const y = topMargin + node.depth * levelH;
  return [x, y];
}

function drawTree() {
  if (!root) return;
  if (root.x === undefined) {
    layoutCounter = 0;
    assignLayout(root);
    totalLeavesLayout = layoutCounter;
  }

  const curId = currentState ? currentState.nodeId : null;
  const curPhase = currentState ? currentState.phase : null;

  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  strokeWeight(1);
  drawEdges(root);
  noStroke();

  drawNode(root, curId, curPhase);
}

function drawEdges(node) {
  const [x1, y1] = nodeXY(node);
  for (const c of node.children) {
    const [x2, y2] = nodeXY(c);
    line(x1, y1, x2, y2);
    drawEdges(c);
  }
}

function drawNode(node, curId, curPhase) {
  const [x, y] = nodeXY(node);
  const r = nodeRadius(node.depth);
  const status = nodeStatus.get(node.id) || "pending";
  const isCurrent = node.id === curId;

  let col = theme.mutedText;
  if (status === "active") col = activeColor;
  if (status === "done") col = doneColor;
  if (isCurrent) {
    if (curPhase === "leaf") col = LEAF_COLOR;
    else if (curPhase === "combine") col = COMBINE_COLOR;
    else if (curPhase === "enter") col = activeColor;
  }

  fill(col[0], col[1], col[2], status === "pending" ? 130 : 255);
  noStroke();
  circle(x, y, r * 2);

  if (isCurrent) {
    noFill();
    stroke(col[0], col[1], col[2]);
    strokeWeight(2);
    circle(x, y, r * 2 + 8);
    noStroke();
  }

  if (r >= 10) {
    fill(theme.text[0], theme.text[1], theme.text[2]);
    textAlign(CENTER);
    textSize(r >= 15 ? 10 : 8);
    const label = status === "done" ? `C(${node.n},${node.k})=${node.result}` : `C(${node.n},${node.k})`;
    text(label, x, y - r - 5);
  }

  for (const c of node.children) drawNode(c, curId, curPhase);
}

// ---- triangle rendering (Pascal's-triangle DP) ----

function drawPascal() {
  if (!table) return;
  const topMargin = 46;
  const rows = n + 1;
  const rowH = constrain((height - topMargin - 30) / rows, 24, 46);
  const spacing = constrain(rowH * 1.15, 22, 56);
  const r = constrain(spacing * 0.34, 8, 17);
  const centerX = width / 2;

  const curI = currentState ? currentState.i : -1;
  const curJ = currentState ? currentState.j : -1;
  const curPhase = currentState ? currentState.phase : null;

  // dependency edges: only interior cells are a sum of two parents -- the
  // triangle's two edges (j=0, j=i) are base cases, given rather than
  // computed, so no incoming edges are drawn into them.
  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  strokeWeight(1);
  for (let i = 2; i <= n; i++) {
    const y1 = topMargin + (i - 1) * rowH;
    const y2 = topMargin + i * rowH;
    const leftX1 = centerX - ((i - 1) * spacing) / 2;
    const leftX2 = centerX - (i * spacing) / 2;
    for (let j = 1; j <= i - 1; j++) {
      const x2 = leftX2 + j * spacing;
      line(leftX1 + (j - 1) * spacing, y1, x2, y2);
      line(leftX1 + j * spacing, y1, x2, y2);
    }
  }

  for (let i = 0; i <= n; i++) {
    const y = topMargin + i * rowH;
    const leftX = centerX - (i * spacing) / 2;
    for (let j = 0; j <= i; j++) {
      const x = leftX + j * spacing;
      const val = table[i][j];
      const filled = val !== null;
      const isTarget = i === n && j === k;
      const isCurrent = i === curI && j === curJ && (curPhase === "base" || curPhase === "fill");

      let col = theme.mutedText;
      if (isCurrent) col = activeColor;
      else if (filled && isTarget) col = targetColor;
      else if (filled) col = doneColor;

      noStroke();
      fill(col[0], col[1], col[2], filled || isCurrent ? 255 : 130);
      circle(x, y, r * 2);

      if (isCurrent || (isTarget && filled)) {
        noFill();
        stroke(col[0], col[1], col[2]);
        strokeWeight(2);
        circle(x, y, r * 2 + 7);
        noStroke();
      }

      if (filled && r >= 9) {
        fill(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
        textAlign(CENTER);
        textSize(constrain(r * 0.85, 8, 13));
        const valStr = String(val);
        text(valStr.length > 4 ? valStr.slice(0, 3) + "…" : valStr, x, y + r * 0.32);
      }
    }
  }

  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(CENTER);
  textSize(12);
  text(`row i = 0..${n}, each cell C(i,j) the sum of the two cells above it`, width / 2, 20);
}
