// Quicksort / Quickselect (divide and conquer, in-place Lomuto partition).
// Two variants sharing one partition routine, picked from the panel's
// dropdown -- same pattern as edit-distance's DP/bit-parallel/rolling
// variants: one article, one underlying algorithm, different questions
// asked of it.
//
//   "sort"   -- classic quicksort: partition, then recurse into BOTH
//               halves. Every pivot lands in its true sorted rank the
//               moment partition() places it, so we mark that index
//               "settled" (green) right away instead of waiting for the
//               whole array to finish.
//   "select" -- quickselect: partition, then recurse into only the ONE
//               half that can contain the target rank k. Same partition,
//               same settled-on-placement idea, just a different
//               recursion shape (and O(n) average instead of O(n log n)).
//
// The pivot-strategy dropdown (last / first / random / sample median of
// 3) exists to make the course's own point visible: "last element" on a
// pre-sorted array degenerates to Theta(n^2) (every partition is maximally
// unbalanced), while "sample median" stays close to the Theta(n log n)
// best case even on that same input. Try the "Worst case (sorted)" preset
// with each strategy to see it.

let values = [];
let n = 16;
const MIN_VAL = 5;
const MAX_VAL = 95;

let variant = "sort"; // "sort" | "select"
let pivotStrategy = "last"; // "last" | "first" | "random" | "median3"
let kValue = 1; // 1-based rank, only used when variant === "select"

let comparisons = 0;
let swaps = 0;
let settled = new Set();
let foundIndex = null;

let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 24; // frames between auto-steps while playing

let cnv = null;
let theme = null;

let pivotColor = [255, 165, 0];
let sortedColor = [90, 195, 120];
const SAMPLE_COLOR = [190, 120, 230];
const COMPARE_COLOR = [255, 210, 70];
const SWAP_COLOR = [235, 90, 90];
const FOUND_COLOR = [255, 70, 190];

let playBtn, statusEl, statsEl;

// ---- small helpers ----

function ordinal(num) {
  const n10 = num % 10;
  const n100 = num % 100;
  if (n10 === 1 && n100 !== 11) return `${num}st`;
  if (n10 === 2 && n100 !== 12) return `${num}nd`;
  if (n10 === 3 && n100 !== 13) return `${num}rd`;
  return `${num}th`;
}

function randomArray(count) {
  return Array.from({ length: count }, () => MIN_VAL + Math.floor(Math.random() * (MAX_VAL - MIN_VAL + 1)));
}

function sortedArray(count) {
  return Array.from({ length: count }, (_, i) =>
    Math.round(MIN_VAL + (i * (MAX_VAL - MIN_VAL)) / Math.max(1, count - 1))
  );
}

function reversedArray(count) {
  return sortedArray(count).reverse();
}

function swapValues(a, b) {
  const t = values[a];
  values[a] = values[b];
  values[b] = t;
}

function sampleDistinctIndices(lo, hi, count) {
  const pool = [];
  for (let k = lo; k <= hi; k++) pool.push(k);
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }
  return pool.slice(0, count);
}

// ---- algorithm (JS generator) ----

function makeStep(phase, opts) {
  opts = opts || {};
  return {
    phase,
    active: opts.active || null,
    depth: opts.depth || 0,
    pivotIndex: opts.pivotIndex != null ? opts.pivotIndex : null,
    sampleIndices: opts.sampleIndices || null,
    compareIndices: opts.compareIndices || null,
    swapIndices: opts.swapIndices || null,
    i: opts.i != null ? opts.i : null,
    j: opts.j != null ? opts.j : null,
    foundIndex: opts.foundIndex != null ? opts.foundIndex : null,
    groupSize: opts.groupSize != null ? opts.groupSize : null,
    msg: opts.msg || "",
  };
}

