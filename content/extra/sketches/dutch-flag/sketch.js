// Dutch National Flag (3-way partition).
// Note: the source project for this one (Desktop/Codes/dutch-flag) was an
// empty stub, just an unused Box class and a blank main.py, so there was
// nothing to port. This is a fresh implementation of the classic
// three-pointer partitioning algorithm: given an array of 0s, 1s and 2s,
// partition it in one pass into 0s, then 1s, then 2s (the "red/white/blue"
// flag), using low/mid/high pointers.

const COLORS = {
  0: [211, 47, 47], // red
  1: [235, 235, 235], // white
  2: [30, 100, 220], // blue
};

let arr = [];
let gen = null;
let currentState = null;
let playing = false;
let stepInterval = 20;
let arraySize = 14;

let playBtn, statusEl, arrayInput;

function* partitionGen(a) {
  let low = 0;
  let mid = 0;
  let high = a.length - 1;

  yield makeStep(a, low, mid, high, null, null, "Start: low = mid = 0, high = last index");

  while (mid <= high) {
    const v = a[mid];

    if (v === 0) {
      yield makeStep(a, low, mid, high, mid, low, "a[mid] = 0 → swap(low, mid), then low++, mid++");
      [a[low], a[mid]] = [a[mid], a[low]];
      low++;
      mid++;
    } else if (v === 1) {
      yield makeStep(a, low, mid, high, mid, null, "a[mid] = 1 → already in place, mid++");
      mid++;
    } else {
      yield makeStep(a, low, mid, high, mid, high, "a[mid] = 2 → swap(mid, high), then high--");
      [a[mid], a[high]] = [a[high], a[mid]];
      high--;
    }

    yield makeStep(a, low, mid, high, null, null, `low = ${low}, mid = ${mid}, high = ${high}`);
  }

  yield makeStep(a, low, mid, high, null, null, "Done — partitioned into 0s, 1s, 2s", true);
}

function makeStep(a, low, mid, high, compareIdx, swapIdx, msg, done) {
  return { arr: a.slice(), low, mid, high, compareIdx, swapIdx, msg, done: !!done };
}

function randomArray(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(Math.floor(random(3)));
  return a;
}

function parseArrayInput(text) {
  const parts = text.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const vals = parts.map((s) => parseInt(s, 10));
  if (vals.length < 2 || vals.some((v) => Number.isNaN(v) || v < 0 || v > 2)) {
    return null;
  }
  return vals.slice(0, 40);
}

function resetState(newArr) {
  arr = newArr || arr;
  gen = partitionGen(arr.slice());
  currentState = { arr: arr.slice(), low: 0, mid: 0, high: arr.length - 1, compareIdx: null, swapIdx: null, msg: "Ready — press Play or Step.", done: false };
  playing = false;
  if (playBtn) playBtn.textContent = "Play";
  if (arrayInput) arrayInput.value = arr.join(",");
  updateStatus(currentState.msg);
}

function randomize() {
  resetState(randomArray(arraySize));
}

function stepOnce() {
  if (!gen) return;
  const res = gen.next();
  if (!res.done) {
    currentState = res.value;
    updateStatus(currentState.msg);
    if (currentState.done) {
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

  const row1 = panelRow(holder);
  arrayInput = panelTextInput(row1, {
    label: "Array (0 = red, 1 = white, 2 = blue)",
    value: arr.join(","),
    maxLength: 160,
    grow: true,
    onChange: (text) => {
      const parsed = parseArrayInput(text);
      if (parsed) {
        arraySize = parsed.length;
        resetState(parsed);
      } else {
        updateStatus("Enter comma-separated 0s, 1s and 2s only, e.g. 2,0,1,2,1,0.");
        arrayInput.value = arr.join(",");
      }
    },
  });

  const row2 = panelRow(holder);
  panelSlider(row2, {
    label: "Random size",
    min: 4,
    max: 30,
    value: arraySize,
    grow: true,
    onInput: (v) => {
      arraySize = v;
    },
  });
  panelButton(row2, "Randomize", randomize);

  const row3 = panelRow(holder);
  playBtn = panelButton(row3, "Play", togglePlay);
  panelButton(row3, "Step", () => {
    playing = false;
    playBtn.textContent = "Play";
    stepOnce();
  });
  panelButton(row3, "Restart", () => resetState(arr));

  statusEl = panelStatusLine(holder);
}

function setup() {
  const cnv = createCanvas(600, 400);
  cnv.parent("sketch-holder");
  buildPanel();
  randomize();
}

function draw() {
  background(15, 15, 20);

  if (playing && frameCount % stepInterval === 0) {
    stepOnce();
  }

  drawArray();
}

function drawArray() {
  const state = currentState;
  if (!state) return;
  const a = state.arr;
  const n = a.length;

  const gap = 6;
  const maxCellWidth = 42;
  const available = width - 60;
  const cell = Math.max(14, Math.min(maxCellWidth, (available - (n - 1) * gap) / n));
  const totalWidth = n * cell + (n - 1) * gap;
  const startX = width / 2 - totalWidth / 2;
  const y = height / 2 - 40;

  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(Math.min(16, cell * 0.5));

  for (let i = 0; i < n; i++) {
    const x = startX + i * (cell + gap) + cell / 2;
    const c = COLORS[a[i]];

    const isCompare = state.compareIdx === i;
    const isSwap = state.swapIdx === i;

    stroke(isCompare || isSwap ? 255 : 40, isCompare || isSwap ? 165 : 40, isCompare || isSwap ? 0 : 46);
    strokeWeight(isCompare || isSwap ? 3 : 1);
    fill(c[0], c[1], c[2]);
    rect(x, y, cell, cell, 4);

    noStroke();
    fill(a[i] === 1 ? 40 : 250);
    text(a[i], x, y);

    drawPointer(x, y + cell / 2 + 10, i, state);
  }

  noStroke();
  fill(150, 150, 160);
  textSize(11);
  textAlign(CENTER, TOP);
  text("low / mid / high shown as ▲ under the array", width / 2, y + cell / 2 + 46);
}

function drawPointer(x, topY, index, state) {
  const labels = [];
  if (state.low === index) labels.push(["low", [180, 220, 255]]);
  if (state.mid === index) labels.push(["mid", [255, 165, 0]]);
  if (state.high === index) labels.push(["high", [180, 220, 255]]);
  if (labels.length === 0) return;

  textAlign(CENTER, TOP);
  textSize(11);
  noStroke();
  for (let i = 0; i < labels.length; i++) {
    const [label, color] = labels[i];
    fill(color[0], color[1], color[2]);
    text("▲ " + label, x, topY + i * 14);
  }
}
