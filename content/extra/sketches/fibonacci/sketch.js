// Computing the nth Fibonacci number, three ways -- one recurrence,
// F(n) = F(n-1) + F(n-2), with wildly different costs depending on how
// literally you translate it into code:
//
//   "naive"    -- recurse exactly as written. Every call to F(k) makes
//                 two more calls, F(k-1) and F(k-2), with no memory of
//                 what's already been computed. Unlike every divide-and-
//                 conquer tree elsewhere on this site, these subproblems
//                 OVERLAP -- F(3) gets recomputed from scratch every time
//                 it's needed, and it's needed a lot. Total calls grow
//                 like the golden ratio to the n: Theta(phi^n).
//   "memo"     -- the exact same recursive structure, but the first time
//                 F(k) is actually computed, its answer is cached. Every
//                 later call for that same k is answered instantly from
//                 the cache instead of recursing again. Same shape of
//                 code, Theta(n) total work instead of Theta(phi^n) --
//                 exactly 2n-1 calls, n-3 of them cache hits.
//   "bottomup" -- no recursion at all. Fill a table F[0], F[1], ..., F[n]
//                 left to right, each entry the sum of the two before it.
//                 Theta(n) time, and none of the call-stack overhead
//                 memoization still pays.
//   "precedence" -- the general DP recipe made explicit: turn the
//                 recurrence into a precedence graph (an edge k->j means
//                 "k must be known before j can be computed"), then run
//                 Kahn's algorithm -- repeatedly process any node whose
//                 dependencies are all satisfied -- to find a valid
//                 computation order. For Fibonacci that order always
//                 comes out as 0, 1, 2, ..., n, which is exactly why
//                 "bottom-up" means "left to right" here -- the recipe
//                 doesn't know that in advance, it discovers it.
//
// Naive and memo share one generator (buildTree/animateGen), exactly the
// same tree-walking pattern as Karatsuba's and Strassen's sketches --
// memo just threads a cache through construction so a repeated F(k) is
// built as an instantly-resolved "cached" leaf instead of recursing
// again, which is what visually prunes the tree down to size. Bottom-up
// is different enough in kind (an array fill, not a tree) that it gets
// its own generator and its own drawing routine. Precedence is different
// again -- a graph algorithm (Kahn's), not a Fibonacci-specific one.

let n = 10; // 2..18
let variant = "naive"; // "naive" | "memo" | "bottomup" | "precedence"

let root = null;
let nodeById = new Map();
let nodeStatus = new Map(); // id -> "pending" | "active" | "done"
let countAtDepth = [];
let maxDepth = 0;
let totalCalls = 0;
let cacheHits = 0;

let table = null; // bottom-up mode's F[0..n], null entries = not yet filled

// ---- precedence-graph mode state ----
let precIndeg = []; // precIndeg[k] = number of unmet dependencies
let precSuccessors = []; // precSuccessors[k] = nodes that depend on k
let precNodeState = []; // "pending" | "ready" | "done", per k
let precQueue = []; // current Kahn's-algorithm ready queue, for display
let precOrder = []; // finished processing order, filled in as nodes complete
let readyColor = [255, 165, 0];

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 20;

let cnv = null;
let theme = null;

let activeColor = [255, 165, 0];
let doneColor = [90, 195, 120];
let cachedColor = [110, 200, 220];
const LEAF_COLOR = [255, 210, 70];
const COMBINE_COLOR = [190, 120, 230];

let playBtn, statusEl, statsEl, compareEl;

// ---- recursion tree (naive / memo) -- pure function, no animation state ----

let idCounter = 0;

function buildTree(k, depth, cache) {
  const id = idCounter++;
  const node = { id, k, depth, leaf: k <= 1, cached: false, children: [] };
  countAtDepth[depth] = (countAtDepth[depth] || 0) + 1;
  maxDepth = Math.max(maxDepth, depth);
  nodeById.set(id, node);

  if (node.leaf) {
    node.result = k; // F(0) = 0, F(1) = 1
    node.callCount = 1;
    return node;
  }

  if (variant === "memo" && cache.has(k)) {
    node.cached = true;
    node.result = cache.get(k);
    node.callCount = 1;
    return node;
  }

  const c1 = buildTree(k - 1, depth + 1, cache);
  const c2 = buildTree(k - 2, depth + 1, cache);
  node.children = [c1, c2];
  node.result = c1.result + c2.result;
  node.callCount = 1 + c1.callCount + c2.callCount;
  if (variant === "memo") cache.set(k, node.result);
  return node;
}

