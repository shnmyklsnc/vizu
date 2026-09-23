// Tiny helper for building the "tweak the sample values" control panels
// used by the algorithm sketches. Plain DOM, no framework: each sketch
// calls these against its own #controls-holder div. Loaded before every
// sketch's own script (see theme/templates/article.html).

// Canvas colors that follow the site-wide light/dark toggle (see
// nav.js/setupTheme). Cheap enough to call once per frame from draw(), so
// a sketch never draws with a stale palette -- flip the theme mid-animation
// and the canvas repaints on the very next frame along with everything
// else. p5-style [r, g, b] arrays throughout, ready for background()/
// fill()/stroke() via spread or indexing.
function themePalette() {
  const light = document.documentElement.getAttribute("data-theme") === "light";
  return light
    ? {
        light: true,
        canvasBg: [246, 246, 248],
        gridLine: [205, 205, 213],
        cellBg: [255, 255, 255],
        cellBorder: [205, 205, 213],
        text: [35, 35, 40],
        mutedText: [110, 110, 122],
      }
    : {
        light: false,
        canvasBg: [15, 15, 20],
        gridLine: [70, 70, 80],
        cellBg: [22, 22, 28],
        cellBorder: [70, 70, 80],
        text: [225, 225, 230],
        mutedText: [150, 150, 160],
      };
}

function panelRow(parent) {
  const row = document.createElement("div");
  row.className = "panel-row";
  parent.appendChild(row);
  return row;
}

function panelField(row, labelText, controlEl, grow) {
  const field = document.createElement("div");
  field.className = grow ? "field grow" : "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(controlEl);
  row.appendChild(field);
  return field;
}

function panelButton(row, text, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  row.appendChild(btn);
  return btn;
}

function panelSlider(row, opts) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = opts.min;
  input.max = opts.max;
  input.step = opts.step || 1;
  input.value = opts.value;
  const format = opts.format || ((v) => String(v));
  const label = opts.label + (opts.showValue === false ? "" : ": " + format(opts.value));
  const field = panelField(row, label, input, opts.grow);
  input.addEventListener("input", () => {
    if (opts.showValue !== false) {
      field.firstChild.textContent = opts.label + ": " + format(Number(input.value));
    }
    opts.onInput(Number(input.value));
  });
  return input;
}

function panelSelect(row, opts) {
  const select = document.createElement("select");
  for (const o of opts.options) {
    const el = document.createElement("option");
    el.value = o.value;
    el.textContent = o.label;
    if (o.value === opts.value) el.selected = true;
    select.appendChild(el);
  }
  panelField(row, opts.label, select, opts.grow);
  select.addEventListener("change", () => opts.onChange(select.value));
  return select;
}

function panelTextInput(row, opts) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = opts.value;
  if (opts.maxLength) input.maxLength = opts.maxLength;
  panelField(row, opts.label, input, opts.grow !== false);
  const commit = () => opts.onChange(input.value);
  input.addEventListener("change", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
  });
  return input;
}

function panelStatusLine(parent) {
  const div = document.createElement("div");
  div.className = "status-line";
  parent.appendChild(div);
  return div;
}

// Small uppercase label to group a run of rows under a heading, e.g.
// "Data", "Playback", "Appearance". Purely visual (see .panel-heading).
function panelHeading(parent, text) {
  const div = document.createElement("div");
  div.className = "panel-heading";
  div.textContent = text;
  parent.appendChild(div);
  return div;
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// A native color swatch input. Values are p5-style [r, g, b] arrays in and
// out, so callers can drop them straight into fill()/stroke() calls.
function panelColor(row, opts) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = rgbToHex(opts.value);
  panelField(row, opts.label, input, opts.grow);
  input.addEventListener("input", () => opts.onChange(hexToRgb(input.value)));
  return input;
}

// A labeled toggle switch (checkbox underneath, styled as a track + knob).
function panelCheckbox(row, opts) {
  const wrap = document.createElement("label");
  wrap.className = "toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!opts.value;
  const track = document.createElement("span");
  track.className = "toggle-track";
  const text = document.createElement("span");
  text.className = "toggle-label";
  text.textContent = opts.label;
  wrap.appendChild(input);
  wrap.appendChild(track);
  wrap.appendChild(text);
  row.appendChild(wrap);
  input.addEventListener("change", () => opts.onChange(input.checked));
  return input;
}
