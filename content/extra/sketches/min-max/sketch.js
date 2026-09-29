// Finding the minimum and maximum together. Two variants that both land on
// the same ~3n/2 comparisons instead of the naive 2n-2, picked from the
// panel's dropdown -- the same "one idea, one dropdown" pattern as
// mergesort's top-down/bottom-up split:
//
//   "dc"     -- divide and conquer: split the range in half, recursively
//               find the (min, max) pair of each half, then spend exactly
//               2 comparisons combining them (min of the two mins, max of
//               the two maxes). Base cases: 1 element is trivially both
//               (0 comparisons), 2 elements need exactly 1 comparison.
//   "paired" -- the same saving without recursion: walk the array two
//               elements at a time. Compare the pair to each other first
//               (1 comparison) -- that alone tells you which one *could*
//               beat the running min and which one *could* beat the
//               running max, so only 2 more comparisons are needed, not 4.
//
// Both variants make the same trade: comparing fresh elements to each
// other before checking them against the running min/max wastes zero
// comparisons on a foregone conclusion. Unlike quicksort or mergesort, the
// comparison count here doesn't depend on the data's order at all -- only
// on n -- because there's no data-dependent branching anywhere in either
// variant.

let values = [];
let n = 16;
const MIN_VAL = 5;
const MAX_VAL = 95;

let mode = "dc"; // "dc" | "paired"

let comparisons = 0;

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 22;

let cnv = null;
let theme = null;

let minColor = [79, 195, 204]; // teal, matches the site's --less token
let maxColor = [197, 139, 224]; // purple, matches --greater
const COMPARE_COLOR = [255, 210, 70];
const DIVIDER_COLOR = [170, 170, 180];

let playBtn, statusEl, statsEl;

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
    active: opts.active || null,
    depth: opts.depth != null ? opts.depth : 0,
    mid: opts.mid != null ? opts.mid : null,
    compareIndices: opts.compareIndices || null,
    curMin: opts.curMin != null ? opts.curMin : null,
    curMax: opts.curMax != null ? opts.curMax : null,
    msg: opts.msg || "",
  };
}

// Divide and conquer: returns {minIdx, maxIdx} for values[lo..hi].
function* minmaxGen(lo, hi, depth) {
  if (lo === hi) {
    yield makeStep("base1", {
      active: [lo, hi],
      depth,
      curMin: lo,
      curMax: lo,
      msg: `Single element at index ${lo} -- it's trivially both the min and the max of this range, no comparison needed`,
    });
    return { minIdx: lo, maxIdx: lo };
  }
  if (hi === lo + 1) {
    comparisons++;
    const aLo = values[lo] <= values[hi];
    const minIdx = aLo ? lo : hi;
    const maxIdx = aLo ? hi : lo;
    yield makeStep("base2", {
      active: [lo, hi],
      depth,
      compareIndices: [lo, hi],
      curMin: minIdx,
      curMax: maxIdx,
      msg: `Two elements at [${lo}, ${hi}] -- one comparison tells us which is the min and which is the max of this pair`,
    });
    return { minIdx, maxIdx };
  }

  const mid = Math.floor((lo + hi) / 2);
  yield makeStep("split", {
    active: [lo, hi],
    depth,
    mid,
    msg: `Splitting [${lo}..${hi}] at index ${mid} into [${lo}..${mid}] and [${mid + 1}..${hi}]`,
  });
  const leftRes = yield* minmaxGen(lo, mid, depth + 1);
  const rightRes = yield* minmaxGen(mid + 1, hi, depth + 1);

  comparisons++;
  yield makeStep("combineMin", {
    active: [lo, hi],
    depth,
    compareIndices: [leftRes.minIdx, rightRes.minIdx],
    curMin: leftRes.minIdx,
    curMax: rightRes.maxIdx,
    msg: `Combining: comparing the two halves' minimums, index ${leftRes.minIdx} (${values[leftRes.minIdx]}) vs index ${rightRes.minIdx} (${values[rightRes.minIdx]})`,
  });
  const minIdx = values[leftRes.minIdx] <= values[rightRes.minIdx] ? leftRes.minIdx : rightRes.minIdx;

  comparisons++;
  yield makeStep("combineMax", {
    active: [lo, hi],
    depth,
    compareIndices: [leftRes.maxIdx, rightRes.maxIdx],
    curMin: minIdx,
    curMax: leftRes.maxIdx,
    msg: `Comparing the two halves' maximums, index ${leftRes.maxIdx} (${values[leftRes.maxIdx]}) vs index ${rightRes.maxIdx} (${values[rightRes.maxIdx]})`,
  });
  const maxIdx = values[leftRes.maxIdx] >= values[rightRes.maxIdx] ? leftRes.maxIdx : rightRes.maxIdx;

  yield makeStep("combined", {
    active: [lo, hi],
    depth,
    curMin: minIdx,
    curMax: maxIdx,
    msg: `[${lo}..${hi}] resolved with just 2 comparisons -- min is index ${minIdx} (${values[minIdx]}), max is index ${maxIdx} (${values[maxIdx]})`,
  });
  return { minIdx, maxIdx };
}