// Median-of-medians (Blum/Floyd/Pratt/Rivest/Tarjan): split the range into
// groups of 5, take each group's median (O(1) per group), then use the
// median OF those group medians as the pivot. That guarantees at least
// ~30% of the range falls on each side of the pivot, which is what turns
// quickselect's worst case from Theta(n^2) into Theta(n) -- see
// T(n) <= T(n/5) + T(7n/10) + cn in the slides.
//
// Simplification for this visualization: with the array sizes this sketch
// allows (<= 40), there are at most 8 group medians, so we just sort that
// small list directly instead of recursing into quickselect again to find
// *their* median. The true algorithm recurses here too -- it only matters
// for much larger n, and the 30/70 split guarantee is identical either way.
function* chooseMedianOfMedians(lo, hi, depth) {
  const groupMedianIdx = [];
  for (let g = lo; g <= hi; g += 5) {
    const end = Math.min(g + 4, hi);
    const groupIdxs = [];
    for (let t = g; t <= end; t++) groupIdxs.push(t);
    const sortedGroup = groupIdxs.slice().sort((a, b) => values[a] - values[b]);
    groupMedianIdx.push(sortedGroup[Math.floor(sortedGroup.length / 2)]);
  }
  yield makeStep("groups", {
    active: [lo, hi],
    sampleIndices: groupMedianIdx.slice(),
    groupSize: 5,
    depth,
    msg: `Split into ${groupMedianIdx.length} group(s) of up to 5 -- each dot marks that group's own median`,
  });

  const sortedMedians = groupMedianIdx.slice().sort((a, b) => values[a] - values[b]);
  const momIdx = sortedMedians[Math.floor(sortedMedians.length / 2)];
  yield makeStep("mom_chosen", {
    active: [lo, hi],
    sampleIndices: groupMedianIdx.slice(),
    groupSize: 5,
    pivotIndex: momIdx,
    depth,
    msg: `Median of the ${groupMedianIdx.length} group medians = ${values[momIdx]} (index ${momIdx}) -- using it as the pivot`,
  });
  return momIdx;
}

function* choosePivot(lo, hi, depth) {
  const size = hi - lo + 1;
  let pivotIdx;

  if (pivotStrategy === "median3") {
    const sampleCount = Math.min(3, size);
    const idxs = sampleDistinctIndices(lo, hi, sampleCount);
    yield makeStep("sample", {
      active: [lo, hi],
      sampleIndices: idxs.slice(),
      depth,
      msg: `Sampling ${sampleCount} item(s) to estimate the median for a pivot`,
    });
    idxs.sort((a, b) => values[a] - values[b]);
    pivotIdx = idxs[Math.floor(idxs.length / 2)];
  } else if (pivotStrategy === "mom") {
    pivotIdx = yield* chooseMedianOfMedians(lo, hi, depth);
  } else if (pivotStrategy === "random") {
    pivotIdx = lo + Math.floor(Math.random() * size);
  } else if (pivotStrategy === "first") {
    pivotIdx = lo;
  } else {
    pivotIdx = hi; // "last"
  }

  if (pivotIdx !== hi) {
    swapValues(pivotIdx, hi);
    swaps++;
    yield makeStep("swap", {
      active: [lo, hi],
      swapIndices: [pivotIdx, hi],
      depth,
      msg: "Moving the chosen pivot to the end of the range",
    });
  }
  return hi;
}

function* partition(lo, hi, depth) {
  const pivotAt = yield* choosePivot(lo, hi, depth);
  const pivotVal = values[pivotAt];
  yield makeStep("pivot_selected", {
    active: [lo, hi],
    pivotIndex: pivotAt,
    depth,
    msg: `Pivot = ${pivotVal} (index ${pivotAt})`,
  });

  let i = lo;
  for (let j = lo; j < hi; j++) {
    comparisons++;
    yield makeStep("compare", {
      active: [lo, hi],
      pivotIndex: pivotAt,
      i,
      j,
      compareIndices: [j, pivotAt],
      depth,
      msg: `Comparing a[${j}] = ${values[j]} with pivot ${pivotVal}`,
    });
    if (values[j] <= pivotVal) {
      if (i !== j) {
        swapValues(i, j);
        swaps++;
        yield makeStep("swap", {
          active: [lo, hi],
          pivotIndex: pivotAt,
          i,
          j,
          swapIndices: [i, j],
          depth,
          msg: `a[${j}] <= pivot -- swapping into position ${i}`,
        });
      }
      i++;
    }
  }
  swapValues(i, hi);
  swaps++;
  yield makeStep("swap", {
    active: [lo, hi],
    pivotIndex: i,
    i,
    swapIndices: [i, hi],
    depth,
    msg: `Pivot settles at index ${i} -- everything left is <=, everything right is >`,
  });
  return i;
}

