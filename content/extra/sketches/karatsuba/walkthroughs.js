// Step-by-step walkthroughs for the redesigned Karatsuba Multiplication
// article. Same discipline as the other redesigned articles: every number
// shown is computed by actually doing the arithmetic on the current random
// operands, not scripted or faked.
//
// Two independent widgets:
//   #ksw-widget -- Karatsuba's trick, step by step (split, the two
//                  "obvious" products, the naive cross term, the
//                  Karatsuba shortcut, recombine)
//   #krt-tree   -- the recursion tree, toggling between the naive 4-way
//                  split and Karatsuba's 3-way split

(function () {
  "use strict";

  // ---- #ksw-widget: the 5-step numeric walkthrough ----

  var TITLES = ["The split", "Two products either way", "The naive way: two more", "Karatsuba's shortcut", "Recombine"];

  function randByte() {
    return Math.floor(Math.random() * 256); // 8-bit operands: 0..255
  }

  function karatsubaDemo(a, b) {
    var s = 4; // half of 8 bits
    var a1 = Math.floor(a / 16),
      a2 = a % 16,
      b1 = Math.floor(b / 16),
      b2 = b % 16;
    var x = a1 * b1,
      z = a2 * b2,
      y = (a1 + a2) * (b1 + b2);
    var crossHigh = a1 * b2,
      crossLow = a2 * b1;
    var crossNaive = crossHigh + crossLow;
    var crossKrat = y - x - z;
    var recombined = x * Math.pow(2, 2 * s) + crossKrat * Math.pow(2, s) + z;
    var direct = a * b;
    return {
      a: a,
      b: b,
      s: s,
      a1: a1,
      a2: a2,
      b1: b1,
      b2: b2,
      x: x,
      z: z,
      y: y,
      crossHigh: crossHigh,
      crossLow: crossLow,
      crossNaive: crossNaive,
      crossKrat: crossKrat,
      recombined: recombined,
      direct: direct,
    };
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function initKaratsubaSplitWalk() {
    var root = document.getElementById("ksw-widget");
    if (!root) return;

    var T;

    function newOperands() {
      T = karatsubaDemo(randByte(), randByte());
    }

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Take two random 8-bit numbers, <code>a = " +
            T.a +
            "</code> and <code>b = " +
            T.b +
            "</code>. Split each in half at the bit boundary <code>s = " +
            T.s +
            "</code>: a high half and a low half, so that <code>a = a1&middot;2<sup>s</sup> + a2</code> and <code>b = b1&middot;2<sup>s</sup> + b2</code>.</p>";
          stage = eq(["a1 = " + T.a1 + "      a2 = " + T.a2, "b1 = " + T.b1 + "      b2 = " + T.b2]);
          break;
        }
        case 1: {
          cap = "<p>Whichever method you use, you need these two: the high&times;high product and the low&times;low product.</p>";
          stage = eq(["x = a1 &times; b1 = " + T.a1 + " &times; " + T.b1 + " = " + T.x, "z = a2 &times; b2 = " + T.a2 + " &times; " + T.b2 + " = " + T.z]);
          break;
        }
        case 2: {
          cap =
            "<p>The schoolbook expansion also needs the cross term <code>a1b2 + a2b1</code> -- and the obvious way to get it is two more multiplications, for <code>4</code> in total.</p>";
          stage = eq([
            "a1 &times; b2 = " + T.a1 + " &times; " + T.b2 + " = " + T.crossHigh,
            "a2 &times; b1 = " + T.a2 + " &times; " + T.b1 + " = " + T.crossLow,
            "cross = " + T.crossHigh + " + " + T.crossLow + " = " + T.crossNaive,
          ]);
          break;
        }
        case 3: {
          cap =
            "<p>Karatsuba gets that same cross term from one extra multiplication instead of two: multiply the <em>sums</em> of the halves, then subtract off the two products you already have.</p>";
          stage = eq([
            "y = (a1+a2) &times; (b1+b2) = " + (T.a1 + T.a2) + " &times; " + (T.b1 + T.b2) + " = " + T.y,
            "cross = y &minus; x &minus; z = " + T.y + " &minus; " + T.x + " &minus; " + T.z + " = " + T.crossKrat,
            T.crossKrat === T.crossNaive ? "(exactly the a1b2 + a2b1 from before -- no extra multiplication needed)" : "",
          ]);
          break;
        }
        case 4: {
          cap =
            "<p>Combine the pieces -- <code>a&times;b = x&middot;2<sup>2s</sup> + cross&middot;2<sup>s</sup> + z</code> -- and it lands on the same answer as multiplying <code>a</code> and <code>b</code> directly, using only <code>3</code> multiplications (<code>x</code>, <code>z</code>, <code>y</code>) instead of <code>4</code>.</p>";
          stage = eq([
            "a &times; b = " + T.x + "&middot;2<sup>" + 2 * T.s + "</sup> + " + T.crossKrat + "&middot;2<sup>" + T.s + "</sup> + " + T.z,
            "      = " + T.recombined,
            T.a + " &times; " + T.b + " = " + T.direct + (T.recombined === T.direct ? "   (checks out)" : "   (?!)"),
          ]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newOperands();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newOperands);
  }

  // ---- #krt-tree: the recursion tree, naive (4-way) vs Karatsuba (3-way) ----
  // Geometry matches the other two articles' recursion trees (quicksort's
  // #rt-tree, closest-pair's #cprt-tree) so all three read as the same
  // kind of picture -- the only new idea here is a variable branching
  // factor instead of a fixed one.

  function initKaratsubaTree() {
    var treeEl = document.getElementById("krt-tree");
    if (!treeEl) return;
    var readoutEl = document.getElementById("krt-readout");
    var modeEl = document.getElementById("krt-mode");
    var lvdownEl = document.getElementById("krt-lvdown");
    var lvupEl = document.getElementById("krt-lvup");

    var MAXL = 3,
      shown = MAXL + 1,
      mode = "karatsuba"; // "naive" | "karatsuba"

    function branch() {
      return mode === "naive" ? 4 : 3;
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
        return 52 + L * 96;
      }
      var kind = mode === "naive" ? "kept" : "half";
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" role="img" aria-label="Recursion tree for ' + mode + ' multiplication">';
      s += '<text x="' + cx0 + '" y="18" class="svg-h">subproblems at this level</text>';
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
        s += '<text x="' + (tx0 + tw / 2) + '" y="' + (rowY(MAXL) + 44) + '" text-anchor="middle" class="lvl-t">and so on, until subproblems reach constant size</text>';
      }
      s += "</svg>";
      treeEl.innerHTML = s;

      var L = shown - 1,
        naiveLeaves = Math.pow(4, L),
        kratLeaves = Math.pow(3, L);
      var txt =
        "<p>At <code>L</code> levels, naive divide-and-conquer has fanned out into <code>4<sup>L</sup></code> subproblems; Karatsuba, into only <code>3<sup>L</sup></code>. Right now, with <code>L = " +
        L +
        "</code>: naive is at <code>4<sup>" +
        L +
        "</sup> = " +
        naiveLeaves +
        "</code>, Karatsuba is at <code>3<sup>" +
        L +
        "</sup> = " +
        kratLeaves +
        "</code>" +
        (L > 0 ? " -- " + (naiveLeaves / kratLeaves).toFixed(2) + "&times; fewer for Karatsuba, and that ratio only grows with depth." : ".") +
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
    initKaratsubaSplitWalk();
    initKaratsubaTree();
  });
})();
