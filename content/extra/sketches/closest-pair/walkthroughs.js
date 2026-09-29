// Step-by-step walkthroughs for the redesigned Closest Pair of Points
// article. Same discipline as the other redesigned articles: every number
// shown is derived from actually running the real algorithm on the current
// random sample, not scripted or faked.
//
// Two independent widgets:
//   #cpw-widget  -- Closest pair, step by step (split, solve halves, check
//                   the strip)
//   #cprt-tree   -- the closest-pair recursion tree (T(n) = 2T(n/2) + cn,
//                   halving at every level)

(function () {
  "use strict";

  // ---- geometry helpers ----

  function dist(p, q) {
    var dx = p.x - q.x,
      dy = p.y - q.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bruteForceClosest(pts) {
    var best = null,
      bestD = Infinity;
    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dd = dist(pts[i], pts[j]);
        if (dd < bestD) {
          bestD = dd;
          best = { a: pts[i], b: pts[j], d: dd };
        }
      }
    }
    return best;
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function farEnough(p, pts, minD) {
    return pts.every(function (q) {
      return dist(p, q) >= minD;
    });
  }

  // Rejection-sampled so points land visibly apart from each other --
  // without this, two points can land right on top of each other and the
  // plot shows what looks like a single circle.
  function genRandomPoints(n) {
    var pts = [];
    while (pts.length < n) {
      var tries = 0,
        p;
      do {
        p = { x: round1(40 + Math.random() * 380), y: round1(30 + Math.random() * 240) };
        tries++;
      } while (tries < 50 && !farEnough(p, pts, 28));
      pts.push(p);
    }
    return pts;
  }

  // ---- the actual divide-and-conquer, run for real on `points` ----

  function closestPairDemo(points) {
    var byX = points.slice().sort(function (a, b) {
      return a.x - b.x;
    });
    var n = byX.length,
      mid = Math.floor(n / 2);
    var splitX = (byX[mid - 1].x + byX[mid].x) / 2;
    var left = byX.slice(0, mid),
      right = byX.slice(mid);

    var bestLeft = bruteForceClosest(left),
      bestRight = bruteForceClosest(right);
    var d = Math.min(bestLeft.d, bestRight.d);
    var best = bestLeft.d <= bestRight.d ? bestLeft : bestRight;

    var strip = byX.filter(function (p) {
      return Math.abs(p.x - splitX) < d;
    });
    var stripByY = strip.slice().sort(function (a, b) {
      return a.y - b.y;
    });

    var checks = [],
      stripBest = null,
      stripBestD = Infinity;
    for (var i = 0; i < stripByY.length; i++) {
      for (var j = i + 1; j < stripByY.length && stripByY[j].y - stripByY[i].y < d; j++) {
        var entry = { a: stripByY[i], b: stripByY[j], d: dist(stripByY[i], stripByY[j]) };
        checks.push(entry);
        if (entry.d < stripBestD) {
          stripBestD = entry.d;
          stripBest = entry;
        }
      }
    }

    var finalBest = best,
      finalD = d;
    if (stripBest && stripBestD < d) {
      finalBest = stripBest;
      finalD = stripBestD;
    }

    return {
      byX: byX,
      n: n,
      splitX: splitX,
      left: left,
      right: right,
      bestLeft: bestLeft,
      bestRight: bestRight,
      d: d,
      strip: strip,
      stripByY: stripByY,
      checks: checks,
      stripBest: stripBest,
      stripBestD: stripBestD,
      finalBest: finalBest,
      finalD: finalD,
    };
  }

  // ---- SVG rendering for the #cpw-widget scatter plot ----

  function withCls(p, cls) {
    return { x: p.x, y: p.y, _cls: cls };
  }

  function svgPt(p) {
    return '<circle class="cp-pt' + (p._cls ? " " + p._cls : "") + '" cx="' + p.x + '" cy="' + p.y + '" r="5"></circle>';
  }

  function svgLine(l) {
    return '<line class="cp-line' + (l.cls ? " " + l.cls : "") + '" x1="' + l.a.x + '" y1="' + l.a.y + '" x2="' + l.b.x + '" y2="' + l.b.y + '"></line>';
  }

  function renderPlot(parts) {
    var W = 460,
      H = 300;
    var s = '<svg class="cp-plot" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + (parts.label || "Points on the plane") + '">';
    if (parts.band) {
      s += '<rect class="cp-band" x="' + parts.band.x + '" y="0" width="' + parts.band.w + '" height="' + H + '"></rect>';
    }
    if (parts.splitX != null) {
      s += '<line class="cp-split" x1="' + parts.splitX + '" y1="0" x2="' + parts.splitX + '" y2="' + H + '"></line>';
    }
    (parts.lines || []).forEach(function (l) {
      s += svgLine(l);
    });
    (parts.points || []).forEach(function (p) {
      s += svgPt(p);
    });
    s += "</svg>";
    return s;
  }

  // ---- #cpw-widget: the 5-step narrative ----

  var TITLES = ["The setup", "Split", "Solve each half", "Check the strip", "Done"];

  function initClosestPairWalk() {
    var root = document.getElementById("cpw-widget");
    if (!root) return;

    var State;

    function newPoints() {
      var tries = 0,
        T;
      do {
        T = closestPairDemo(genRandomPoints(9));
        tries++;
      } while (tries < 40 && T.strip.length < 2);
      State = T;
    }

    function classify(p) {
      if (State.left.indexOf(p) >= 0) return "lo";
      return "hi";
    }

    function render(step) {
      var T = State,
        cap,
        stage;
      switch (step) {
        case 0: {
          cap = "<p><code>n</code> = " + T.n + " points, dropped in as-is. Checking every pair directly would cost <code>O(n&sup2;)</code> comparisons -- fine for 9 points, not for a million.</p>";
          stage = renderPlot({
            label: "Unsorted points",
            points: T.byX.map(function (p) {
              return withCls(p, "unk");
            }),
          });
          break;
        }
        case 1: {
          cap =
            "<p>Sort by <code>x</code> and split at the median: the left <code>" +
            T.left.length +
            "</code> points go left, the right <code>" +
            T.right.length +
            "</code> go right. Each half is now a smaller instance of the exact same problem.</p>";
          stage = renderPlot({
            label: "Split at the median x",
            splitX: T.splitX,
            points: T.byX.map(function (p) {
              return withCls(p, classify(p));
            }),
          });
          break;
        }
        case 2: {
          cap =
            "<p>Recursing bottoms out here -- both halves are small enough to check directly. The left half's closest pair is <code>" +
            T.bestLeft.d.toFixed(1) +
            "</code> apart; the right half's is <code>" +
            T.bestRight.d.toFixed(1) +
            "</code> apart. Call the smaller one <code>d = " +
            T.d.toFixed(1) +
            "</code> -- the best answer so far, but not necessarily the final one.</p>";
          stage = renderPlot({
            label: "Closest pair within each half",
            splitX: T.splitX,
            points: T.byX.map(function (p) {
              return withCls(p, classify(p));
            }),
            lines: [
              { a: T.bestLeft.a, b: T.bestLeft.b, cls: "lo" },
              { a: T.bestRight.a, b: T.bestRight.b, cls: "hi" },
            ],
          });
          break;
        }
        case 3: {
          cap =
            "<p>A closer pair could still straddle the split line -- but only if both points fall within <code>d</code> of it, the shaded strip. Sort those <code>" +
            T.strip.length +
            "</code> points by <code>y</code> and compare each one to just the next few below it; a packing argument guarantees at most 7 of those comparisons can ever matter, so checking the strip stays <code>O(n)</code>, not <code>O(n&sup2;)</code>.</p>" +
            (T.checks.length === 0
              ? "<p>None of those points end up within <code>d</code> of each other in <code>y</code>, so there's nothing left to compare -- the strip doesn't help this time, and <code>d</code> stands.</p>"
              : T.stripBest && T.stripBestD < T.d
              ? "<p>One of those <code>" + T.checks.length + "</code> checks beats <code>d</code>: <code>" + T.stripBestD.toFixed(1) + "</code> apart, straddling the line.</p>"
              : "<p>None of those <code>" + T.checks.length + "</code> checks beat <code>d</code> -- the strip doesn't help this time, and <code>d</code> stands.</p>");
          stage = renderPlot({
            label: "Checking the strip around the split",
            band: { x: T.splitX - T.d, w: 2 * T.d },
            splitX: T.splitX,
            points: T.byX.map(function (p) {
              return withCls(p, T.strip.indexOf(p) >= 0 ? "med" : classify(p));
            }),
            lines: T.checks.map(function (c) {
              return { a: c.a, b: c.b, cls: T.stripBest === c && T.stripBestD < T.d ? "piv" : "dim" };
            }),
          });
          break;
        }
        case 4: {
          cap =
            "<p>Combining the two halves and the strip, the closest pair among all <code>" +
            T.n +
            "</code> points is <code>" +
            T.finalD.toFixed(1) +
            "</code> apart. Every level of the recursion does <code>O(n)</code> work at that level (splitting and the strip scan), and there are <code>O(log n)</code> levels, so the whole algorithm costs <code>O(n log n)</code> -- worst case, not just on average.</p>";
          stage = renderPlot({
            label: "The overall closest pair",
            points: T.byX.map(function (p) {
              return withCls(p, p === T.finalBest.a || p === T.finalBest.b ? "piv" : "unk");
            }),
            lines: [{ a: T.finalBest.a, b: T.finalBest.b, cls: "piv" }],
          });
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newPoints();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newPoints);
  }

  // ---- #cprt-tree: the closest-pair recursion tree ----
  // T(n) = 2T(n/2) + cn -- symmetric halves, so (unlike median of medians)
  // there's only one child shape, and every level costs the same cn.
  // Geometry intentionally matches quicksort's #rt-tree so the two read as
  // the same kind of picture.

  function initClosestPairTree() {
    var treeEl = document.getElementById("cprt-tree");
    if (!treeEl) return;
    var readoutEl = document.getElementById("cprt-readout");
    var lvdownEl = document.getElementById("cprt-lvdown");
    var lvupEl = document.getElementById("cprt-lvup");
    var replayEl = document.getElementById("cprt-replay");

    var MAXL = 3,
      shown = MAXL + 1,
      timer = null;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function buildLevels() {
      var lv = [[1]];
      for (var L = 1; L <= MAXL; L++) {
        var cur = [];
        lv[L - 1].forEach(function (f) {
          cur.push(f / 2);
          cur.push(f / 2);
        });
        lv.push(cur);
      }
      return lv;
    }

    function fmtHalf(f) {
      if (f === 1) return "n";
      return "n/" + Math.round(1 / f);
    }

    function renderTree(animate) {
      var lv = buildLevels(),
        W = 780,
        H = 430,
        tx0 = 64,
        tw = 520,
        nodeW = 62,
        nodeH = 30,
        cx0 = 612;
      function rowY(L) {
        return 52 + L * 96;
      }
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" role="img" aria-label="Recursion tree for closest pair, halving at every level">';
      s += '<text x="' + cx0 + '" y="18" class="svg-h">work at this level</text>';
      for (var L = 0; L < shown; L++) {
        var n = lv[L].length,
          y = rowY(L);
        var isNew = animate && L === shown - 1 && L > 0;
        s += '<g class="' + (isNew ? "enter" : "") + '">';
        s += '<text x="4" y="' + (y + 4) + '" class="lvl-t">level ' + L + "</text>";
        lv[L].forEach(function (f, i) {
          var cx = tx0 + (i + 0.5) * tw / n,
            kind = L === 0 ? "root" : "half";
          if (L > 0) {
            var pcx = tx0 + (Math.floor(i / 2) + 0.5) * tw / (n / 2),
              py = rowY(L - 1) + nodeH / 2;
            s += '<line x1="' + pcx + '" y1="' + py + '" x2="' + cx + '" y2="' + (y - nodeH / 2) + '" class="edge ' + kind + '"/>';
          }
          s += '<rect x="' + (cx - nodeW / 2) + '" y="' + (y - nodeH / 2) + '" width="' + nodeW + '" height="' + nodeH + '" rx="6" class="node ' + kind + '"/>';
          s += '<text x="' + cx + '" y="' + (y + 4.5) + '" text-anchor="middle" class="node-t">' + fmtHalf(f) + "</text>";
        });
        s += '<rect x="' + cx0 + '" y="' + (y - 9) + '" width="150" height="18" rx="3" class="costbar"/>';
        s += '<text x="' + cx0 + '" y="' + (y + 26) + '" class="cost-t">cn</text>';
        s += "</g>";
      }
      if (shown === MAXL + 1) {
        s += '<text x="' + (tx0 + tw / 2) + '" y="' + (rowY(MAXL) + 62) + '" text-anchor="middle" class="lvl-t">and so on, until subproblems reach constant size</text>';
      }
      s += "</svg>";
      treeEl.innerHTML = s;

      var txt =
        "<p>At depth <code>L</code> there are <code>2<sup>L</sup></code> subproblems, each of size <code>n/2<sup>L</sup></code>. The work at that level is <code>2<sup>L</sup> &times; c(n/2<sup>L</sup>) = cn</code> -- the <code>2<sup>L</sup></code> and the <code>1/2<sup>L</sup></code> cancel, so every level costs the same, no matter how deep it is. That is exactly what the flat bars above show.</p>";
      txt +=
        "<p>With <code>" +
        shown +
        "</code> level" +
        (shown === 1 ? "" : "s") +
        " shown, that is <code>" +
        shown +
        "cn</code> of work so far. Carried out to the full depth of <code>log&sub2; n</code> levels, the total is <code>cn log n</code>: <code>&Theta;(n log n)</code>. It is the same recurrence as quicksort's best case, <code>T(n) = 2T(n/2) + cn</code> -- flat cost per level, <code>log n</code> levels to add up.</p>";
      readoutEl.innerHTML = txt;
      lvdownEl.disabled = shown <= 1;
      lvupEl.disabled = shown >= MAXL + 1;
    }

    lvupEl.addEventListener("click", function () {
      clearInterval(timer);
      if (shown < MAXL + 1) {
        shown++;
        renderTree(true);
      }
    });
    lvdownEl.addEventListener("click", function () {
      clearInterval(timer);
      if (shown > 1) {
        shown--;
        renderTree(false);
      }
    });
    replayEl.addEventListener("click", function () {
      clearInterval(timer);
      if (reduce) {
        shown = MAXL + 1;
        renderTree(false);
        return;
      }
      shown = 1;
      renderTree(false);
      timer = setInterval(function () {
        if (shown >= MAXL + 1) {
          clearInterval(timer);
          return;
        }
        shown++;
        renderTree(true);
      }, 800);
    });

    renderTree(false);
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html. Neither widget below
  // measures its container's size on init, so it's safe for both to exist
  // inside an initially-hidden panel.

  document.addEventListener("DOMContentLoaded", function () {
    initClosestPairWalk();
    initClosestPairTree();
  });
})();