function* quicksortGen(lo, hi, depth) {
  if (lo > hi) return;
  if (lo === hi) {
    settled.add(lo);
    yield makeStep("singleton", { active: [lo, hi], depth, msg: `Single element at index ${lo} -- already in place` });
    return;
  }
  yield makeStep("enter", { active: [lo, hi], depth, msg: `Partitioning indices ${lo}..${hi}` });
  const p = yield* partition(lo, hi, depth);
  settled.add(p);
  yield makeStep("placed", { active: [lo, hi], pivotIndex: p, depth, msg: `Index ${p} is now in its final sorted position` });
  yield* quicksortGen(lo, p - 1, depth + 1);
  yield* quicksortGen(p + 1, hi, depth + 1);
}

function* quickselectGen(lo, hi, k, depth) {
  if (lo === hi) {
    settled.add(lo);
    return lo;
  }
  yield makeStep("enter", { active: [lo, hi], depth, msg: `Selecting within indices ${lo}..${hi}` });
  const p = yield* partition(lo, hi, depth);
  settled.add(p);
  yield makeStep("placed", { active: [lo, hi], pivotIndex: p, depth, msg: `Index ${p} is now in its final sorted position` });
  if (k === p) return p;
  if (k < p) return yield* quickselectGen(lo, p - 1, k, depth + 1);
  return yield* quickselectGen(p + 1, hi, k, depth + 1);
}

function* solveGen() {
  comparisons = 0;
  swaps = 0;
  settled = new Set();
  foundIndex = null;

  if (n <= 0) {
    yield makeStep("done", { msg: "Empty array" });
    return;
  }

  if (variant === "sort") {
    yield* quicksortGen(0, n - 1, 0);
    yield makeStep("done", { active: [0, n - 1], msg: `Done -- ${comparisons} comparisons, ${swaps} swaps` });
  } else {
    const target = Math.min(Math.max(0, kValue - 1), n - 1);
    const idx = yield* quickselectGen(0, n - 1, target, 0);
    foundIndex = idx;
    yield makeStep("done", {
      active: [0, n - 1],
      foundIndex: idx,
      msg: `Found the ${ordinal(kValue)} smallest = ${values[idx]} at index ${idx} -- ${comparisons} comparisons, ${swaps} swaps`,
    });
  }
}

// ---- control panel ----

