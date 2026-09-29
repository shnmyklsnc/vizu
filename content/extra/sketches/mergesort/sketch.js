// Mergesort (divide and conquer, stable, not in place -- needs an
// auxiliary run to merge into). Two variants sharing one merge routine,
// picked from the panel's dropdown, exactly the same "one algorithm, one
// dropdown" pattern as quicksort's sort/select and edit-distance's four
// variants:
//
//   "topdown"  -- classic recursive mergesort: split the range in half,
//                 recurse into BOTH halves, then merge the two sorted
//                 results back together. The recursion bottoms out at
//                 single elements (already sorted, trivially).
//   "bottomup" -- the iterative version Goldstine and von Neumann actually
//                 worked out in full in 1948: no recursion at all, just
//                 repeated passes over the whole array, each pass merging
//                 every adjacent pair of already-sorted runs into a run
//                 twice as long. Same merge step, same total work, no
//                 call stack.
//
// The point this sketch exists to make, alongside quicksort: partitioning
// gambles on a good split and can degrade to Theta(n^2); merging never
// gambles at all. The recursion (or the pass structure) always splits
// exactly in half, so the comparison count barely moves no matter what
// order the input starts in -- try "Worst case (sorted)" here and watch
// it stay close to the random-input count, unlike quicksort's "last
// element" pivot strategy on the same preset.
//
// Rendering note: a real merge writes into a *separate* buffer and only
// copies back once done (that's the whole reason mergesort needs O(n)
// extra space). This sketch writes in place, left to right, which is
// safe for the algorithm -- the two runs are snapshotted into leftBuf/
// rightBuf before a single write happens -- but it means the *display*
// can't just read `values[idx]` for a slot the merge hasn't reached yet:
// that slot may still hold a value that's already been copied somewhere
// else this merge. Those not-yet-decided slots are drawn as a dashed
// placeholder instead of a bar, rather than showing something misleading.

let values = [];
let n = 16;
const MIN_VAL = 5;
const MAX_VAL = 95;

let mode = "topdown"; // "topdown" | "bottomup"

let comparisons = 0;
let writes = 0;
let locallySorted = new Set();

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 22;

let cnv = null;
let theme = null;

let leftRunColor = [79, 195, 204]; // teal, matches the site's --less token
let rightRunColor = [197, 139, 224]; // purple, matches --greater
let sortedColor = [90, 195, 120];
const COMPARE_COLOR = [255, 210, 70];
const FLASH_COLOR = [255, 255, 255];
const DIVIDER_COLOR = [170, 170, 180];

let playBtn, statusEl, statsEl;

// ---- geometry (shared by the run-row and the main row) ----

const MARGIN = 26;
const RUN_ROW_H = 100;
const ROW_GAP = 26;
const BOTTOM_GUTTER = 46;
const BAR_GAP = 4;

function chartW() {
  return width - MARGIN * 2;
}

function barW() {
  return Math.max(2, (chartW() - BAR_GAP * (n - 1)) / n);
}

function xFor(idx) {
  return MARGIN + idx * (barW() + BAR_GAP);
}

function mainTop() {
  return MARGIN + RUN_ROW_H + ROW_GAP;
}

function baselineY() {
  return height - BOTTOM_GUTTER;
}

// ---- small helpers ----

function randomArray(count) {
  return Array.from({ length: count }, () => MIN_VAL + Math.floor(Math.random() * (MAX_VAL - MIN_VAL + 1)));
}

function sortedArray(count) {
  return Array.from({ length: count }, (_, i) => Math.round(MIN_VAL + (i * (MAX_VAL - MIN_VAL)) / Math.max(1, count - 1)));
}

function reversedArray(count) {
  return sortedArray(count).reverse();
}

// p5 has no built-in dashed stroke; step along the segment placing
// dash-length strokes with gap-length gaps in between.
function drawDashedLine(x1, y1, x2, y2, dashLen, gapLen) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLen = Math.sqrt(dx * dx + dy * dy);
  if (segLen === 0) return;
  const ux = dx / segLen;
  const uy = dy / segLen;
  let travelled = 0;
  while (travelled < segLen) {
    const segEnd = Math.min(travelled + dashLen, segLen);
    line(x1 + ux * travelled, y1 + uy * travelled, x1 + ux * segEnd, y1 + uy * segEnd);
    travelled += dashLen + gapLen;
  }
}