function* solveGenDC() {
  comparisons = 0;
  if (n <= 0) {
    yield makeStep("done", { msg: "Empty array" });
    return;
  }
  const res = yield* minmaxGen(0, n - 1, 0);
  yield makeStep("done", {
    active: [0, n - 1],
    curMin: res.minIdx,
    curMax: res.maxIdx,
    msg: `Done -- min is ${values[res.minIdx]} (index ${res.minIdx}), max is ${values[res.maxIdx]} (index ${res.maxIdx}) -- ${comparisons} comparisons`,
  });
}

// Paired scan: no recursion, just a running min/max updated 2 or 3
// elements at a time.
function* pairedGen() {
  comparisons = 0;
  if (n <= 0) {
    yield makeStep("done", { msg: "Empty array" });
    return;
  }
  if (n === 1) {
    yield makeStep("base1", { active: [0, 0], curMin: 0, curMax: 0, msg: "Single element -- it's trivially both the min and the max, no comparison needed" });
    yield makeStep("done", { active: [0, 0], curMin: 0, curMax: 0, msg: `Done -- min is ${values[0]}, max is ${values[0]} -- 0 comparisons` });
    return;
  }

  let minIdx, maxIdx, start;
  if (n % 2 === 1) {
    minIdx = 0;
    maxIdx = 0;
    start = 1;
    yield makeStep("base1", {
      active: [0, 0],
      curMin: 0,
      curMax: 0,
      msg: "Odd-length array -- seed the running min and max with index 0 first, no comparison needed, so every remaining element can be handled in pairs",
    });
  } else {
    comparisons++;
    const firstSmaller = values[0] <= values[1];
    minIdx = firstSmaller ? 0 : 1;
    maxIdx = firstSmaller ? 1 : 0;
    start = 2;
    yield makeStep("base2", {
      active: [0, 1],
      compareIndices: [0, 1],
      curMin: minIdx,
      curMax: maxIdx,
      msg: "Even-length array -- seed the running min and max from the first pair with one comparison",
    });
  }

  for (let i = start; i < n; i += 2) {
    const j = i + 1;
    comparisons++;
    const iSmaller = values[i] <= values[j];
    const smallIdx = iSmaller ? i : j;
    const largeIdx = iSmaller ? j : i;
    yield makeStep("pairCompare", {
      active: [0, n - 1],
      compareIndices: [i, j],
      curMin: minIdx,
      curMax: maxIdx,
      msg: `Comparing the next pair to each other first: index ${i} (${values[i]}) vs index ${j} (${values[j]})`,
    });

    comparisons++;
    const newMinIdx = values[smallIdx] < values[minIdx] ? smallIdx : minIdx;
    yield makeStep("pairVsMin", {
      active: [0, n - 1],
      compareIndices: [smallIdx, minIdx],
      curMin: newMinIdx,
      curMax: maxIdx,
      msg: `Only the pair's smaller side (index ${smallIdx}) could possibly beat the running min -- the larger side already lost to it, so it can't be a new min either`,
    });
    minIdx = newMinIdx;

    comparisons++;
    const newMaxIdx = values[largeIdx] > values[maxIdx] ? largeIdx : maxIdx;
    yield makeStep("pairVsMax", {
      active: [0, n - 1],
      compareIndices: [largeIdx, maxIdx],
      curMin: minIdx,
      curMax: newMaxIdx,
      msg: `And only the pair's larger side (index ${largeIdx}) could possibly beat the running max`,
    });
    maxIdx = newMaxIdx;
  }

  yield makeStep("done", {
    active: [0, n - 1],
    curMin: minIdx,
    curMax: maxIdx,
    msg: `Done -- min is ${values[minIdx]} (index ${minIdx}), max is ${values[maxIdx]} (index ${maxIdx}) -- ${comparisons} comparisons`,
  });
}

function* solveGen() {
  if (mode === "paired") {
    yield* pairedGen();
  } else {
    yield* solveGenDC();
  }
}

// ---- control panel ----

