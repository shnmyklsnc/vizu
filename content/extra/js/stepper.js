// Shared driver for the "steps nav + caption + stage + back/next" pattern
// every step-by-step walkthrough widget uses, across every redesigned
// article. Deliberately global (like panel.js), not IIFE-wrapped, since
// each article's own walkthroughs.js is a separate script that calls
// these directly. Loaded once per freeform article -- see
// theme/templates/article.html.

// `renderFn(step)` is responsible for writing into the widget's own
// .caption and .stage for the given step index.
function makeStepper(root, titles, renderFn) {
  var step = 0;
  var stepnavEl = root.querySelector('[data-role="stepnav"]');
  var backEl = root.querySelector('[data-role="back"]');
  var nextEl = root.querySelector('[data-role="next"]');

  function renderNav() {
    stepnavEl.innerHTML = titles
      .map(function (tt, i) {
        return (
          '<li><button type="button" data-step="' +
          i +
          '"' +
          (i === step ? ' aria-current="step"' : "") +
          ">" +
          (i + 1) +
          ". " +
          tt +
          "</button></li>"
        );
      })
      .join("");
    backEl.disabled = step === 0;
    nextEl.disabled = step === titles.length - 1;
  }

  function go(newStep) {
    step = Math.max(0, Math.min(titles.length - 1, newStep));
    renderFn(step);
    renderNav();
  }

  stepnavEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-step]");
    if (!b) return;
    go(parseInt(b.getAttribute("data-step"), 10));
  });
  backEl.addEventListener("click", function () {
    go(step - 1);
  });
  nextEl.addEventListener("click", function () {
    go(step + 1);
  });

  // Render immediately so the step pills (and the first caption/stage,
  // via renderFn) are present on load, not only after the first click.
  go(0);

  return { go: go };
}

// Wires a widget's "New numbers" (or "New points", etc.) button to
// regenerate its sample and jump the stepper back to step 0.
function wireNewNumbers(root, stepper, newSampleFn) {
  var btn = root.querySelector('[data-role="newnums"]');
  if (!btn) return;
  btn.addEventListener("click", function () {
    newSampleFn();
    stepper.go(0);
  });
}
