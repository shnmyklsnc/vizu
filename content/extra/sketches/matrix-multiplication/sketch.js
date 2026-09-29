// Matrix multiplication (divide and conquer): naive quadrant recursion vs.
// Strassen. Same "one article, one dropdown" pattern as Karatsuba's
// naive-vs-clever toggle -- Strassen's algorithm IS that same trick
// (trade multiplications for extra additions) applied one level up, to
// 2x2 block matrices instead of 2-piece numbers.
//
//   "naive"    -- split A and B into four (n/2)x(n/2) quadrants each,
//                 and use the schoolbook block formula:
//                   C11 = A11B11 + A12B21   C12 = A11B12 + A12B22
//                   C21 = A21B11 + A22B21   C22 = A21B12 + A22B22
//                 Eight quadrant multiplications, T(n) = 8T(n/2) + O(n^2)
//                 = Theta(n^3) -- exactly what the non-recursive schoolbook
//                 method costs, just organized recursively.
//   "strassen" -- the same split, but seven products built from sums and
//                 differences of quadrants instead of the quadrants
//                 themselves:
//                   M1=(A11+A22)(B11+B22)  M2=(A21+A22)B11
//                   M3=A11(B12-B22)        M4=A22(B21-B11)
//                   M5=(A11+A12)B22        M6=(A21-A11)(B11+B12)
//                   M7=(A12-A22)(B21+B22)
//                 C11=M1+M4-M5+M7  C12=M3+M5  C21=M2+M4  C22=M1-M2+M3+M6
//                 T(n) = 7T(n/2) + O(n^2) = Theta(n^log2(7)) ~ Theta(n^2.807).
//
// Exactly like Karatsuba's sketch: the whole recursion is precomputed as a
// tree the moment the matrices/variant/size change (buildTree() is a pure
// function -- deterministic, no animation state), then a separate
// generator (animateGen) walks that tree in visiting order, yielding one
// step per node-event. A node's "role" (P1..P8 or M1..M7) plays the part
// Karatsuba's p1/x/y/z labels played. Below the tree, a small detail strip
// shows the CURRENT node's two operand matrices (and, once its own combine
// step has fired, the product it produced) as real numbers -- nothing
// here is hand-scripted.

let variant = "strassen"; // "naive" | "strassen"
let matSize = 4; // total matrix dimension: 2 | 4 | 8
let A = null;
let B = null;

let root = null;
let nodeById = new Map();
let nodeStatus = new Map(); // id -> "pending" | "active" | "done"
let countAtDepth = [];
let totalLeaves = 0;
let maxDepth = 0;

let leafMultsDone = 0; // running tally of scalar (1x1) multiplications actually reached so far

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 20;

let cnv = null;
let theme = null;

let activeColor = [255, 165, 0];
let doneColor = [90, 195, 120];
const SPLIT_COLOR = [110, 150, 230];
const LEAF_COLOR = [255, 210, 70];
const COMBINE_COLOR = [190, 120, 230];

let playBtn, statusEl, statsEl, compareEl;

// ---- small matrix helpers (plain 2D arrays, values only) ----

