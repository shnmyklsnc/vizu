// Multiple-precision multiplication (divide and conquer): naive D&C vs.
// Karatsuba. Same "one article, one dropdown" pattern as quicksort's
// pivot-strategy variants: one underlying idea (split each n-bit number
// into a high half and a low half, recurse, recombine), two different
// recombination strategies with two very different multiplication counts.
//
//   "naive"     -- a = a1*2^s + a2, b = b1*2^s + b2 (a1/b1 = high half,
//                   a2/b2 = low half, s = shift). The schoolbook expansion
//                   needs FOUR sub-products:
//                     a*b = a1b1*2^(2s) + (a1b2 + a2b1)*2^s + a2b2
//                   That's T(n) = 4T(n/2) + O(n) = Theta(n^2) -- no better
//                   than grade-school long multiplication.
//   "karatsuba" -- the same split, but only THREE sub-products:
//                     x = a1*b1, z = a2*b2, y = (a1+a2)*(b1+b2)
//                     a*b = x*2^(2s) + (y - x - z)*2^s + z
//                   (y - x - z) recovers exactly the (a1b2 + a2b1) cross
//                   term, algebraically, without ever computing a1b2 or
//                   a2b1 as their own multiplication. T(n) = 3T(n/2) +
//                   O(n) = Theta(n^log2(3)) = Theta(n^1.585...).
//
// The whole recursion is precomputed as a tree the moment operands/variant/
// bit-width change (buildTree() below is a pure function -- deterministic,
// no animation state), then a separate generator (animateGen) walks that
// same tree in the order the algorithm actually visits it, yielding one
// step per node-event. This keeps "what the algorithm computes" and "how
// we narrate it" cleanly separated, the same split closest-pair uses
// between its solver and its step trace.

let variant = "karatsuba"; // "naive" | "karatsuba"
let bitLength = 4; // total bits per operand: 2 | 4 | 8
let aVal = 0;
let bVal = 0;

let root = null;
let nodeById = new Map();
let nodeStatus = new Map(); // id -> "pending" | "active" | "done"
let countAtDepth = [];
let totalLeaves = 0;
let maxDepth = 0;

let leafMultsDone = 0; // running tally of leaf multiplications actually reached so far

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

// ---- small helpers ----

function countLevels(L) {
  let levels = 0;
  while (L > 1) {
    L = Math.ceil(L / 2);
    levels++;
  }
  return levels;
}

function randomOperand(bits) {
  return Math.floor(Math.random() * 2 ** bits);
}

// ---- recursion tree (pure function -- no animation state touched here) ----

let idCounter = 0;

function buildTree(aValN, bValN, length, depth) {
  const id = idCounter++;
  const node = {
    id,
    aVal: aValN,
    bVal: bValN,
    length,
    depth,
    leaf: length <= 1,
    children: [],
  };
  countAtDepth[depth] = (countAtDepth[depth] || 0) + 1;
  maxDepth = Math.max(maxDepth, depth);
  nodeById.set(id, node);

  if (node.leaf) {
    node.result = aValN * bValN;
    node.multCount = 1;
    return node;
  }

  const shift = Math.floor(length / 2);
  const halfL = Math.ceil(length / 2);
  const aHigh = Math.floor(aValN / 2 ** shift);
  const aLow = aValN - aHigh * 2 ** shift;
  const bHigh = Math.floor(bValN / 2 ** shift);
  const bLow = bValN - bHigh * 2 ** shift;
  node.shift = shift;
  node.aHigh = aHigh;
  node.aLow = aLow;
  node.bHigh = bHigh;
  node.bLow = bLow;

  if (variant === "naive") {
    const c1 = buildTree(aHigh, bHigh, halfL, depth + 1);
    const c2 = buildTree(aHigh, bLow, halfL, depth + 1);
    const c3 = buildTree(aLow, bHigh, halfL, depth + 1);
    const c4 = buildTree(aLow, bLow, halfL, depth + 1);
    c1.role = "p₁ = a₁×b₁ (high×high)";
    c2.role = "p₂ = a₁×b₂ (high×low)";
    c3.role = "p₃ = a₂×b₁ (low×high)";
    c4.role = "p₄ = a₂×b₂ (low×low)";
    node.children = [c1, c2, c3, c4];
    node.result = c1.result * 2 ** (2 * shift) + (c2.result + c3.result) * 2 ** shift + c4.result;
    node.multCount = c1.multCount + c2.multCount + c3.multCount + c4.multCount;
    node.combineFormula = `p₁·2^${2 * shift} + (p₂+p₃)·2^${shift} + p₄ = ${node.result}`;
  } else {
    const cx = buildTree(aHigh, bHigh, halfL, depth + 1);
    const cz = buildTree(aLow, bLow, halfL, depth + 1);
    const sumA = aHigh + aLow;
    const sumB = bHigh + bLow;
    const cy = buildTree(sumA, sumB, halfL, depth + 1);
    cx.role = "x = a₁×b₁ (high×high)";
    cz.role = "z = a₂×b₂ (low×low)";
    cy.role = "y = (a₁+a₂)×(b₁+b₂)";
    node.children = [cx, cz, cy];
    node.result = cx.result * 2 ** (2 * shift) + (cy.result - cx.result - cz.result) * 2 ** shift + cz.result;
    node.multCount = cx.multCount + cz.multCount + cy.multCount;
    node.combineFormula = `x·2^${2 * shift} + (y−x−z)·2^${shift} + z = ${node.result}`;
  }
  return node;
}

