// Traveling Salesman Problem -- two exact algorithms, one dropdown:
//
//   "dp"   Held-Karp bitmask DP: C[S][e] = cheapest way to start at city 0,
//          visit exactly the cities in subset S, and end at e. Rendered as
//          a table -- rows are subsets (grouped by size), columns are the
//          end city -- the same table-filling visual language as
//          edit-distance/matrix-chain, just keyed by (subset, city)
//          instead of (prefix, prefix) or (interval).
//   "bnb"  Branch and bound: a full permutation tree (same recursion-tree
//          language as Karatsuba/Strassen/Fibonacci) where every node also
//          carries a cheapest-edge lower bound; a subtree whose bound can't
//          beat the best complete tour found so far is skipped without
//          expanding it further.
//
// Both modes share the same random city layout and distance matrix (city
// positions are genuine 2D points; distances are rounded Euclidean, not
// independently randomized), drawn as a small inset map with the winning
// tour once one is found.

let n = 5; // number of cities, including the fixed start city 0
let variant = "dp"; // "dp" | "bnb"
let cities = []; // [{x, y}], logical coords in [0, 100]
let dist = []; // n x n integer distance matrix

let currentColor = [255, 165, 0];
let sourceColor = [180, 130, 230];
let doneColor = [90, 195, 120];
let pathColor = [255, 210, 70];
let prunedColor = [110, 110, 122];

let playing = false;
let stepInterval = 5;
let playBtn, statusEl;
let theme = null;

// --- dp mode state ---
let dpGen = null;
let dpState = null; // {phase, mask, e, j, cost, msg}
let C = null; // C[mask][e]
let parentOf = null; // parentOf[mask][e] = j used to reach it
let rowOrder = []; // masks in fill order (by popcount, then value)
let filledCells = new Set(); // "mask,e"
let optimalCells = new Set(); // "mask,e" on the backtrace
let bestTour = null; // array of city indices, 0-based, starting and ending at 0
let bestTourCost = null;
let dpCellW = 30;
let dpCellH = 14;
let dpOriginX = 40;
let dpOriginY = 26;

// --- bnb mode state ---
let bnbRoot = null;
let bnbGen = null;
let bnbState = null; // {phase, node, msg}
let bnbNodeStatus = new Map(); // id -> "visiting" | "pruned" | "leaf" | "leaf_best"
let bnbBestCost = Infinity;
let bnbBestPath = null;
let bnbVisitedCount = 0;
let bnbPrunedCount = 0;
let bnbLeafCount = 0;
let bnbMaxDepth = 0;
let bnbSlot = 0; // running leaf-slot counter during layout

function randomCities(count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({ x: 5 + Math.random() * 90, y: 5 + Math.random() * 90 });
  }
  return pts;
}

function computeDist(pts) {
  const nn = pts.length;
  const d = Array.from({ length: nn }, () => new Array(nn).fill(0));
  for (let i = 0; i < nn; i++) {
    for (let j = i + 1; j < nn; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const v = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));
      d[i][j] = v;
      d[j][i] = v;
    }
  }
  return d;
}