function resetState() {
  comparisons = 0;
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
  if (mode === "paired") {
    statsEl.textContent = `Comparisons: ${comparisons}`;
  } else {
    const depth = currentState ? currentState.depth : 0;
    statsEl.textContent = `Comparisons: ${comparisons}   Recursion depth: ${depth}`;
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
  panelButton(rowPresets, "Ascending", () => {
    values = sortedArray(n);
    resetState();
  });
  panelButton(rowPresets, "Descending", () => {
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
      if (parsed.length >= 1) {
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
      { value: "dc", label: "Divide and conquer (recursive)" },
      { value: "paired", label: "Paired scan (iterative)" },
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
    label: "Min color",
    value: minColor,
    onChange: (rgb) => {
      minColor = rgb;
    },
  });
  panelColor(rowColor, {
    label: "Max color",
    value: maxColor,
    onChange: (rgb) => {
      maxColor = rgb;
    },
  });

  const legend = document.createElement("div");
  legend.className = "hint";
  legend.textContent =
    "Teal = the current min · purple = the current max · yellow = the pair being compared right now · dashed divider = where a range just split (divide and conquer only). Unlike quicksort or mergesort, the comparison count here never changes with the data's order -- only with n.";
  holder.appendChild(legend);

  statsEl = document.createElement("div");
  statsEl.className = "hint";
  holder.appendChild(statsEl);

  statusEl = panelStatusLine(holder);
  updateStats();
}

// ---- rendering ----

function drawBars() {
  const margin = 30;
  const bottomGutter = 46;
  const chartW = width - margin * 2;
  const chartH = height - margin - bottomGutter;
  const barGap = 4;
  const barW = Math.max(2, (chartW - barGap * (n - 1)) / n);
  const maxVal = Math.max(...values, 1);
  const baseline = height - bottomGutter;

  const active = currentState ? currentState.active : null;
  const compareSet = currentState && currentState.compareIndices ? new Set(currentState.compareIndices) : null;
  const curMin = currentState ? currentState.curMin : null;
  const curMax = currentState ? currentState.curMax : null;

  for (let i = 0; i < n; i++) {
    const x = margin + i * (barW + barGap);
    const h = (values[i] / maxVal) * chartH;
    const y = baseline - h;

    const dimmed = active != null && (i < active[0] || i > active[1]);
    const isMin = curMin === i;
    const isMax = curMax === i;

    let col = dimmed ? theme.mutedText : [90, 140, 220];
    if (isMin && isMax) {
      col = [Math.round((minColor[0] + maxColor[0]) / 2), Math.round((minColor[1] + maxColor[1]) / 2), Math.round((minColor[2] + maxColor[2]) / 2)];
    } else if (isMin) {
      col = minColor;
    } else if (isMax) {
      col = maxColor;
    }

    const comparingHere = compareSet && compareSet.has(i);
    const alpha = dimmed ? 110 : 255;

    if (comparingHere) {
      stroke(COMPARE_COLOR[0], COMPARE_COLOR[1], COMPARE_COLOR[2]);
      strokeWeight(2.5);
    } else {
      noStroke();
    }
    fill(col[0], col[1], col[2], alpha);
    rect(x, y, barW, h, 2);
    noStroke();

    if (n <= 24 && barW >= 14) {
      fill(theme.text[0], theme.text[1], theme.text[2], alpha);
      textAlign(CENTER);
      textSize(11);
      text(values[i], x + barW / 2, y - 6);
    }
  }

  // min/max tags below the baseline.
  textAlign(CENTER);
  textSize(11);
  if (curMin != null) {
    const xm = margin + curMin * (barW + barGap) + barW / 2;
    fill(minColor[0], minColor[1], minColor[2]);
    text("min", xm, baseline + 16);
  }
  if (curMax != null && curMax !== curMin) {
    const xM = margin + curMax * (barW + barGap) + barW / 2;
    fill(maxColor[0], maxColor[1], maxColor[2]);
    text("max", xM, baseline + 16);
  } else if (curMax != null && curMax === curMin) {
    const xB = margin + curMax * (barW + barGap) + barW / 2;
    fill(maxColor[0], maxColor[1], maxColor[2]);
    text("max", xB, baseline + 30);
  }

  // Dashed mid-divider across the active range, for a split or combine step.
  if (currentState && currentState.mid != null && active) {
    const midX = margin + currentState.mid * (barW + barGap) + barW + barGap / 2;
    stroke(DIVIDER_COLOR[0], DIVIDER_COLOR[1], DIVIDER_COLOR[2], 190);
    strokeWeight(1.5);
    drawDashedLine(midX, margin - 4, midX, baseline, 5, 4);
    noStroke();
  }

  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  line(margin, baseline, width - margin, baseline);
  noStroke();
}

// ---- p5 lifecycle ----

function setup() {
  values = randomArray(n);
  cnv = createCanvas(700, 420);
  cnv.parent("sketch-holder");
  buildPanel();
  resetState();
}

function draw() {
  theme = themePalette();
  background(theme.canvasBg[0], theme.canvasBg[1], theme.canvasBg[2]);
  drawBars();

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }
}
