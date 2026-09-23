// Closest Pair of Points (divide and conquer).
// Ported from a py5 (Processing) desktop visualizer: same generator-based
// step trace, same dimension-reduction idea (split on one axis, then treat
// the merge band as a lower-dimensional problem on the next axis), just
// redrawn on a 2D canvas (1D/2D) or in WEBGL (3D) instead of a desktop window.

const AXIS_NAMES = ["x", "y", "z"];
const RED = [229, 90, 90];
const HIGHLIGHT = [255, 165, 0];
const RANGE = 170;

let points = [];
let dimension = 2;
let sampleSize = 20;
let stepInterval = 24; // frames between auto-steps while playing

let gen = null;
let currentState = null;
let playing = false;
let cnv = null;

let playBtn, statusEl;

// ---- algorithm (JS generator, mirrors solver.py) ----

function distance(a, b) {
  if (dimension === 1) return Math.abs(a.x - b.x);
  if (dimension === 2) return Math.hypot(a.x - b.x, a.y - b.y);
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function axisValue(p, axisIndex) {
  return p[AXIS_NAMES[axisIndex]];
}

function clearHighlights() {
  for (const p of points) p.highlighted = false;
}

function clearDimming() {
  for (const p of points) p.dimmed = false;
}

function setActive(activeList) {
  const activeSet = new Set(activeList);
  for (const p of points) p.dimmed = !activeSet.has(p);
}

function setCompare(a, b) {
  clearHighlights();
  a.highlighted = b.highlighted = true;
}

function makeStep(phase, opts) {
  opts = opts || {};
  return {
    phase: phase,
    active: opts.active || [],
    compare: opts.compare || null,
    best: opts.best || null,
    axis: opts.axis || null,
    splitValue: opts.splitValue != null ? opts.splitValue : null,
    band: opts.band || null,
    depth: opts.depth || 0,
    dimsLeft: opts.dimsLeft != null ? opts.dimsLeft : null,
    msg: opts.msg || "",
  };
}

function* solveGen() {
  if (points.length < 2) {
    yield makeStep("done", { msg: "Need at least 2 points" });
    return null;
  }

  points.sort((a, b) => a.x - b.x);
  clearHighlights();
  clearDimming();
  yield makeStep("sort", { active: points.slice(), dimsLeft: dimension, msg: "Sorted points by x" });

  const best = yield* closestPairDC(points, dimension, 0, 0);

  clearHighlights();
  clearDimming();
  if (best) {
    best[0].color = HIGHLIGHT;
    best[1].color = HIGHLIGHT;
  }
  const bd = best ? distance(best[0], best[1]) : Infinity;
  yield makeStep("done", { best, msg: `Done — closest distance = ${bd.toFixed(1)}` });
  return best;
}

function* closestPairDC(pts, remainingDims, axisIndex, depth) {
  const axis = AXIS_NAMES[axisIndex];

  if (remainingDims === 1) {
    return yield* scanAlongAxis(pts, axisIndex, depth);
  }

  if (pts.length <= 3) {
    setActive(pts);
    yield makeStep("base_case", { active: pts.slice(), axis, depth, dimsLeft: remainingDims, msg: `Base case: brute force on ${pts.length} point(s)` });
    return yield* bruteForce(pts, axis, remainingDims, depth);
  }

  const ptsSorted = pts.slice().sort((a, b) => axisValue(a, axisIndex) - axisValue(b, axisIndex));
  const mid = Math.floor(ptsSorted.length / 2);
  const splitValue = axisValue(ptsSorted[mid], axisIndex);
  const left = ptsSorted.slice(0, mid);
  const right = ptsSorted.slice(mid);

  setActive(ptsSorted);
  yield makeStep("split", { active: ptsSorted.slice(), axis, splitValue, depth, dimsLeft: remainingDims, msg: `Splitting ${ptsSorted.length} points at ${axis} = ${splitValue.toFixed(1)}` });

  setActive(left);
  yield makeStep("recurse_enter", { active: left.slice(), axis, depth: depth + 1, dimsLeft: remainingDims, msg: `Recursing into lower ${axis} half` });
  const bestLeft = yield* closestPairDC(left, remainingDims, axisIndex, depth + 1);

  setActive(right);
  yield makeStep("recurse_enter", { active: right.slice(), axis, depth: depth + 1, dimsLeft: remainingDims, msg: `Recursing into upper ${axis} half` });
  const bestRight = yield* closestPairDC(right, remainingDims, axisIndex, depth + 1);

  const dLeft = bestLeft ? distance(bestLeft[0], bestLeft[1]) : Infinity;
  const dRight = bestRight ? distance(bestRight[0], bestRight[1]) : Infinity;
  let best = dLeft <= dRight ? bestLeft : bestRight;
  let d = Math.min(dLeft, dRight);

  setActive(ptsSorted);
  yield makeStep("recurse_exit", { active: ptsSorted.slice(), best, axis, splitValue, depth, dimsLeft: remainingDims, msg: `Best of both halves so far: d = ${d.toFixed(1)}` });

  const bandLo = splitValue - d;
  const bandHi = splitValue + d;
  const bandPoints = ptsSorted.filter((p) => {
    const v = axisValue(p, axisIndex);
    return v >= bandLo && v <= bandHi;
  });

  setActive(bandPoints);
  yield makeStep("combine_split", { active: bandPoints.slice(), best, axis, splitValue, band: [bandLo, bandHi], depth, dimsLeft: remainingDims, msg: `${bandPoints.length} point(s) within ${d.toFixed(1)} of the split` });

  if (remainingDims > 1) {
    const nextAxis = AXIS_NAMES[axisIndex + 1];
    yield makeStep("reduce_dimension", { active: bandPoints.slice(), best, axis, band: [bandLo, bandHi], depth: depth + 1, dimsLeft: remainingDims - 1, msg: `${axis} is now bounded — treating this band as a ${remainingDims - 1}D cloud along ${nextAxis}` });
  }

  const bandBest = yield* closestPairDC(bandPoints, remainingDims - 1, axisIndex + 1, depth + 1);

  if (bandBest) {
    const dBand = distance(bandBest[0], bandBest[1]);
    if (dBand < d) {
      best = bandBest;
      d = dBand;
    }
  }

  setActive(ptsSorted);
  yield makeStep("recurse_exit", { active: ptsSorted.slice(), best, axis, splitValue, depth, dimsLeft: remainingDims, msg: `Region resolved: d = ${d.toFixed(1)}` });
  return best;
}

function* scanAlongAxis(pts, axisIndex, depth) {
  const axis = AXIS_NAMES[axisIndex];
  const ordered = pts.slice().sort((a, b) => axisValue(a, axisIndex) - axisValue(b, axisIndex));

  if (ordered.length < 2) return null;

  setActive(ordered);
  yield makeStep("base_case", { active: ordered.slice(), axis, depth, dimsLeft: 1, msg: `1D base case along ${axis}: scanning ${ordered.length} point(s)` });

  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    setCompare(a, b);
    const d = distance(a, b);
    yield makeStep("compare", { compare: [a, b], best, axis, depth, dimsLeft: 1, msg: `Comparing neighbors along ${axis} (d = ${d.toFixed(1)})` });

    if (d < bestD) {
      bestD = d;
      best = [a, b];
      yield makeStep("compare", { compare: [a, b], best, axis, depth, dimsLeft: 1, msg: `New closest pair (d = ${d.toFixed(1)})` });
    }
  }

  clearHighlights();
  return best;
}