// ---- algorithm (JS generators) ----

function makeStep(phase, opts) {
  opts = opts || {};
  return {
    phase,
    active: opts.active || null, // [lo, hi] currently in focus
    depth: opts.depth != null ? opts.depth : 0,
    mid: opts.mid != null ? opts.mid : null,
    leftBuf: opts.leftBuf || null, // snapshot of the left run, taken once, never mutated
    rightBuf: opts.rightBuf || null, // snapshot of the right run
    i: opts.i != null ? opts.i : null, // pointer into leftBuf
    j: opts.j != null ? opts.j : null, // pointer into rightBuf
    filled: opts.filled != null ? opts.filled : null, // how many output slots this merge has written so far
    fromLeft: opts.fromLeft != null ? opts.fromLeft : null,
    passWidth: opts.passWidth != null ? opts.passWidth : null,
    msg: opts.msg || "",
  };
}

// The one move both variants share: merge the sorted run values[lo..mid]
// with the sorted run values[mid+1..hi] back into values[lo..hi]. Both
// runs are snapshotted up front, so overwriting values[] as we go is
// always safe -- we never again read from values[] until this merge is
// done.
function* mergeGen(lo, mid, hi, depth) {
  const leftBuf = values.slice(lo, mid + 1);
  const rightBuf = values.slice(mid + 1, hi + 1);
  let i = 0,
    j = 0,
    filled = 0;

  yield makeStep("mergeStart", {
    active: [lo, hi],
    depth,
    mid,
    leftBuf: leftBuf.slice(),
    rightBuf: rightBuf.slice(),
    i,
    j,
    filled,
    msg: `Merging the sorted runs [${lo}..${mid}] (${leftBuf.length} item${leftBuf.length === 1 ? "" : "s"}) and [${mid + 1}..${hi}] (${rightBuf.length} item${rightBuf.length === 1 ? "" : "s"})`,
  });

  while (i < leftBuf.length && j < rightBuf.length) {
    comparisons++;
    yield makeStep("compare", {
      active: [lo, hi],
      depth,
      mid,
      leftBuf: leftBuf.slice(),
      rightBuf: rightBuf.slice(),
      i,
      j,
      filled,
      msg: `Comparing the left run's ${leftBuf[i]} with the right run's ${rightBuf[j]}`,
    });
    const fromLeft = leftBuf[i] <= rightBuf[j];
    const val = fromLeft ? leftBuf[i] : rightBuf[j];
    values[lo + filled] = val;
    writes++;
    if (fromLeft) i++;
    else j++;
    filled++;
    yield makeStep("place", {
      active: [lo, hi],
      depth,
      mid,
      leftBuf: leftBuf.slice(),
      rightBuf: rightBuf.slice(),
      i,
      j,
      filled,
      fromLeft,
      msg: `${fromLeft ? "Left" : "Right"} run's item is smaller-or-equal -- writing ${val} into index ${lo + filled - 1}`,
    });
  }
  while (i < leftBuf.length) {
    const val = leftBuf[i];
    values[lo + filled] = val;
    writes++;
    i++;
    filled++;
    yield makeStep("place", {
      active: [lo, hi],
      depth,
      mid,
      leftBuf: leftBuf.slice(),
      rightBuf: rightBuf.slice(),
      i,
      j,
      filled,
      fromLeft: true,
      msg: `Right run is exhausted -- copying the rest of the left run straight across (${val} into index ${lo + filled - 1})`,
    });
  }
  while (j < rightBuf.length) {
    const val = rightBuf[j];
    values[lo + filled] = val;
    writes++;
    j++;
    filled++;
    yield makeStep("place", {
      active: [lo, hi],
      depth,
      mid,
      leftBuf: leftBuf.slice(),
      rightBuf: rightBuf.slice(),
      i,
      j,
      filled,
      fromLeft: false,
      msg: `Left run is exhausted -- copying the rest of the right run straight across (${val} into index ${lo + filled - 1})`,
    });
  }

  // Mark the whole range locally sorted before announcing it -- so the
  // "mergeDone" step's own bars already show green, matching what its
  // message says, instead of catching up one step later.
  for (let t = lo; t <= hi; t++) locallySorted.add(t);
  yield makeStep("mergeDone", {
    active: [lo, hi],
    depth,
    mid,
    filled,
    msg: `[${lo}..${hi}] is merged -- ${hi - lo + 1} item${hi - lo + 1 === 1 ? "" : "s"} sorted relative to each other`,
  });
}