function rebuildTree() {
  idCounter = 0;
  nodeById = new Map();
  countAtDepth = [];
  maxDepth = 0;
  const cache = new Map();
  root = buildTree(n, 0, cache);
  totalCalls = root.callCount;
  cacheHits = 0;
  nodeById.forEach((node) => {
    if (node.cached) cacheHits++;
  });
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
    yield makeStep("leaf", node, `Base case: F(${node.k}) = ${node.result}`);
  } else if (node.cached) {
    yield makeStep("cached", node, `F(${node.k}) already computed earlier -- reused from the cache, no recursion needed (=${node.result})`);
  } else {
    yield makeStep("enter", node, `F(${node.k}) = F(${node.k - 1}) + F(${node.k - 2})`);
    for (const c of node.children) yield* animateGen(c);
    yield makeStep("combine", node, `F(${node.k}) = F(${node.k - 1}) + F(${node.k - 2}) = ${node.children[0].result} + ${node.children[1].result} = ${node.result}`);
  }
  nodeStatus.set(node.id, "done");
  yield makeStep("done_node", node, `F(${node.k}) = ${node.result}`);
}

function* solveGenTree() {
  nodeStatus = new Map();
  yield* animateGen(root);
  const label = variant === "naive" ? "naive recursion" : "memoized recursion";
  yield {
    phase: "done",
    nodeId: root.id,
    depth: 0,
    msg: `Done -- F(${n}) = ${root.result}, using ${label}: ${totalCalls} total call${totalCalls === 1 ? "" : "s"}${variant === "memo" ? ` (${cacheHits} of them cache hits)` : ""}.`,
  };
}

// ---- bottom-up: a flat array fill, no recursion ----

function* solveGenBottomUp() {
  table = new Array(n + 1).fill(null);
  if (n >= 0) {
    table[0] = 0;
    yield { phase: "fill", k: 0, msg: "F(0) = 0 (base case)" };
  }
  if (n >= 1) {
    table[1] = 1;
    yield { phase: "fill", k: 1, msg: "F(1) = 1 (base case)" };
  }
  for (let k = 2; k <= n; k++) {
    table[k] = table[k - 1] + table[k - 2];
    yield { phase: "fill", k, msg: `F(${k}) = F(${k - 1}) + F(${k - 2}) = ${table[k - 1]} + ${table[k - 2]} = ${table[k]}` };
  }
  yield { phase: "done", k: n, msg: `Done -- F(${n}) = ${table[n]}, using bottom-up: ${n + 1} table entr${n === 0 ? "y" : "ies"} filled, no recursion at all.` };
}

// ---- precedence graph + Kahn's algorithm: the general DP recipe ----
// F(k) = F(k-1) + F(k-2) becomes two edges into node k: (k-1)->k and
// (k-2)->k, meaning "k needs k-1 and k-2 done first". Kahn's algorithm
// repeatedly pulls any node with zero remaining unmet dependencies off a
// queue, "computes" it, and tells its successors one dependency is now
// satisfied -- discovering a valid order to fill the DP table in, rather
// than being handed one.

function buildPrecedenceGraph() {
  precIndeg = new Array(n + 1).fill(0);
  precSuccessors = Array.from({ length: n + 1 }, () => []);
  // Only F(0) and F(1) are base cases with no real dependency. Every other
  // F(j) genuinely needs both F(j-1) and F(j-2) -- build edges from the
  // target j's side so no spurious edge ever lands on a base case.
  for (let j = 2; j <= n; j++) {
    precIndeg[j] = 2;
    precSuccessors[j - 1].push(j);
    precSuccessors[j - 2].push(j);
  }
  precNodeState = new Array(n + 1).fill("pending");
}