function resetState() {
  kValue = Math.min(Math.max(1, kValue), Math.max(1, n));
  comparisons = 0;
  swaps = 0;
  settled = new Set();
  foundIndex = null;
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
  statsEl.textContent = `Comparisons: ${comparisons}   Swaps: ${swaps}   Recursion depth: ${depth}`;
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
  const rowVariant = panelRow(holder);
  panelSelect(rowVariant, {
    label: "Mode",
    options: [
      { value: "sort", label: "Quicksort (full sort)" },
      { value: "select", label: "Quickselect (k-th smallest)" },
    ],
    value: variant,
    onChange: (v) => {
      variant = v;
      buildPanel();
      resetState();
    },
  });

  const rowPivot = panelRow(holder);
  panelSelect(rowPivot, {
    label: "Pivot strategy",
    options: [
      { value: "last", label: "Last element" },
      { value: "first", label: "First element" },
      { value: "random", label: "Random" },
      { value: "median3", label: "Sample median (of 3)" },
      { value: "mom", label: "Median of medians (groups of 5)" },
    ],
    value: pivotStrategy,
    onChange: (v) => {
      pivotStrategy = v;
      resetState();
    },
  });

  if (variant === "select") {
    const rowK = panelRow(holder);
    panelSlider(rowK, {
      label: "k (rank, 1 = smallest)",
      min: 1,
      max: Math.max(1, n),
      value: Math.min(kValue, Math.max(1, n)),
      grow: true,
      onInput: (v) => {
        kValue = v;
        resetState();
      },
    });
  }

  panelHeading(holder, "Playback");
  const rowSpeed = panelRow(holder);
  panelSlider(rowSpeed, {
    label: "Speed",
    min: 1,
    max: 10,
    value: 6,
    grow: true,
    onInput: (v) => {
      stepInterval = Math.round(46 - v * 4);
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
    label: "Pivot color",
    value: pivotColor,
    onChange: (rgb) => {
      pivotColor = rgb;
    },
  });
  panelColor(rowColor, {
    label: "Sorted color",
    value: sortedColor,
    onChange: (rgb) => {
      sortedColor = rgb;
    },
  });

  const legend = document.createElement("div");
  legend.className = "hint";
  legend.textContent =
    "Orange = pivot · purple = sampled for the pivot estimate (with median-of-medians, dashed lines mark the groups of 5) · yellow = comparing · red = swapping · green = settled in its final sorted position · pink = the k-th smallest, once quickselect finds it.";
  holder.appendChild(legend);

  statsEl = document.createElement("div");
  statsEl.className = "hint";
  holder.appendChild(statsEl);

  statusEl = panelStatusLine(holder);
  updateStats();
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

function drawBars() {
  const margin = 30;
  const bottomGutter = 46; // room for i/j pointer tags below the baseline
  const chartW = width - margin * 2;
  const chartH = height - margin - bottomGutter;
  const barGap = 4;
  const barW = Math.max(2, (chartW - barGap * (n - 1)) / n);
  const maxVal = Math.max(...values, 1);
  const baseline = height - bottomGutter;

  const active = currentState ? currentState.active : null;
  const pivotIndex = currentState ? currentState.pivotIndex : null;
  const sampleSet = currentState && currentState.sampleIndices ? new Set(currentState.sampleIndices) : null;
  const compareSet = currentState && currentState.compareIndices ? new Set(currentState.compareIndices) : null;
  const swapSet = currentState && currentState.swapIndices ? new Set(currentState.swapIndices) : null;
  const foundIdx = currentState ? currentState.foundIndex : null;

  noStroke();
  for (let i = 0; i < n; i++) {
    const x = margin + i * (barW + barGap);
    const h = (values[i] / maxVal) * chartH;
    const y = baseline - h;

    const dimmed = active != null && (i < active[0] || i > active[1]) && !settled.has(i);

    let col = dimmed ? theme.mutedText : [90, 140, 220];
    if (settled.has(i)) col = sortedColor;
    if (sampleSet && sampleSet.has(i)) col = SAMPLE_COLOR;
    if (pivotIndex === i) col = pivotColor;
    if (compareSet && compareSet.has(i)) col = COMPARE_COLOR;
    if (swapSet && swapSet.has(i)) col = SWAP_COLOR;
    if (foundIdx === i) col = FOUND_COLOR;

    const alpha = dimmed ? 110 : 255;
    fill(col[0], col[1], col[2], alpha);
    rect(x, y, barW, h, 2);

    if (n <= 24 && barW >= 14) {
      fill(theme.text[0], theme.text[1], theme.text[2], alpha);
      textAlign(CENTER);
      textSize(11);
      text(values[i], x + barW / 2, y - 6);
    }
  }

  // Group-of-5 dividers, only shown while median-of-medians is grouping.
  // Drawn dashed, in the same purple as the group-median dots, so they
  // read clearly against both themes instead of blending into the
  // low-contrast grid-line gray.
  if (currentState && currentState.groupSize && currentState.active) {
    const [aLo, aHi] = currentState.active;
    stroke(SAMPLE_COLOR[0], SAMPLE_COLOR[1], SAMPLE_COLOR[2], 180);
    strokeWeight(1.5);
    for (let g = aLo + currentState.groupSize; g <= aHi; g += currentState.groupSize) {
      const xg = margin + g * (barW + barGap) - barGap / 2;
      drawDashedLine(xg, baseline - chartH, xg, baseline, 5, 4);
    }
    strokeWeight(1);
    noStroke();
  }

  // i/j pointer tags from the current partition step, if any.
  if (currentState && (currentState.i != null || currentState.j != null)) {
    textAlign(CENTER);
    textSize(12);
    if (currentState.i != null) {
      const xi = margin + currentState.i * (barW + barGap) + barW / 2;
      fill(90, 140, 220);
      text("i", xi, baseline + 18);
    }
    if (currentState.j != null && currentState.j !== currentState.i) {
      const xj = margin + currentState.j * (barW + barGap) + barW / 2;
      fill(COMPARE_COLOR[0], COMPARE_COLOR[1], COMPARE_COLOR[2]);
      text("j", xj, baseline + 18);
    }
  }

  // baseline
  stroke(theme.gridLine[0], theme.gridLine[1], theme.gridLine[2]);
  line(margin, baseline, width - margin, baseline);
  noStroke();
}