function* topDownGen(lo, hi, depth) {
  if (lo > hi) return;
  if (lo === hi) {
    locallySorted.add(lo);
    yield makeStep("singleton", { active: [lo, hi], depth, msg: `Single element at index ${lo} -- already sorted by itself` });
    return;
  }
  const mid = Math.floor((lo + hi) / 2);
  yield makeStep("split", {
    active: [lo, hi],
    depth,
    mid,
    msg: `Splitting [${lo}..${hi}] at index ${mid} into [${lo}..${mid}] and [${mid + 1}..${hi}]`,
  });
  yield* topDownGen(lo, mid, depth + 1);
  yield* topDownGen(mid + 1, hi, depth + 1);
  yield* mergeGen(lo, mid, hi, depth); // marks [lo..hi] locally sorted itself, see above
}

function* bottomUpGen() {
  if (n <= 1) {
    if (n === 1) locallySorted.add(0);
    yield makeStep("done", { active: [0, Math.max(0, n - 1)], msg: n === 1 ? "Single element -- already sorted." : "Empty array." });
    return;
  }
  let width = 1;
  let passNum = 1;
  while (width < n) {
    yield makeStep("pass", {
      active: [0, n - 1],
      depth: 0,
      passWidth: width,
      msg: `Pass ${passNum}: merge every adjacent pair of runs of size ${width} into runs of size ${Math.min(width * 2, n)}`,
    });
    for (let lo = 0; lo < n; lo += width * 2) {
      const mid = Math.min(lo + width - 1, n - 1);
      const hi = Math.min(lo + width * 2 - 1, n - 1);
      if (mid < hi) {
        yield* mergeGen(lo, mid, hi, 0); // marks [lo..hi] locally sorted itself
      } else {
        // Odd leftover run with no partner this pass -- it was already
        // locally sorted before this pass began, nothing to do.
        for (let t = lo; t <= hi; t++) locallySorted.add(t);
      }
    }
    width *= 2;
    passNum++;
  }
  yield makeStep("done", {
    active: [0, n - 1],
    msg: `Done -- ${comparisons} comparisons, ${writes} writes, ${passNum - 1} pass${passNum - 1 === 1 ? "" : "es"}`,
  });
}

function* solveGen() {
  comparisons = 0;
  writes = 0;
  locallySorted = new Set();

  if (n <= 0) {
    yield makeStep("done", { msg: "Empty array" });
    return;
  }

  if (mode === "bottomup") {
    yield* bottomUpGen();
  } else {
    yield* topDownGen(0, n - 1, 0);
    yield makeStep("done", { active: [0, n - 1], msg: `Done -- ${comparisons} comparisons, ${writes} writes` });
  }
}

// ---- control panel ----

function resetState() {
  comparisons = 0;
  writes = 0;
  locallySorted = new Set();
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
  if (mode === "bottomup") {
    const passLabel = currentState && currentState.passWidth != null ? `Pass width: ${currentState.passWidth}` : "";
    statsEl.textContent = `Comparisons: ${comparisons}   Writes: ${writes}${passLabel ? "   " + passLabel : ""}`;
  } else {
    const depth = currentState ? currentState.depth : 0;
    statsEl.textContent = `Comparisons: ${comparisons}   Writes: ${writes}   Recursion depth: ${depth}`;
  }
}