function* solveGenPrecedence() {
  buildPrecedenceGraph();
  const indeg = precIndeg.slice();
  precQueue = [];
  precOrder = [];
  for (let k = 0; k <= n; k++) {
    if (indeg[k] === 0) {
      precQueue.push(k);
      precNodeState[k] = "ready";
    }
  }
  yield {
    phase: "init",
    k: -1,
    msg: `Precedence graph built: F(k) needs F(k−1) and F(k−2) done first. Starting queue (no dependencies at all): {${precQueue.join(", ")}}.`,
  };

  while (precQueue.length > 0) {
    const u = precQueue.shift();
    precNodeState[u] = "done";
    precOrder.push(u);
    yield {
      phase: "visit",
      k: u,
      msg: `Process F(${u}) -- every dependency it had is already done. Computed order so far: ${precOrder.join(" → ")}.`,
    };
    for (const v of precSuccessors[u]) {
      indeg[v]--;
      if (indeg[v] === 0) {
        precQueue.push(v);
        precNodeState[v] = "ready";
        yield {
          phase: "ready",
          k: v,
          msg: `F(${v})'s last dependency (F(${u})) just finished -- F(${v}) is now ready, added to the queue: {${precQueue.join(", ")}}.`,
        };
      }
    }
  }

  yield {
    phase: "done",
    k: n,
    msg: `Done -- Kahn's algorithm discovered the order ${precOrder.join(" → ")}, which is just 0..${n} in sequence. That's the whole recipe: recurrence → precedence graph → topological order → fill the table in that order. It's the same order bottom-up mode uses, found mechanically instead of assumed.`,
  };
}

// ---- control panel ----