function* bruteForce(pts, axis, remainingDims, depth) {
  if (pts.length < 2) return null;

  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i];
      const b = pts[j];
      setCompare(a, b);
      const d = distance(a, b);
      yield makeStep("compare", { compare: [a, b], best, axis, depth, dimsLeft: remainingDims, msg: `Brute-force comparing (d = ${d.toFixed(1)})` });

      if (d < bestD) {
        bestD = d;
        best = [a, b];
      }
    }
  }

  clearHighlights();
  return best;
}

// ---- sample data + control panel ----

function randomPoints(n, dim) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = random(-RANGE, RANGE);
    const y = dim >= 2 ? random(-RANGE, RANGE) : 0;
    const z = dim >= 3 ? random(-RANGE, RANGE) : 0;
    pts.push({ x, y, z, color: RED, highlighted: false, dimmed: false });
  }
  return pts;
}

function resetState() {
  points = randomPoints(sampleSize, dimension);
  gen = solveGen();
  currentState = null;
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  updateStatus("Ready — press Play or Step.");
}

function stepOnce() {
  if (!gen) return;
  const res = gen.next();
  if (!res.done) {
    currentState = res.value;
    updateStatus(currentState.msg);
    if (currentState.phase === "done") {
      playing = false;
      if (playBtn) playBtn.textContent = "Play";
    }
  }
}

function updateStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");

  const row1 = panelRow(holder);
  panelSelect(row1, {
    label: "Dimension",
    options: [
      { value: "1", label: "1D" },
      { value: "2", label: "2D" },
      { value: "3", label: "3D" },
    ],
    value: String(dimension),
    onChange: (v) => {
      dimension = Number(v);
      createCanvasForDimension();
      resetState();
    },
  });
  panelSlider(row1, {
    label: "Points",
    min: 4,
    max: 40,
    value: sampleSize,
    grow: true,
    onInput: (v) => {
      sampleSize = v;
      resetState();
    },
  });
  panelSlider(row1, {
    label: "Speed",
    min: 1,
    max: 10,
    value: 6,
    showValue: false,
    onInput: (v) => {
      stepInterval = Math.round(46 - v * 4);
    },
  });

  const row2 = panelRow(holder);
  playBtn = panelButton(row2, "Play", togglePlay);
  panelButton(row2, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(row2, "New sample", resetState);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "In 3D, drag the canvas to orbit and scroll to zoom.";
  holder.appendChild(hint);

  statusEl = panelStatusLine(holder);
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

// ---- p5 lifecycle ----

function createCanvasForDimension() {
  if (cnv) cnv.remove();
  cnv = dimension === 3 ? createCanvas(600, 400, WEBGL) : createCanvas(600, 400);
  cnv.parent("sketch-holder");
}

function setup() {
  createCanvasForDimension();
  buildPanel();
  resetState();
}

function draw() {
  if (dimension === 3) {
    draw3D();
  } else {
    draw2D();
  }

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}

function draw2D() {
  background(15, 15, 20);
  push();
  translate(width / 2, height / 2);

  drawOverlay2D();

  noStroke();
  for (const p of points) {
    const alpha = p.dimmed ? 60 : 255;
    if (p.highlighted) {
      fill(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2], alpha);
      circle(p.x, p.y, 16);
    }
    fill(p.color[0], p.color[1], p.color[2], alpha);
    circle(p.x, p.y, 9);
  }

  textAlign(CENTER);
  textSize(11);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const alpha = p.dimmed ? 60 : 255;
    fill(200, 200, 210, alpha);
    text(i, p.x, p.y - 12);
  }
  pop();
}

function drawOverlay2D() {
  if (!currentState || !currentState.axis) return;
  const axis = currentState.axis;
  noStroke();
  if (currentState.band) {
    const [lo, hi] = currentState.band;
    fill(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2], 40);
    if (axis === "x") rect(lo, -height, hi - lo, height * 2);
    else if (axis === "y") rect(-width, lo, width * 2, hi - lo);
  } else if (currentState.splitValue != null) {
    fill(120, 120, 130, 180);
    if (axis === "x") rect(currentState.splitValue - 1, -height, 2, height * 2);
    else if (axis === "y") rect(-width, currentState.splitValue - 1, width * 2, 2);
  }
}

function draw3D() {
  background(15, 15, 20);
  orbitControl();
  ambientLight(90);
  pointLight(255, 255, 255, 200, 200, 300);

  drawOverlay3D();

  noStroke();
  for (const p of points) {
    push();
    translate(p.x, p.y, p.z);
    const alpha = p.dimmed ? 60 : 255;
    if (p.highlighted) {
      fill(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2], alpha);
      sphere(9);
    }
    fill(p.color[0], p.color[1], p.color[2], alpha);
    sphere(5);
    pop();
  }
}

function drawOverlay3D() {
  if (!currentState || !currentState.axis) return;
  const axis = currentState.axis;
  const span = RANGE * 2.2;

  drawingContext.depthMask(false);
  noStroke();
  push();
  if (currentState.band) {
    const [lo, hi] = currentState.band;
    const thickness = Math.max(hi - lo, 2);
    const center = (lo + hi) / 2;
    fill(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2], 45);
    drawSlab(axis, center, thickness, span);
  } else if (currentState.splitValue != null) {
    fill(120, 120, 130, 150);
    drawSlab(axis, currentState.splitValue, 3, span);
  }
  pop();
  drawingContext.depthMask(true);
}

function drawSlab(axis, center, thickness, span) {
  push();
  if (axis === "x") {
    translate(center, 0, 0);
    box(thickness, span, span);
  } else if (axis === "y") {
    translate(0, center, 0);
    box(span, thickness, span);
  } else {
    translate(0, 0, center);
    box(span, span, thickness);
  }
  pop();
}