function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function buildPanel() {
  const holder = document.getElementById("controls-holder");
  holder.innerHTML = "";

  panelHeading(holder, "Data");
  const rowSize = panelRow(holder);
  panelSlider(rowSize, {
    label: "Array size",
    min: 4,
    max: 40,
    value: n,
    grow: true,
    onInput: (v) => {
      n = v;
      values = randomArray(n);
      buildPanel();
      resetState();
    },
  });

  const rowPresets = panelRow(holder);
  rowPresets.classList.add("buttons");
  panelButton(rowPresets, "Randomize", () => {
    values = randomArray(n);
    resetState();
  });
  panelButton(rowPresets, "Worst case (sorted)", () => {
    values = sortedArray(n);
    resetState();
  });
  panelButton(rowPresets, "Reversed", () => {
    values = reversedArray(n);
    resetState();
  });

  const rowInput = panelRow(holder);
  panelTextInput(rowInput, {
    label: "Values (comma-separated)",
    value: values.join(", "),
    grow: true,
    onChange: (text) => {
      const parsed = text
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((x) => !Number.isNaN(x));
      if (parsed.length >= 2) {
        values = parsed.slice(0, 60).map((v) => Math.max(1, Math.min(999, v)));
        n = values.length;
        buildPanel();
        resetState();
      }
    },
  });

  panelHeading(holder, "Algorithm");
  const rowMode = panelRow(holder);
  panelSelect(rowMode, {
    label: "Mode",
    options: [
      { value: "topdown", label: "Top-down (recursive)" },
      { value: "bottomup", label: "Bottom-up (iterative)" },
    ],
    value: mode,
    onChange: (v) => {
      mode = v;
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
      stepInterval = Math.round(42 - v * 3.6);
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
    label: "Left run color",
    value: leftRunColor,
    onChange: (rgb) => {
      leftRunColor = rgb;
    },
  });
  panelColor(rowColor, {
    label: "Right run color",
    value: rightRunColor,
    onChange: (rgb) => {
      rightRunColor = rgb;
    },
  });

  const legend = document.createElement("div");
  legend.className = "hint";
  legend.textContent =
    "Teal = left run · purple = right run · yellow = the pair being compared right now · dashed = this slot hasn't been decided yet this merge · green = sorted relative to its neighbors so far (a later merge one level up can still move it). Unlike quicksort, the comparison count barely changes across the three data presets -- the split is always exactly in half.";
  holder.appendChild(legend);

  statsEl = document.createElement("div");
  statsEl.className = "hint";
  holder.appendChild(statsEl);

  statusEl = panelStatusLine(holder);
  updateStats();
}

// ---- rendering ----

function drawRunRow(top) {
  if (!currentState) return;
  const phase = currentState.phase;
  if (phase !== "mergeStart" && phase !== "compare" && phase !== "place") return;

  const { active, mid, leftBuf, rightBuf, i, j } = currentState;
  const [lo, hi] = active;
  const bw = barW();

  const loX = xFor(lo);
  const midEndX = xFor(mid) + bw + BAR_GAP / 2;
  const hiEndX = xFor(hi) + bw;

  noStroke();
  fill(leftRunColor[0], leftRunColor[1], leftRunColor[2], 34);
  rect(loX - 4, top - 4, midEndX - loX, RUN_ROW_H - 16, 4);
  fill(rightRunColor[0], rightRunColor[1], rightRunColor[2], 34);
  rect(midEndX, top - 4, hiEndX - midEndX + 4, RUN_ROW_H - 16, 4);

  const rh = RUN_ROW_H - 44;
  const rBase = top + RUN_ROW_H - 26;
  const maxVal = Math.max(...leftBuf, ...rightBuf, 1);
  const showLabels = n <= 24 && bw >= 14;

  function drawRunBars(buf, startIdx, pointer, col) {
    for (let t = 0; t < buf.length; t++) {
      const idx = startIdx + t;
      const x = xFor(idx);
      const consumed = t < pointer;
      const h = (buf[t] / maxVal) * rh;
      const comparingHere = phase === "compare" && t === pointer;
      let c = consumed ? theme.mutedText : col;
      const alpha = consumed ? 90 : 255;
      noStroke();
      if (comparingHere) {
        stroke(COMPARE_COLOR[0], COMPARE_COLOR[1], COMPARE_COLOR[2]);
        strokeWeight(2);
      }
      fill(c[0], c[1], c[2], alpha);
      rect(x, rBase - h, bw, h, 2);
      noStroke();
      if (showLabels) {
        fill(theme.text[0], theme.text[1], theme.text[2], alpha);
        textAlign(CENTER);
        textSize(10);
        text(buf[t], x + bw / 2, rBase - h - 5);
      }
    }
  }

  drawRunBars(leftBuf, lo, i, leftRunColor);
  drawRunBars(rightBuf, mid + 1, j, rightRunColor);

  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  line(loX - 4, rBase, hiEndX + 4, rBase);
  noStroke();

  textAlign(CENTER);
  textSize(11);
  if (i < leftBuf.length) {
    fill(leftRunColor[0], leftRunColor[1], leftRunColor[2]);
    text("i", xFor(lo + i) + bw / 2, rBase + 16);
  }
  if (j < rightBuf.length) {
    fill(rightRunColor[0], rightRunColor[1], rightRunColor[2]);
    text("j", xFor(mid + 1 + j) + bw / 2, rBase + 16);
  }
}

function drawMainRow() {
  const bw = barW();
  const baseline = baselineY();
  const mainChartH = baseline - mainTop();
  const maxVal = Math.max(...values, 1);

  const active = currentState ? currentState.active : null;
  const phase = currentState ? currentState.phase : null;
  const mergeActive = phase === "mergeStart" || phase === "compare" || phase === "place";
  const filled = currentState ? currentState.filled : null;

  for (let idx = 0; idx < n; idx++) {
    const x = xFor(idx);
    let pending = false;
    if (mergeActive && active && idx >= active[0] && idx <= active[1]) {
      pending = idx - active[0] >= filled;
    }

    if (pending) {
      const col = theme.mutedText;
      stroke(col[0], col[1], col[2], 150);
      strokeWeight(1.5);
      drawDashedLine(x + bw / 2, baseline, x + bw / 2, baseline - 16, 4, 3);
      noStroke();
      continue;
    }

    const h = (values[idx] / maxVal) * mainChartH;
    const dimmed = active != null && (idx < active[0] || idx > active[1]) && !locallySorted.has(idx);
    let col = dimmed ? theme.mutedText : [90, 140, 220];
    if (locallySorted.has(idx)) col = sortedColor;
    const alpha = dimmed ? 110 : 255;

    const justWritten = phase === "place" && active && idx === active[0] + filled - 1;
    if (justWritten) {
      stroke(FLASH_COLOR[0], FLASH_COLOR[1], FLASH_COLOR[2]);
      strokeWeight(2);
    } else {
      noStroke();
    }
    fill(col[0], col[1], col[2], alpha);
    rect(x, baseline - h, bw, h, 2);
    noStroke();

    if (n <= 24 && bw >= 14) {
      fill(theme.text[0], theme.text[1], theme.text[2], alpha);
      textAlign(CENTER);
      textSize(11);
      text(values[idx], x + bw / 2, baseline - h - 6);
    }
  }

  // Dashed mid-divider across the active range, whenever the current step
  // names one (split, or any merge phase) -- a preview of where the range
  // splits, or a reminder of where it just did.
  if (currentState && currentState.mid != null && active) {
    const midX = xFor(currentState.mid) + bw + BAR_GAP / 2;
    stroke(DIVIDER_COLOR[0], DIVIDER_COLOR[1], DIVIDER_COLOR[2], 190);
    strokeWeight(1.5);
    drawDashedLine(midX, mainTop() - 6, midX, baseline, 5, 4);
    noStroke();
  }

  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  line(MARGIN, baseline, width - MARGIN, baseline);
  noStroke();
}

// ---- p5 lifecycle ----

function setup() {
  values = randomArray(n);
  cnv = createCanvas(700, MARGIN + RUN_ROW_H + ROW_GAP + 300 + BOTTOM_GUTTER);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  drawRunRow(MARGIN);
  drawMainRow();

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}