// Post-order: leaves get consecutive integer slots left-to-right; an
// internal node sits above the midpoint of its own children's slots.
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
  root = buildTree(aVal, bVal, bitLength, 0);
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
    node.leaf
      ? `Base case: ${node.aVal} × ${node.bVal}`
      : `${node.role ? node.role + " -- " : ""}Multiplying ${node.aVal} × ${node.bVal} (${node.length}-bit)`
  );

  if (node.leaf) {
    leafMultsDone++;
    yield makeStep("leaf", node, `${node.aVal} × ${node.bVal} = ${node.result} (primitive multiplication)`);
  } else {
    yield makeStep(
      "split",
      node,
      `Split: a = ${node.aHigh}·2^${node.shift} + ${node.aLow}, b = ${node.bHigh}·2^${node.shift} + ${node.bLow}`
    );
    for (const c of node.children) {
      yield* animateGen(c);
    }
    const count = variant === "naive" ? 4 : 3;
    yield makeStep("combine", node, `Combine (${count} sub-product${count > 1 ? "s" : ""} at this level): ${node.combineFormula}`);
  }

  nodeStatus.set(node.id, "done");
  yield makeStep("done_node", node, `${node.length}-bit result ready: ${node.aVal} × ${node.bVal} = ${node.result}`);
}

function* solveGen() {
  nodeStatus = new Map();
  leafMultsDone = 0;
  yield* animateGen(root);
  yield {
    phase: "done",
    nodeId: root.id,
    depth: 0,
    msg: `Done -- ${aVal} × ${bVal} = ${root.result} using ${root.multCount} primitive multiplication(s)`,
  };
}

// ---- control panel ----

function resetState() {
  rebuildTree();
  gen = solveGen();
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
  const depth = currentState ? currentState.depth : 0;
  statsEl.textContent = `Leaf multiplications so far: ${leafMultsDone} / ${totalLeaves}   Current depth: ${depth} / ${maxDepth}`;
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function updateCompareHint() {
  if (!compareEl) return;
  const levels = countLevels(bitLength);
  const naiveCount = 4 ** levels;
  const karaCount = 3 ** levels;
  compareEl.textContent = `At ${bitLength} bits (${levels} split level${levels === 1 ? "" : "s"}): naive D&C needs 4^${levels} = ${naiveCount} primitive multiplications; Karatsuba needs 3^${levels} = ${karaCount}. The gap only grows with n -- that's Theta(n^2) vs Theta(n^log2(3)) = Theta(n^1.585...).`;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Operands");
  const rowBits = panelRow(holder);
  panelSelect(rowBits, {
    label: "Bits per number",
    options: [
      { value: "2", label: "2-bit" },
      { value: "4", label: "4-bit" },
      { value: "8", label: "8-bit" },
    ],
    value: String(bitLength),
    onChange: (v) => {
      bitLength = Number(v);
      aVal = Math.min(aVal, 2 ** bitLength - 1);
      bVal = Math.min(bVal, 2 ** bitLength - 1);
      buildPanel();
      resetState();
    },
  });

  const rowA = panelRow(holder);
  panelSlider(rowA, {
    label: "a",
    min: 0,
    max: 2 ** bitLength - 1,
    value: aVal,
    grow: true,
    onInput: (v) => {
      aVal = v;
      resetState();
    },
  });
  const rowB = panelRow(holder);
  panelSlider(rowB, {
    label: "b",
    min: 0,
    max: 2 ** bitLength - 1,
    value: bVal,
    grow: true,
    onInput: (v) => {
      bVal = v;
      resetState();
    },
  });

  const rowRandom = panelRow(holder);
  rowRandom.classList.add("buttons");
  panelButton(rowRandom, "Randomize", () => {
    aVal = randomOperand(bitLength);
    bVal = randomOperand(bitLength);
    buildPanel();
    resetState();
  });

  panelHeading(holder, "Algorithm");
  const rowVariant = panelRow(holder);
  panelSelect(rowVariant, {
    label: "Mode",
    options: [
      { value: "naive", label: "Naive D&C (4 sub-products)" },
      { value: "karatsuba", label: "Karatsuba (3 sub-products)" },
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
    "Orange = currently being split/combined · blue = the split moment (a into high+low, b into high+low) · yellow = a leaf (primitive) multiplication · purple = combining sub-products back into a level's result · green = this node's result is ready.";
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
  aVal = randomOperand(bitLength);
  bVal = randomOperand(bitLength);
  cnv = createCanvas(700, 460);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  drawTree();

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

function nodeXY(node) {
  const margin = 34;
  const topMargin = 30;
  const bottomMargin = 46;
  const chartW = width - margin * 2;
  const chartH = height - topMargin - bottomMargin;
  const levelH = maxDepth > 0 ? chartH / maxDepth : 0;
  const slot = chartW / Math.max(1, totalLeaves);
  const x = margin + (node.x + 0.5) * slot;
  const y = topMargin + node.depth * levelH;
  return [x, y];
}

function drawTree() {
  if (!root) return;

  const curId = currentState ? currentState.nodeId : null;
  const curPhase = currentState ? currentState.phase : null;

  // Edges first, so nodes draw on top.
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
    const label = status === "done" && node.result != null ? String(node.result) : `${node.aVal}×${node.bVal}`;
    text(label, x, y - r - 5);
  }

  for (const c of node.children) drawNode(c, curId, curPhase);
}
