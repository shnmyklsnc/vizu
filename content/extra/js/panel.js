// Tiny helper for building the "tweak the sample values" control panels
// used by the algorithm sketches. Plain DOM, no framework: each sketch
// calls these against its own #controls-holder div. Loaded before every
// sketch's own script (see theme/templates/article.html).

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
  const label = opts.label + (opts.showValue === false ? "" : ": " + opts.value);
  const field = panelField(row, label, input, opts.grow);
  input.addEventListener("input", () => {
    if (opts.showValue !== false) {
      field.firstChild.textContent = opts.label + ": " + input.value;
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
