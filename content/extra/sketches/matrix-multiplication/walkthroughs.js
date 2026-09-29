// Step-by-step walkthroughs for the Matrix Multiplication article. Same
// discipline as every other redesigned article: every number shown is
// computed by actually doing the arithmetic on the current random
// matrices, not scripted or faked.
//
// Two independent widgets:
//   #mmw-widget  -- Strassen's trick, step by step, on a concrete 2x2
//                   example: the schoolbook 8 products, then Strassen's
//                   7, then the recombine that lands on the same answer.
//   #mmrt-tree   -- the recursion tree, toggling between the naive 8-way
//                   split and Strassen's 7-way split.

(function () {
  "use strict";

  // ---- #mmw-widget: the 5-step numeric walkthrough ----

  var TITLES = ["Eight products, the schoolbook way", "Multiply them out", "Strassen's shortcut starts with one sum", "Six more products", "Recombine -- and check"];

  function randEntry() {
    return 1 + Math.floor(Math.random() * 9); // 1..9, keeps every number on the page readable
  }

  function strassenDemo() {
    var A11 = randEntry(),
      A12 = randEntry(),
      A21 = randEntry(),
      A22 = randEntry();
    var B11 = randEntry(),
      B12 = randEntry(),
      B21 = randEntry(),
      B22 = randEntry();

    // The schoolbook reference (8 products).
    var P1 = A11 * B11,
      P2 = A12 * B21,
      P3 = A11 * B12,
      P4 = A12 * B22,
      P5 = A21 * B11,
      P6 = A22 * B21,
      P7 = A21 * B12,
      P8 = A22 * B22;
    var C11ref = P1 + P2,
      C12ref = P3 + P4,
      C21ref = P5 + P6,
      C22ref = P7 + P8;

    // Strassen's 7 products.
    var M1 = (A11 + A22) * (B11 + B22);
    var M2 = (A21 + A22) * B11;
    var M3 = A11 * (B12 - B22);
    var M4 = A22 * (B21 - B11);
    var M5 = (A11 + A12) * B22;
    var M6 = (A21 - A11) * (B11 + B12);
    var M7 = (A12 - A22) * (B21 + B22);
    var C11 = M1 + M4 - M5 + M7;
    var C12 = M3 + M5;
    var C21 = M2 + M4;
    var C22 = M1 - M2 + M3 + M6;

    return {
      A11: A11, A12: A12, A21: A21, A22: A22, B11: B11, B12: B12, B21: B21, B22: B22,
      P1: P1, P2: P2, P3: P3, P4: P4, P5: P5, P6: P6, P7: P7, P8: P8,
      C11ref: C11ref, C12ref: C12ref, C21ref: C21ref, C22ref: C22ref,
      M1: M1, M2: M2, M3: M3, M4: M4, M5: M5, M6: M6, M7: M7,
      C11: C11, C12: C12, C21: C21, C22: C22,
      matches: C11 === C11ref && C12 === C12ref && C21 === C21ref && C22 === C22ref,
    };
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function initMatrixSplitWalk() {
    var root = document.getElementById("mmw-widget");
    if (!root) return;

    var T;

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Take two random 2&times;2 matrices, <code>A</code> and <code>B</code>. The schoolbook formula for <code>C = AB</code> needs two products added together for each of <code>C</code>'s four entries -- <code>8</code> scalar multiplications in total, none of them reusable across entries.</p>";
          stage = eq(["A = [ " + T.A11 + "  " + T.A12 + " ]      B = [ " + T.B11 + "  " + T.B12 + " ]", "    [ " + T.A21 + "  " + T.A22 + " ]          [ " + T.B21 + "  " + T.B22 + " ]"]);
          break;
        }
        case 1: {
          cap =
            "<p>Multiplying it out the schoolbook way: <code>C11 = A11B11 + A12B21</code>, and so on for the other three entries. This is the reference answer -- whatever Strassen's shortcut produces, it has to match this.</p>";
          stage = eq([
            "C11 = " + T.A11 + "×" + T.B11 + " + " + T.A12 + "×" + T.B21 + " = " + T.P1 + " + " + T.P2 + " = " + T.C11ref,
            "C12 = " + T.A11 + "×" + T.B12 + " + " + T.A12 + "×" + T.B22 + " = " + T.P3 + " + " + T.P4 + " = " + T.C12ref,
            "C21 = " + T.A21 + "×" + T.B11 + " + " + T.A22 + "×" + T.B21 + " = " + T.P5 + " + " + T.P6 + " = " + T.C21ref,
            "C22 = " + T.A21 + "×" + T.B12 + " + " + T.A22 + "×" + T.B22 + " = " + T.P7 + " + " + T.P8 + " = " + T.C22ref,
          ]);
          break;
        }
        case 2: {
          cap =
            "<p>Strassen's first product multiplies <em>sums</em> instead of raw entries -- adding the two diagonal corners of each matrix together before multiplying, so one product blends information that the schoolbook version keeps in four separate ones.</p>";
          stage = eq([
            "M1 = (A11+A22)(B11+B22) = (" + T.A11 + "+" + T.A22 + ")(" + T.B11 + "+" + T.B22 + ") = " + (T.A11 + T.A22) + "×" + (T.B11 + T.B22) + " = " + T.M1,
          ]);
          break;
        }
        case 3: {
          cap =
            "<p>Six more, each pairing a sum or difference on one side with a single entry or another sum/difference on the other -- <code>7</code> in total, one shy of the schoolbook's <code>8</code>.</p>";
          stage = eq([
            "M2 = (A21+A22)·B11 = (" + T.A21 + "+" + T.A22 + ")×" + T.B11 + " = " + T.M2,
            "M3 = A11·(B12−B22) = " + T.A11 + "×(" + T.B12 + "−" + T.B22 + ") = " + T.M3,
            "M4 = A22·(B21−B11) = " + T.A22 + "×(" + T.B21 + "−" + T.B11 + ") = " + T.M4,
            "M5 = (A11+A12)·B22 = (" + T.A11 + "+" + T.A12 + ")×" + T.B22 + " = " + T.M5,
            "M6 = (A21−A11)(B11+B12) = (" + T.A21 + "−" + T.A11 + ")×(" + T.B11 + "+" + T.B12 + ") = " + T.M6,
            "M7 = (A12−A22)(B21+B22) = (" + T.A12 + "−" + T.A22 + ")×(" + T.B21 + "+" + T.B22 + ") = " + T.M7,
          ]);
          break;
        }
        case 4: {
          cap =
            "<p>Add and subtract the seven products back together -- different combinations for each entry of <code>C</code> -- and it lands on exactly the same answer as the schoolbook version, using <code>7</code> multiplications instead of <code>8</code>.</p>";
          stage = eq([
            "C11 = M1+M4−M5+M7 = " + T.M1 + "+" + T.M4 + "−" + T.M5 + "+" + T.M7 + " = " + T.C11 + (T.C11 === T.C11ref ? "  (matches)" : "  (?!)"),
            "C12 = M3+M5 = " + T.M3 + "+" + T.M5 + " = " + T.C12 + (T.C12 === T.C12ref ? "  (matches)" : "  (?!)"),
            "C21 = M2+M4 = " + T.M2 + "+" + T.M4 + " = " + T.C21 + (T.C21 === T.C21ref ? "  (matches)" : "  (?!)"),
            "C22 = M1−M2+M3+M6 = " + T.M1 + "−" + T.M2 + "+" + T.M3 + "+" + T.M6 + " = " + T.C22 + (T.C22 === T.C22ref ? "  (matches)" : "  (?!)"),
          ]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    T = strassenDemo();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, function () {
      T = strassenDemo();
    });
  }

  // ---- #mmrt-tree: the recursion tree, naive (8-way) vs Strassen (7-way) ----
  // Geometry matches the other recursion trees on the site (quicksort's
  // #rt-tree, closest-pair's #cprt-tree, Karatsuba's #krt-tree). Capped at
  // 2 levels -- at branching factor 8 a third level is already 512 nodes,
  // denser than any tree elsewhere on the site renders cleanly at this
  // fixed SVG width.

  function initMatrixTree() {
    var treeEl = document.getElementById("mmrt-tree");
    if (!treeEl) return;
    var readoutEl = document.getElementById("mmrt-readout");
    var modeEl = document.getElementById("mmrt-mode");
    var lvdownEl = document.getElementById("mmrt-lvdown");
    var lvupEl = document.getElementById("mmrt-lvup");

    var MAXL = 2,
      shown = MAXL + 1,
      mode = "strassen"; // "naive" | "strassen"

    function branch() {
      return mode === "naive" ? 8 : 7;
    }

    function buildLevels() {
      var lv = [[1]],
        b = branch();
      for (var L = 1; L <= MAXL; L++) {
        var cur = [];
        lv[L - 1].forEach(function (f) {
          for (var k = 0; k < b; k++) cur.push(f / 2);
        });
        lv.push(cur);
      }
      return lv;
    }

    function fmtHalf(f) {
      if (f === 1) return "n";
      return "n/" + Math.round(1 / f);
    }

    function renderTree() {
      var lv = buildLevels(),
        W = 780,
        H = 430,
        tx0 = 64,
        tw = 520,
        cx0 = 612,
        nodeHfull = 30;
      function rowY(L) {
        return 52 + L * 130;
      }
      var kind = mode === "naive" ? "kept" : "half";
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" role="img" aria-label="Recursion tree for ' + mode + ' matrix multiplication">';
      s += '<text x="' + cx0 + '" y="18" class="svg-h">sub-multiplications at this level</text>';
      for (var L = 0; L < shown; L++) {
        var n = lv[L].length,
          y = rowY(L);
        var dense = n > 20;
        var nodeW = Math.min(62, Math.max(dense ? 5 : 14, tw / n - (dense ? 1 : 6)));
        var nodeH = dense ? 16 : nodeHfull;
        var showLabel = nodeW >= 26;
        var showEdges = n <= 24;
        s += '<g class="enter">';
        s += '<text x="4" y="' + (y + 4) + '" class="lvl-t">level ' + L + " &middot; " + n + "</text>";
        lv[L].forEach(function (f, i) {
          var cx = tx0 + (i + 0.5) * tw / n,
            k = L === 0 ? "root" : kind;
          if (L > 0 && showEdges) {
            var parentN = lv[L - 1].length,
              pcx = tx0 + (Math.floor(i / branch()) + 0.5) * tw / parentN,
              py = rowY(L - 1) + nodeHfull / 2;
            s += '<line x1="' + pcx + '" y1="' + py + '" x2="' + cx + '" y2="' + (y - nodeH / 2) + '" class="edge ' + k + '"/>';
          }
          s += '<rect x="' + (cx - nodeW / 2) + '" y="' + (y - nodeH / 2) + '" width="' + nodeW + '" height="' + nodeH + '" rx="' + (dense ? 2 : 6) + '" class="node ' + k + '"/>';
          if (showLabel) {
            s += '<text x="' + cx + '" y="' + (y + 4.5) + '" text-anchor="middle" class="node-t">' + fmtHalf(f) + "</text>";
          }
        });
        s += "</g>";
      }
      if (shown === MAXL + 1) {
        s += '<text x="' + (tx0 + tw / 2) + '" y="' + (rowY(MAXL) + 44) + '" text-anchor="middle" class="lvl-t">and so on, until sub-matrices reach constant size</text>';
      }
      s += "</svg>";
      treeEl.innerHTML = s;

      var L = shown - 1,
        naiveLeaves = Math.pow(8, L),
        strassenLeaves = Math.pow(7, L);
      var txt =
        "<p>At <code>L</code> levels, naive quadrant recursion has fanned out into <code>8<sup>L</sup></code> scalar sub-multiplications; Strassen, into only <code>7<sup>L</sup></code>. Right now, with <code>L = " +
        L +
        "</code>: naive is at <code>8<sup>" +
        L +
        "</sup> = " +
        naiveLeaves +
        "</code>, Strassen is at <code>7<sup>" +
        L +
        "</sup> = " +
        strassenLeaves +
        "</code>" +
        (L > 0 ? " -- " + (naiveLeaves / strassenLeaves).toFixed(2) + "&times; fewer for Strassen, and that ratio only grows with depth." : ".") +
        "</p>";
      readoutEl.innerHTML = txt;
      lvdownEl.disabled = shown <= 1;
      lvupEl.disabled = shown >= MAXL + 1;
    }

    modeEl.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-mode]");
      if (!b) return;
      mode = b.getAttribute("data-mode");
      Array.prototype.forEach.call(modeEl.querySelectorAll("button"), function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      renderTree();
    });
    lvupEl.addEventListener("click", function () {
      if (shown < MAXL + 1) {
        shown++;
        renderTree();
      }
    });
    lvdownEl.addEventListener("click", function () {
      if (shown > 1) {
        shown--;
        renderTree();
      }
    });

    renderTree();
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html. Neither widget below
  // measures its container's size on init, so it's safe for both to exist
  // inside an initially-hidden panel.

  document.addEventListener("DOMContentLoaded", function () {
    initMatrixSplitWalk();
    initMatrixTree();
  });
})();
