// Step-by-step walkthrough for the Traveling Salesman Problem article.
//
//   #tspw-widget -- four cities, a fresh random layout each round. Shows
//                   both ideas side by side on the same tiny instance:
//                   Held-Karp choosing among predecessors for one subset
//                   cell, and branch-and-bound ruling out a whole branch
//                   using a bound, before either algorithm's full run.

(function () {
  "use strict";

  var TITLES = [
    "Four cities, one shortest loop",
    "Held-Karp: which predecessor is cheapest?",
    "Branch and bound: rule out a branch early",
    "Same problem, two different strategies",
    "Both land on the same answer",
  ];

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  var current = null;

  function dist(pts, i, j) {
    var dx = pts[i].x - pts[j].x,
      dy = pts[i].y - pts[j].y;
    return Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));
  }

  function newRound() {
    var pts = [];
    for (var i = 0; i < 4; i++) pts.push({ x: Math.random() * 100, y: Math.random() * 100 });
    var d = [];
    for (var a = 0; a < 4; a++) {
      d.push([]);
      for (var b = 0; b < 4; b++) d[a].push(a === b ? 0 : dist(pts, a, b));
    }
    // brute force the true optimum over all (4-1)! = 6 orderings of {1,2,3}
    var perms = [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ];
    var best = Infinity,
      bestPerm = null;
    perms.forEach(function (p) {
      var c = d[0][p[0]] + d[p[0]][p[1]] + d[p[1]][p[2]] + d[p[2]][0];
      if (c < best) {
        best = c;
        bestPerm = p;
      }
    });
    // Held-Karp: C[{1,2}][2] via the only two predecessors possible (city 1)
    // -- pick a subset with a genuine choice: C[{1,2,... }] ending at 3, having come from 1 or 2
    var via1 = d[0][1] + d[1][2] + d[2][3]; // 0->1->2->3
    var via2 = d[0][2] + d[2][1] + d[1][3]; // 0->2->1->3
    // branch and bound: a 2-city partial path whose bound already exceeds a known tour
    var knownTourCost = d[0][1] + d[1][2] + d[2][3] + d[3][0];
    var partial = [0, 3]; // try city 3 first
    var partialCost = d[0][3];
    var remaining = [1, 2];
    var boundLooseEdges = remaining.reduce(function (s, v) {
      var m = Infinity;
      [0, 1, 2, 3].forEach(function (u) {
        if (u !== v && d[v][u] < m) m = d[v][u];
      });
      return s + m;
    }, 0);
    var partialBound = partialCost + boundLooseEdges;

    current = { pts: pts, d: d, best: best, bestPerm: bestPerm, via1: via1, via2: via2, knownTourCost: knownTourCost, partialBound: partialBound };
  }

  function render(step) {
    var root = document.getElementById("tspw-widget");
    var c = current,
      d = c.d;
    var cap, stage;
    switch (step) {
      case 0: {
        cap =
          "<p>Cities <code>0..3</code>, symmetric distances. A tour visits every city once and returns to <code>0</code> -- with 4 cities there are only <code>3! = 6</code> possible orderings to check by hand, but that number doubles every time a city is added, which is exactly why brute force stops being an option past a handful of cities.</p>";
        stage = eq([
          "d(0,1)=" + d[0][1] + "  d(0,2)=" + d[0][2] + "  d(0,3)=" + d[0][3],
          "d(1,2)=" + d[1][2] + "  d(1,3)=" + d[1][3] + "  d(2,3)=" + d[2][3],
        ]);
        break;
      }
      case 1: {
        cap =
          "<p>Held-Karp asks: to reach city <code>3</code> having visited exactly <code>{1,2}</code>, was the last stop before <code>3</code> city <code>1</code> or city <code>2</code>? Try both, keep the cheaper one -- exactly like every DP table on this site keeps the cheaper of the options it tries.</p>";
        stage = eq([
          "via 1:  0→1→2→3  =  " + d[0][1] + "+" + d[1][2] + "+" + d[2][3] + "  =  " + c.via1,
          "via 2:  0→2→1→3  =  " + d[0][2] + "+" + d[2][1] + "+" + d[1][3] + "  =  " + c.via2,
          "cheaper: " + (c.via1 <= c.via2 ? "via 1 (" + c.via1 + ")" : "via 2 (" + c.via2 + ")"),
        ]);
        break;
      }
      case 2: {
        cap =
          "<p>Branch and bound works top-down instead: pick a partial path, then estimate the <em>best possible</em> way to finish it (add up the cheapest available edge out of every city not yet placed). If that estimate already can't beat a tour already found, there's no reason to explore any path starting this way -- the whole branch is cut, unexplored.</p>";
        stage = eq([
          "known tour 0→1→2→3→0 costs " + c.knownTourCost,
          "partial path 0→3 (cost " + d[0][3] + ") has lower bound " + c.partialBound,
          c.partialBound >= c.knownTourCost ? "bound ≥ known tour → PRUNE this branch" : "bound < known tour → keep exploring",
        ]);
        break;
      }
      case 3: {
        cap =
          "<p>Held-Karp never guesses -- it fills in every reachable (subset, end-city) pair exactly once, bottom-up, so the whole table is built whether or not most of it turns out to matter. Branch and bound goes top-down and skips whatever it can prove can't win, but in the worst case (a bound that never rules anything out) it still has to fall back on trying everything.</p>";
        stage = eq(["Held-Karp:  O(2ⁿ n²), always", "Branch and bound:  worst case O(n!), often far less in practice"]);
        break;
      }
      case 4: {
        cap =
          "<p>For this instance, both algorithms -- and brute force -- agree: the shortest tour is <code>" +
          c.bestPerm.join(" → ") +
          "</code>, starting and ending at <code>0</code>, costing <code>" +
          c.best +
          "</code>. The Try it tab runs the full versions of both on larger instances.</p>";
        stage = eq(["optimal tour: 0 → " + c.bestPerm.join(" → ") + " → 0", "cost: " + c.best]);
        break;
      }
    }
    root.querySelector(".caption").innerHTML = cap;
    root.querySelector(".stage").innerHTML = stage;
  }

  function initTspWalk() {
    var root = document.getElementById("tspw-widget");
    if (!root) return;
    newRound();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newRound);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTspWalk();
  });
})();