function zeros(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function randomMatrix(n) {
  const m = zeros(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = 1 + Math.floor(Math.random() * 9);
  return m;
}

function sub(m, r0, c0, size) {
  const out = zeros(size);
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) out[i][j] = m[r0 + i][c0 + j];
  return out;
}

function addM(X, Y) {
  return X.map((row, i) => row.map((v, j) => v + Y[i][j]));
}

function subM(X, Y) {
  return X.map((row, i) => row.map((v, j) => v - Y[i][j]));
}

function joinQuadrants(Q11, Q12, Q21, Q22) {
  const h = Q11.length;
  const n = h * 2;
  const out = zeros(n);
  for (let i = 0; i < h; i++)
    for (let j = 0; j < h; j++) {
      out[i][j] = Q11[i][j];
      out[i][j + h] = Q12[i][j];
      out[i + h][j] = Q21[i][j];
      out[i + h][j + h] = Q22[i][j];
    }
  return out;
}

function naiveMultiply(X, Y) {
  const n = X.length;
  const out = zeros(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[i][k] * Y[k][j];
      out[i][j] = s;
    }
  return out;
}

function fmtMatrix(m) {
  return m.map((row) => "[" + row.join(", ") + "]").join(" ");
}

function countLevels(n) {
  let levels = 0;
  while (n > 1) {
    n = n / 2;
    levels++;
  }
  return levels;
}

// ---- recursion tree (pure function -- no animation state touched here) ----

let idCounter = 0;

function buildTree(Asub, Bsub, size, depth, roleShort, roleFull) {
  const id = idCounter++;
  const node = {
    id,
    A: Asub,
    B: Bsub,
    size,
    depth,
    leaf: size <= 1,
    roleShort: roleShort || "",
    roleFull: roleFull || "A × B (the full product)",
    children: [],
  };
  countAtDepth[depth] = (countAtDepth[depth] || 0) + 1;
  maxDepth = Math.max(maxDepth, depth);
  nodeById.set(id, node);

  if (node.leaf) {
    node.result = [[Asub[0][0] * Bsub[0][0]]];
    node.multCount = 1;
    return node;
  }

  const h = size / 2;
  const A11 = sub(Asub, 0, 0, h),
    A12 = sub(Asub, 0, h, h),
    A21 = sub(Asub, h, 0, h),
    A22 = sub(Asub, h, h, h);
  const B11 = sub(Bsub, 0, 0, h),
    B12 = sub(Bsub, 0, h, h),
    B21 = sub(Bsub, h, 0, h),
    B22 = sub(Bsub, h, h, h);

  let C11, C12, C21, C22;
  if (variant === "naive") {
    const P1 = buildTree(A11, B11, h, depth + 1, "P1", "P1 = A11 × B11");
    const P2 = buildTree(A12, B21, h, depth + 1, "P2", "P2 = A12 × B21");
    const P3 = buildTree(A11, B12, h, depth + 1, "P3", "P3 = A11 × B12");
    const P4 = buildTree(A12, B22, h, depth + 1, "P4", "P4 = A12 × B22");
    const P5 = buildTree(A21, B11, h, depth + 1, "P5", "P5 = A21 × B11");
    const P6 = buildTree(A22, B21, h, depth + 1, "P6", "P6 = A22 × B21");
    const P7 = buildTree(A21, B12, h, depth + 1, "P7", "P7 = A21 × B12");
    const P8 = buildTree(A22, B22, h, depth + 1, "P8", "P8 = A22 × B22");
    node.children = [P1, P2, P3, P4, P5, P6, P7, P8];
    C11 = addM(P1.result, P2.result);
    C12 = addM(P3.result, P4.result);
    C21 = addM(P5.result, P6.result);
    C22 = addM(P7.result, P8.result);
    node.combineFormula = "C11=P1+P2   C12=P3+P4   C21=P5+P6   C22=P7+P8  (8 products, 4 sums)";
  } else {
    const M1 = buildTree(addM(A11, A22), addM(B11, B22), h, depth + 1, "M1", "M1 = (A11+A22)(B11+B22)");
    const M2 = buildTree(addM(A21, A22), B11, h, depth + 1, "M2", "M2 = (A21+A22)·B11");
    const M3 = buildTree(A11, subM(B12, B22), h, depth + 1, "M3", "M3 = A11·(B12−B22)");
    const M4 = buildTree(A22, subM(B21, B11), h, depth + 1, "M4", "M4 = A22·(B21−B11)");
    const M5 = buildTree(addM(A11, A12), B22, h, depth + 1, "M5", "M5 = (A11+A12)·B22");
    const M6 = buildTree(subM(A21, A11), addM(B11, B12), h, depth + 1, "M6", "M6 = (A21−A11)(B11+B12)");
    const M7 = buildTree(subM(A12, A22), addM(B21, B22), h, depth + 1, "M7", "M7 = (A12−A22)(B21+B22)");
    node.children = [M1, M2, M3, M4, M5, M6, M7];
    C11 = addM(subM(addM(M1.result, M4.result), M5.result), M7.result);
    C12 = addM(M3.result, M5.result);
    C21 = addM(M2.result, M4.result);
    C22 = addM(subM(addM(M1.result, M3.result), M2.result), M6.result);
    node.combineFormula = "C11=M1+M4−M5+M7   C12=M3+M5   C21=M2+M4   C22=M1−M2+M3+M6  (7 products)";
  }
  node.result = joinQuadrants(C11, C12, C21, C22);
  node.multCount = node.children.reduce((s, c) => s + c.multCount, 0);
  return node;
}

// Post-order: leaves get consecutive integer slots left-to-right; an
// internal node sits above the midpoint of its own children's slots --
// same scheme the Karatsuba tree uses, so the two read as the same kind
// of picture.
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

function rebuildTree() {
  idCounter = 0;
  nodeById = new Map();
  countAtDepth = [];
  maxDepth = 0;
  layoutCounter = 0;
  root = buildTree(A, B, matSize, 0, "", "A × B (the full product)");
  assignLayout(root);
  totalLeaves = layoutCounter;
}

// ---- animation (JS generator walking the precomputed tree) ----

function makeStep(phase, node, msg) {
  return { phase, nodeId: node.id, depth: node.depth, msg };
}

function* animateGen(node) {
  nodeStatus.set(node.id, "active");
  yield makeStep(
    "enter",
    node,
    node.leaf ? `Base case: ${node.A[0][0]} × ${node.B[0][0]}` : `${node.roleFull} -- multiplying two ${node.size}×${node.size} matrices`
  );

  if (node.leaf) {
    leafMultsDone++;
    yield makeStep("leaf", node, `${node.A[0][0]} × ${node.B[0][0]} = ${node.result[0][0]} (a scalar multiplication)`);
  } else {
    const count = variant === "naive" ? 8 : 7;
    yield makeStep("split", node, `Splitting into four ${node.size / 2}×${node.size / 2} quadrants each -- ${count} sub-multiplications to go`);
    for (const c of node.children) {
      yield* animateGen(c);
    }
    yield makeStep("combine", node, `Combine: ${node.combineFormula} → ${fmtMatrix(node.result)}`);
  }

  nodeStatus.set(node.id, "done");
  yield makeStep("done_node", node, `${node.size}×${node.size} result ready: ${fmtMatrix(node.result)}`);
}

function* solveGen() {
  nodeStatus = new Map();
  leafMultsDone = 0;
  yield* animateGen(root);
  yield {
    phase: "done",
    nodeId: root.id,
    depth: 0,
    msg: `Done -- ${root.multCount} scalar multiplication${root.multCount === 1 ? "" : "s"} total. C = ${fmtMatrix(root.result)}`,
  };
}

// ---- control panel ----

function resetState() {
  rebuildTree();
  gen = solveGen();
  currentState = null;
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  updateStatus(`Ready -- A = ${fmtMatrix(A)}, B = ${fmtMatrix(B)}. Press Play or Step.`);
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
  const depth = currentState ? currentState.depth : 0;
  statsEl.textContent = `Scalar multiplications so far: ${leafMultsDone} / ${totalLeaves}   Current depth: ${depth} / ${maxDepth}`;
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function updateCompareHint() {
  if (!compareEl) return;
  const levels = countLevels(matSize);
  const naiveCount = 8 ** levels;
  const strassenCount = 7 ** levels;
  compareEl.textContent = `At n=${matSize} (${levels} split level${levels === 1 ? "" : "s"}): naive quadrant recursion needs 8^${levels} = ${naiveCount} scalar multiplications; Strassen needs 7^${levels} = ${strassenCount}. That gap only widens with n -- Theta(n^3) vs Theta(n^log2(7)) = Theta(n^2.807...).`;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Matrices");
  const rowSize = panelRow(holder);
  panelSelect(rowSize, {
    label: "Matrix size (n×n)",
    options: [
      { value: "2", label: "2×2" },
      { value: "4", label: "4×4" },
      { value: "8", label: "8×8" },
    ],
    value: String(matSize),
    onChange: (v) => {
      matSize = Number(v);
      A = randomMatrix(matSize);
      B = randomMatrix(matSize);
      buildPanel();
      resetState();
    },
  });
  const rowRandom = panelRow(holder);
  rowRandom.classList.add("buttons");
  panelButton(rowRandom, "Randomize", () => {
    A = randomMatrix(matSize);
    B = randomMatrix(matSize);
    resetState();
  });

  panelHeading(holder, "Algorithm");
  const rowVariant = panelRow(holder);
  panelSelect(rowVariant, {
    label: "Mode",
    options: [
      { value: "naive", label: "Naive (8-way recursive)" },
      { value: "strassen", label: "Strassen (7-way recursive)" },
    ],
    value: variant,
    onChange: (v) => {
      variant = v;
      resetState();
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
    "Orange = currently being split/combined · blue = the split moment (four quadrants each) · yellow = a leaf (scalar) multiplication · purple = combining sub-products into this level's result · green = this node's result is ready. The strip below the tree shows the two matrices the current node is multiplying, and -- once ready -- the product it produced.";
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
  A = randomMatrix(matSize);
  B = randomMatrix(matSize);
  cnv = createCanvas(700, 620);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  drawTree();
  drawDetail();

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}

function nodeRadius(depth) {
  const margin = 34;
  const chartW = width - margin * 2;
  const count = countAtDepth[depth] || 1;
  return constrain(chartW / (2 * count) - 3, 3, 16);
}

const TREE_TOP = 28;
const TREE_BOTTOM = 372;

function nodeXY(node) {
  const margin = 34;
  const chartW = width - margin * 2;
  const chartH = TREE_BOTTOM - TREE_TOP;
  const levelH = maxDepth > 0 ? chartH / maxDepth : 0;
  const slot = chartW / Math.max(1, totalLeaves);
  const x = margin + (node.x + 0.5) * slot;
  const y = TREE_TOP + node.depth * levelH;
  return [x, y];
}

function drawTree() {
  if (!root) return;

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
    if (curPhase === "split") col = SPLIT_COLOR;
    else if (curPhase === "leaf") col = LEAF_COLOR;
    else if (curPhase === "combine") col = COMBINE_COLOR;
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

  if (r >= 11) {
    fill(theme.text[0], theme.text[1], theme.text[2]);
    textAlign(CENTER);
    textSize(r >= 15 ? 11 : 9);
    const label = node.leaf ? (status === "done" ? String(node.result[0][0]) : `${node.A[0][0]}×${node.B[0][0]}`) : node.roleShort || "A×B";
    text(label, x, y - r - 5);
  }

  for (const c of node.children) drawNode(c, curId, curPhase);
}

// ---- detail strip: the current node's real matrices ----

function drawMatrixGrid(m, x, y, boxSize, label, col) {
  const n = m.length;
  const cell = boxSize / n;
  fill(col[0], col[1], col[2]);
  noStroke();
  textAlign(CENTER);
  textSize(12);
  text(label, x + boxSize / 2, y - 8);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = x + j * cell;
      const cy = y + i * cell;
      stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
      strokeWeight(1);
      fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
      rect(cx, cy, cell, cell);
      noStroke();
      fill(theme.text[0], theme.text[1], theme.text[2]);
      textSize(constrain(cell * 0.42, 7, 14));
      text(m[i][j], cx + cell / 2, cy + cell / 2 + 4);
    }
  }
}

function drawDetail() {
  const node = currentState ? nodeById.get(currentState.nodeId) : root;
  if (!node) return;

  const top = TREE_BOTTOM + 24;
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  noStroke();
  textAlign(LEFT);
  textSize(12);
  const label = node.leaf ? "Base case" : node.roleFull;
  text(`Current node -- ${label} (${node.size}×${node.size}):`, 24, top);

  const boxSize = Math.min(150, (width - 3 * 40) / 3);
  const y2 = top + 30;
  drawMatrixGrid(node.A, 24, y2, boxSize, "A", [90, 140, 220]);
  drawMatrixGrid(node.B, 24 + boxSize + 40, y2, boxSize, "B", [197, 139, 224]);

  const status = nodeStatus.get(node.id) || "pending";
  if (status === "done") {
    drawMatrixGrid(node.result, 24 + 2 * (boxSize + 40), y2, boxSize, "= product", [90, 195, 120]);
  } else {
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    noStroke();
    textAlign(CENTER);
    textSize(11);
    text("product not ready yet", 24 + 2 * (boxSize + 40) + boxSize / 2, y2 + boxSize / 2);
  }
}