function popcount(x) {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

function maskToLabel(mask) {
  const cs = [];
  for (let b = 0; b < n - 1; b++) if (mask & (1 << b)) cs.push(b + 1);
  return "{" + cs.join(",") + "}";
}

// ---------------- Held-Karp DP ----------------

function* dpSolveGen() {
  const FULL = 1 << (n - 1);
  C = Array.from({ length: FULL }, () => new Array(n).fill(Infinity));
  parentOf = Array.from({ length: FULL }, () => new Array(n).fill(-1));
  filledCells = new Set();

  rowOrder = [];
  for (let mask = 1; mask < FULL; mask++) rowOrder.push(mask);
  rowOrder.sort((a, b) => popcount(a) - popcount(b) || a - b);

  // base cases: single-city subsets
  for (let e = 1; e < n; e++) {
    const mask = 1 << (e - 1);
    C[mask][e] = dist[0][e];
    filledCells.add(mask + "," + e);
  }
  yield { phase: "base", mask: -1, e: -1, msg: "Base case: C[{e}][e] = distance straight from city 0 to e." };

  for (const mask of rowOrder) {
    if (popcount(mask) === 1) continue; // base cases already done
    for (let e = 1; e < n; e++) {
      if (!(mask & (1 << (e - 1)))) continue;
      const prevMask = mask & ~(1 << (e - 1));
      let best = Infinity;
      let bestJ = -1;
      for (let j = 1; j < n; j++) {
        if (!(prevMask & (1 << (j - 1)))) continue;
        const cand = C[prevMask][j] + dist[j][e];
        yield {
          phase: "trying",
          mask,
          e,
          j,
          prevMask,
          cost: cand,
          bestCost: Math.min(best, cand),
          msg: `C[${maskToLabel(mask)}][${e}]: via j=${j} costs C[${maskToLabel(prevMask)}][${j}] (${C[prevMask][j]}) + d(${j},${e}) (${dist[j][e]}) = ${cand}`,
        };
        if (cand < best) {
          best = cand;
          bestJ = j;
        }
      }
      C[mask][e] = best;
      parentOf[mask][e] = bestJ;
      filledCells.add(mask + "," + e);
      yield {
        phase: "cell_done",
        mask,
        e,
        j: bestJ,
        prevMask,
        cost: best,
        msg: `C[${maskToLabel(mask)}][${e}] = ${best}, arriving via city ${bestJ}`,
      };
    }
  }

  const fullMask = FULL - 1;
  let best = Infinity;
  let bestE = -1;
  for (let e = 1; e < n; e++) {
    const cand = C[fullMask][e] + dist[e][0];
    if (cand < best) {
      best = cand;
      bestE = e;
    }
  }
  bestTourCost = best;
  bestTour = backtrackDp(fullMask, bestE);
  optimalCells = new Set();
  let m = fullMask;
  let e = bestE;
  while (e !== -1) {
    optimalCells.add(m + "," + e);
    const j = parentOf[m][e];
    const nm = m & ~(1 << (e - 1));
    m = nm;
    e = j;
  }

  yield {
    phase: "done",
    done: true,
    mask: -1,
    e: -1,
    msg: `Done — shortest tour costs ${best}: ${bestTour.join(" → ")} → 0`,
  };
}

function backtrackDp(mask, e) {
  const order = [];
  let m = mask;
  let cur = e;
  while (cur !== -1) {
    order.push(cur);
    const j = parentOf[m][cur];
    m = m & ~(1 << (cur - 1));
    cur = j;
  }
  order.reverse();
  return [0, ...order];
}

// ---------------- Branch and bound ----------------

let bnbNodeSeq = 0;

function bnbMinEdgeTo(v, allowed) {
  let best = Infinity;
  for (const u of allowed) {
    if (u === v) continue;
    if (dist[v][u] < best) best = dist[v][u];
  }
  return best === Infinity ? 0 : best;
}

function bnbBound(path, visited, costSoFar) {
  const remaining = [];
  for (let c = 0; c < n; c++) if (!visited.has(c)) remaining.push(c);
  const vk = path[path.length - 1];
  const pool = remaining.concat([0]);
  let b = costSoFar;
  b += bnbMinEdgeTo(vk, pool.filter((x) => x !== vk));
  for (const v of remaining) {
    b += bnbMinEdgeTo(v, pool.filter((x) => x !== v));
  }
  return b;
}

function buildBnbTree(path, visited) {
  const cost = path.length < 2 ? 0 : pathCost(path);
  const node = {
    id: bnbNodeSeq++,
    path: path.slice(),
    depth: path.length,
    cost,
    bound: bnbBound(path, visited, cost),
    children: [],
    isFull: path.length === n,
    slot: -1,
  };
  if (!node.isFull) {
    for (let c = 1; c < n; c++) {
      if (visited.has(c)) continue;
      visited.add(c);
      path.push(c);
      node.children.push(buildBnbTree(path, visited));
      path.pop();
      visited.delete(c);
    }
  }
  return node;
}

function pathCost(path) {
  let c = 0;
  for (let i = 0; i < path.length - 1; i++) c += dist[path[i]][path[i + 1]];
  return c;
}

function assignBnbLayout(node) {
  if (node.children.length === 0) {
    node.slot = bnbSlot++;
    return node.slot;
  }
  let sum = 0;
  for (const ch of node.children) sum += assignBnbLayout(ch);
  node.slot = sum / node.children.length;
  return node.slot;
}

function* bnbAnimateGen(node) {
  bnbVisitedCount++;
  bnbMaxDepth = Math.max(bnbMaxDepth, node.depth);
  if (node.bound >= bnbBestCost) {
    bnbNodeStatus.set(node.id, "pruned");
    bnbPrunedCount++;
    yield {
      phase: "prune",
      node,
      msg: `Prune at [${node.path.join(",")}]: bound ${node.bound} ≥ best tour so far (${bnbBestCost}).`,
    };
    return;
  }
  bnbNodeStatus.set(node.id, "visiting");
  yield {
    phase: "visit",
    node,
    msg: `Visit [${node.path.join(",")}]: cost so far ${node.cost}, lower bound ${node.bound} (best so far: ${bnbBestCost === Infinity ? "—" : bnbBestCost}).`,
  };
  if (node.isFull) {
    bnbLeafCount++;
    const total = node.cost + dist[node.path[node.path.length - 1]][0];
    const isNewBest = total < bnbBestCost;
    if (isNewBest) {
      bnbBestCost = total;
      bnbBestPath = node.path.slice();
      bnbNodeStatus.set(node.id, "leaf_best");
    } else {
      bnbNodeStatus.set(node.id, "leaf");
    }
    yield {
      phase: "leaf",
      node,
      isNewBest,
      total,
      msg: isNewBest
        ? `Complete tour [${node.path.join(",")} → 0] costs ${total} — new best!`
        : `Complete tour [${node.path.join(",")} → 0] costs ${total} — not better than ${bnbBestCost}.`,
    };
    return;
  }
  for (const ch of node.children) {
    yield* bnbAnimateGen(ch);
  }
}

function* bnbSolveGen() {
  bnbNodeSeq = 0;
  bnbSlot = 0;
  bnbNodeStatus = new Map();
  bnbBestCost = Infinity;
  bnbBestPath = null;
  bnbVisitedCount = 0;
  bnbPrunedCount = 0;
  bnbLeafCount = 0;
  bnbMaxDepth = 0;
  bnbRoot = buildBnbTree([0], new Set([0]));
  assignBnbLayout(bnbRoot);
  yield* bnbAnimateGen(bnbRoot);
  const order = [0, ...bnbBestPath.slice(1)];
  yield {
    phase: "done",
    done: true,
    node: null,
    msg: `Done — shortest tour costs ${bnbBestCost}: ${order.join(" → ")} → 0. Visited ${bnbVisitedCount} of the ${countFullTreeNodes(n)} full-tree nodes (${bnbPrunedCount} subtrees pruned).`,
  };
}

function countFullTreeNodes(nn) {
  let total = 1;
  let fact = 1;
  for (let k = 1; k < nn; k++) {
    fact *= nn - k;
    total += fact;
  }
  return total;
}

// ---------------- shared setup / playback ----------------

function resetState() {
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  if (variant === "dp") {
    dpGen = dpSolveGen();
    dpState = null;
    filledCells = new Set();
    optimalCells = new Set();
    bestTour = null;
    recomputeDpLayout();
    updateStatus(`Ready — ${n} cities. Press Play or Step.`);
  } else {
    // Generator bodies don't run until the first next() call, so the
    // reset happening inside bnbSolveGen() itself (bnbBestPath, bnbRoot,
    // etc.) hasn't executed yet at this point -- but draw() calls
    // drawMap() every frame regardless, even before any step is taken.
    // Clear the stale state explicitly here so a smaller new `n` never
    // sees a leftover tour built for a larger, since-shrunk `cities`.
    bnbGen = bnbSolveGen();
    bnbState = null;
    bnbRoot = null;
    bnbNodeStatus = new Map();
    bnbBestCost = Infinity;
    bnbBestPath = null;
    bnbVisitedCount = 0;
    bnbPrunedCount = 0;
    bnbLeafCount = 0;
    bnbMaxDepth = 0;
    updateStatus(`Ready — ${n} cities. Press Play or Step.`);
  }
}

function stepOnce() {
  if (variant === "dp") {
    if (!dpGen) return;
    const res = dpGen.next();
    if (!res.done) {
      dpState = res.value;
      updateStatus(dpState.msg);
      if (dpState.done) {
        playing = false;
        if (playBtn) playBtn.textContent = "Play";
      }
    }
  } else {
    if (!bnbGen) return;
    const res = bnbGen.next();
    if (!res.done) {
      bnbState = res.value;
      updateStatus(bnbState.msg);
      if (bnbState.done) {
        playing = false;
        if (playBtn) playBtn.textContent = "Play";
      }
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

  panelHeading(holder, "Algorithm");
  const rowV = panelRow(holder);
  panelSelect(rowV, {
    label: "Variant",
    grow: true,
    value: variant,
    options: [
      { value: "dp", label: "Held-Karp DP (subset table)" },
      { value: "bnb", label: "Branch and bound (pruned tree)" },
    ],
    onChange: (v) => {
      variant = v;
      buildPanel();
      resetState();
    },
  });

  panelHeading(holder, "Cities");
  const row1 = panelRow(holder);
  panelSlider(row1, {
    label: "Number of cities",
    min: 4,
    max: 6,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
      cities = randomCities(n);
      dist = computeDist(cities);
      resetState();
    },
  });
  const row2 = panelRow(holder);
  panelButton(row2, "Randomize cities", () => {
    cities = randomCities(n);
    dist = computeDist(cities);
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
    variant === "dp"
      ? "Rows are visited subsets of cities (grouped by size); a blank cell means that end-city isn't in that subset."
      : "Dashed gray = pruned without expanding; green = a complete tour that beat the best found so far.";
  holder.appendChild(hint);

  statusEl = panelStatusLine(holder);
}

function setup() {
  const cnv = createCanvas(600, 400);
  cnv.parent("sketch-holder");
  cities = randomCities(n);
  dist = computeDist(cities);
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
    drawDpTable();
    drawMap(bestTour, 440, 10, 150, 150);
  } else {
    drawBnbTree();
    drawMap(bnbBestPath ? [...bnbBestPath, 0] : null, 440, 10, 150, 150);
  }
}

function readableTextColor(rgb) {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return luma > 150 ? 30 : 250;
}

// ---------------- DP table rendering ----------------

function recomputeDpLayout() {
  const rows = rowOrder.filter((m) => popcount(m) >= 2).length;
  dpCellH = Math.max(9, Math.min(16, Math.floor(340 / Math.max(1, rows))));
  dpCellW = 34;
  dpOriginX = 76;
  dpOriginY = 24;
}

function drawDpTable() {
  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(LEFT, TOP);
  textSize(11);
  text("C[subset][end city] — rows grouped by subset size", 10, 6);

  textAlign(CENTER, CENTER);
  textSize(Math.max(8, dpCellH * 0.62));
  for (let e = 1; e < n; e++) {
    drawHeader(dpOriginX + (e - 0.5) * dpCellW, dpOriginY - dpCellH * 0.7, String(e));
  }

  let row = 0;
  for (const mask of rowOrder) {
    const pc = popcount(mask);
    if (pc === 1) continue; // base cases not shown as their own table rows
    const y = dpOriginY + row * dpCellH + dpCellH / 2;
    noStroke();
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    textAlign(RIGHT, CENTER);
    textSize(Math.max(8, dpCellH * 0.6));
    text(maskToLabel(mask), dpOriginX - 6, y);

    for (let e = 1; e < n; e++) {
      const x = dpOriginX + (e - 0.5) * dpCellW;
      const key = mask + "," + e;
      if (!(mask & (1 << (e - 1)))) continue;
      let kind = "empty";
      let label = "";
      const isCurrent = dpState && (dpState.phase === "trying" || dpState.phase === "cell_done") && dpState.mask === mask && dpState.e === e;
      const isSourceCell =
        dpState &&
        (dpState.phase === "trying" || dpState.phase === "cell_done") &&
        dpState.prevMask === mask &&
        dpState.j === e &&
        !isCurrent;

      if (dpState && dpState.done && optimalCells.has(key)) {
        label = String(C[mask][e]);
        kind = "path";
      } else if (isCurrent) {
        label = dpState.phase === "cell_done" ? String(C[mask][e]) : "";
        kind = "current";
      } else if (isSourceCell) {
        label = String(C[mask][e]);
        kind = "source";
      } else if (filledCells.has(key)) {
        label = String(C[mask][e]);
        kind = "done";
      } else {
        kind = "empty";
      }
      drawDpCell(x, y, label, kind);
    }
    row++;
  }
}

function drawHeader(x, y, label) {
  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(CENTER, CENTER);
  text(label, x, y);
}

function drawDpCell(x, y, label, kind) {
  let col = null;
  if (kind === "current") col = currentColor;
  else if (kind === "source") col = sourceColor;
  else if (kind === "path") col = pathColor;
  else if (kind === "done") col = doneColor;

  rectMode(CENTER);
  if (col) {
    stroke(col[0], col[1], col[2]);
    strokeWeight(kind === "path" ? 2.5 : 1.5);
    fill(col[0], col[1], col[2]);
  } else {
    stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
    strokeWeight(1);
    fill(theme.cellBg[0], theme.cellBg[1], theme.cellBg[2]);
  }
  rect(x, y, dpCellW - 3, dpCellH - 2, 2);

  noStroke();
  if (col) fill(readableTextColor(col));
  else fill(theme.text[0], theme.text[1], theme.text[2]);
  textAlign(CENTER, CENTER);
  text(label, x, y);
}

// ---------------- Branch and bound tree rendering ----------------

function drawBnbTree() {
  if (!bnbRoot) return;
  const leafCount = Math.max(1, bnbSlot);
  const marginX = 30;
  const usableW = 400 - marginX * 2;
  const levelH = Math.min(56, 320 / Math.max(1, bnbRoot ? maxTreeDepth(bnbRoot) : 1));

  push();
  translate(marginX, 24);
  drawBnbEdges(bnbRoot, leafCount, usableW, levelH);
  drawBnbNodes(bnbRoot, leafCount, usableW, levelH);
  pop();

  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(LEFT, TOP);
  textSize(11);
  text(`visited ${bnbVisitedCount}  ·  pruned ${bnbPrunedCount}  ·  best ${bnbBestCost === Infinity ? "—" : bnbBestCost}`, 10, 358);
}

function maxTreeDepth(node) {
  if (node.children.length === 0) return node.depth;
  let m = node.depth;
  for (const ch of node.children) m = Math.max(m, maxTreeDepth(ch));
  return m;
}

function nodePos(node, leafCount, usableW, levelH) {
  const x = leafCount <= 1 ? usableW / 2 : (node.slot / (leafCount - 1)) * usableW;
  const y = (node.depth - 1) * levelH;
  return { x, y };
}

function drawBnbEdges(node, leafCount, usableW, levelH) {
  if (!bnbNodeStatus.has(node.id)) return;
  const p = nodePos(node, leafCount, usableW, levelH);
  for (const ch of node.children) {
    if (!bnbNodeStatus.has(ch.id)) continue;
    const cp = nodePos(ch, leafCount, usableW, levelH);
    stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
    strokeWeight(1);
    line(p.x, p.y, cp.x, cp.y);
    drawBnbEdges(ch, leafCount, usableW, levelH);
  }
}

function drawBnbNodes(node, leafCount, usableW, levelH) {
  const status = bnbNodeStatus.get(node.id);
  if (!status) return;
  const p = nodePos(node, leafCount, usableW, levelH);
  let col = currentColor;
  if (status === "pruned") col = prunedColor;
  else if (status === "leaf_best") col = pathColor;
  else if (status === "leaf") col = doneColor;
  else if (status === "visiting") col = node.depth === 1 ? currentColor : sourceColor;

  const r = status === "pruned" ? 5 : node.isFull ? 7 : 6;
  noStroke();
  fill(col[0], col[1], col[2]);
  if (status === "pruned") {
    stroke(col[0], col[1], col[2]);
    strokeWeight(1.5);
    noFill();
    circle(p.x, p.y, r * 2);
    line(p.x - r * 0.7, p.y - r * 0.7, p.x + r * 0.7, p.y + r * 0.7);
    line(p.x - r * 0.7, p.y + r * 0.7, p.x + r * 0.7, p.y - r * 0.7);
  } else {
    circle(p.x, p.y, r * 2);
  }

  for (const ch of node.children) drawBnbNodes(ch, leafCount, usableW, levelH);
}

// ---------------- shared city map ----------------

function drawMap(tour, mx, my, mw, mh) {
  noFill();
  stroke(theme.cellBorder[0], theme.cellBorder[1], theme.cellBorder[2]);
  strokeWeight(1);
  rect(mx, my, mw, mh);

  const toX = (v) => mx + 8 + (v / 100) * (mw - 16);
  const toY = (v) => my + 8 + (v / 100) * (mh - 16);

  if (tour && tour.length > 1) {
    stroke(pathColor[0], pathColor[1], pathColor[2]);
    strokeWeight(2);
    for (let i = 0; i < tour.length - 1; i++) {
      const a = cities[tour[i]];
      const b = cities[tour[i + 1]];
      line(toX(a.x), toY(a.y), toX(b.x), toY(b.y));
    }
  }

  for (let i = 0; i < cities.length; i++) {
    const c = cities[i];
    noStroke();
    fill(i === 0 ? currentColor[0] : theme.text[0], i === 0 ? currentColor[1] : theme.text[1], i === 0 ? currentColor[2] : theme.text[2]);
    circle(toX(c.x), toY(c.y), 7);
    textAlign(CENTER, TOP);
    textSize(9);
    fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
    text(String(i), toX(c.x), toY(c.y) + 6);
  }

  noStroke();
  fill(theme.mutedText[0], theme.mutedText[1], theme.mutedText[2]);
  textAlign(LEFT, TOP);
  textSize(10);
  text(tour ? "best tour" : "no tour yet", mx, my + mh + 4);
}