function resetState() {
  if (variant === "bottomup") {
    table = null;
    gen = solveGenBottomUp();
  } else if (variant === "precedence") {
    precQueue = [];
    precOrder = [];
    precNodeState = new Array(n + 1).fill("pending");
    gen = solveGenPrecedence();
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
  if (variant === "bottomup") {
    const filled = table ? table.filter((v) => v !== null).length : 0;
    statsEl.textContent = `Table entries filled: ${filled} / ${n + 1}`;
  } else if (variant === "precedence") {
    statsEl.textContent = `Processed: ${precOrder.length} / ${n + 1}   Ready queue: {${precQueue.join(", ")}}`;
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
  const phi = (1 + Math.sqrt(5)) / 2;
  compareEl.textContent = `At n=${n}: naive recursion makes on the order of φ^${n} ≈ ${Math.round(Math.pow(phi, n)).toLocaleString()} calls; memoized and bottom-up both do exactly O(n) work -- memoized makes precisely 2n−1 = ${2 * n - 1} calls (${n - 3 >= 0 ? n - 3 : 0} of them cache hits), bottom-up fills exactly n+1 = ${n + 1} table entries.`;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Input");
  const rowN = panelRow(holder);
  panelSlider(rowN, {
    label: "n",
    min: 2,
    max: 18,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
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
      { value: "memo", label: "Memoized (top-down)" },
      { value: "bottomup", label: "Bottom-up (iterative)" },
      { value: "precedence", label: "Precedence graph (Kahn's algorithm)" },
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
    variant === "bottomup"
      ? "Each cell is filled once, left to right, as the sum of the two before it. Orange = the cell currently being computed, green = filled."
      : variant === "precedence"
      ? "Gray = still waiting on a dependency · orange = every dependency is met, sitting in the ready queue · green = processed. An arrow k→j means “j needs k first.”"
      : "Orange = a call currently in progress · yellow = a base case (F(0) or F(1)) · purple = combining two results into this call's answer · cyan = a repeated call answered instantly from the cache (memoized mode only) · green = this call's result is ready.";
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
  if (variant === "bottomup") {
    drawTable();
  } else if (variant === "precedence") {
    drawPrecedence();
  } else {
    drawTree();
  }

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}

// ---- tree rendering (naive / memo) ----

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
  if (status === "done") col = node.cached ? cachedColor : doneColor;
  if (isCurrent) {
    if (curPhase === "leaf") col = LEAF_COLOR;
    else if (curPhase === "cached") col = cachedColor;
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
    textSize(r >= 15 ? 11 : 9);
    const label = status === "done" ? `F(${node.k})=${node.result}` : `F(${node.k})`;
    text(label, x, y - r - 5);
  }

  for (const c of node.children) drawNode(c, curId, curPhase);
}

// ---- table rendering (bottom-up) ----

function drawTable() {
  if (!table) return;
  const margin = 24;
  const maxCols = n + 1;
  const cellW = constrain((width - margin * 2) / maxCols - 4, 18, 70);
  const cellH = 56;
  const y = 120;
  const totalW = maxCols * (cellW + 4) - 4;
  const x0 = (width - totalW) / 2;

  const curK = currentState ? currentState.k : -1;
  const isDone = currentState && currentState.phase === "done";

  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  noStroke();
  textAlign(CENTER);
  textSize(13);
  text("F[0]  F[1]  F[2]  ...  F[n] -- filled left to right, each the sum of the two before it", width / 2, y - 24);

  for (let k = 0; k <= n; k++) {
    const cx = x0 + k * (cellW + 4);
    const filled = table[k] !== null;
    let col = theme.cellBg;
    if (filled) col = doneColor;
    if (k === curK && !isDone) col = activeColor;

    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(1);
    fill(filled || k === curK ? col[0] : theme.cellBg[0], filled || k === curK ? col[1] : theme.cellBg[1], filled || k === curK ? col[2] : theme.cellBg[2], filled ? 255 : k === curK ? 200 : 255);
    rect(cx, y, cellW, cellH, 4);

    noStroke();
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    textAlign(CENTER);
    textSize(9);
    text(`F[${k}]`, cx + cellW / 2, y - 6);

    if (filled) {
      fill(theme.text[0], theme.text[1], theme.text[2]);
      textSize(constrain(cellW * 0.24, 8, 14));
      const valStr = String(table[k]);
      text(valStr.length > 7 ? valStr.slice(0, 6) + "…" : valStr, cx + cellW / 2, y + cellH / 2 + 4);
    }
  }
}

// ---- precedence-graph rendering: nodes 0..n in a row, edges k->k+1 and
// k->k+2 as arcs above, colored by Kahn's-algorithm status ----

function drawPrecedence() {
  const margin = 30;
  const maxCols = n + 1;
  const spacing = constrain((width - margin * 2) / Math.max(1, maxCols - 1), 22, 64);
  const totalW = (maxCols - 1) * spacing;
  const x0 = (width - totalW) / 2;
  const y = height / 2 + 40;
  const r = constrain(spacing * 0.28, 7, 16);

  const curK = currentState ? currentState.k : -1;
  const curPhase = currentState ? currentState.phase : null;

  const xOf = (k) => x0 + k * spacing;

  noFill();
  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  strokeWeight(1);
  for (let k = 0; k + 1 <= n; k++) {
    arcBetween(xOf(k), y, xOf(k + 1), y, r, 0.55);
  }
  for (let k = 0; k + 2 <= n; k++) {
    arcBetween(xOf(k), y, xOf(k + 2), y, r, 1.05);
  }

  for (let k = 0; k <= n; k++) {
    const status = precNodeState[k] || "pending";
    let col = theme.mutedText;
    if (status === "ready") col = readyColor;
    if (status === "done") col = doneColor;

    const isCurrent = k === curK && (curPhase === "visit" || curPhase === "ready");
    noStroke();
    fill(col[0], col[1], col[2], status === "pending" ? 130 : 255);
    circle(xOf(k), y, r * 2);
    if (isCurrent) {
      noFill();
      stroke(col[0], col[1], col[2]);
      strokeWeight(2);
      circle(xOf(k), y, r * 2 + 8);
      noStroke();
    }

    fill(theme.text[0], theme.text[1], theme.text[2]);
    textAlign(CENTER);
    textSize(constrain(r * 0.8, 8, 12));
    text(`F(${k})`, xOf(k), y + r + 14);
  }

  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(CENTER);
  textSize(12);
  text("an arrow k→j means “j needs k first”", width / 2, y - 70);
}

// A gentle upward arc from (x1,y) to (x2,y) using a p5 bezier curve,
// bulging higher for the longer-reaching k->k+2 edges so the two edge
// lengths don't visually collide with each other.
function arcBetween(x1, y, x2, y2, r, heightFactor) {
  const span = Math.abs(x2 - x1);
  const topY = y - r - span * heightFactor * 0.5 - 10;
  noFill();
  bezier(x1, y - r, x1, topY, x2, topY, x2, y - r);
}
