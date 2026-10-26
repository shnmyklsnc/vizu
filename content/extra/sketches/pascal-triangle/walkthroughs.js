// Step-by-step walkthrough for the Pascal's Triangle / C(n,k) article.
//
//   #pascalw-widget -- naive recursion computing C(4,2) by hand, tracking
//                      exactly which smaller C(i,j) get recomputed and how
//                      many times, before the triangle's DP fill ever
//                      enters the picture.

(function () {
  "use strict";

  var TITLES = ["C(4,2), the recursive way", "C(4,2) needs C(3,1) and C(3,2)", "C(2,1) gets computed twice", "Both copies bottom out the same way", "The full tally"];

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  // Counts how many times naive recursion would call C(n,k) while
  // computing C(4,2), for every (n,k) pair it touches -- computed for
  // real, not hard-coded, same discipline as the Fibonacci walkthrough.
  function countCalls(nn, kk) {
    var counts = {};
    function rec(n, k) {
      var key = n + "," + k;
      counts[key] = (counts[key] || 0) + 1;
      if (k !== 0 && k !== n) {
        rec(n - 1, k - 1);
        rec(n - 1, k);
      }
    }
    rec(nn, kk);
    return counts;
  }

  function render(step) {
    var root = document.getElementById("pascalw-widget");
    var counts = countCalls(4, 2);
    var cap, stage;
    switch (step) {
      case 0: {
        cap =
          "<p>Pascal's rule, <code>C(n,k) = C(n−1,k−1) + C(n−1,k)</code>, translates directly into code: to get <code>C(4,2)</code>, call <code>C(3,1)</code> and <code>C(3,2)</code>, add the results. No memory of anything computed along the way.</p>";
        stage = eq(["C(4,2) = C(3,1) + C(3,2)"]);
        break;
      }
      case 1: {
        cap = "<p>Each of those expands the same way: <code>C(3,1) = C(2,0) + C(2,1)</code>, and <code>C(3,2) = C(2,1) + C(2,2)</code>.</p>";
        stage = eq(["C(4,2) = C(3,1) + C(3,2)", "       = (C(2,0) + C(2,1)) + (C(2,1) + C(2,2))"]);
        break;
      }
      case 2: {
        cap =
          "<p>Look closely: <code>C(2,1)</code> shows up in <em>both</em> parenthesized groups above -- once from <code>C(3,1)</code>'s side, once from <code>C(3,2)</code>'s. Naive recursion has no way to notice they're the same subproblem, so each copy expands separately, doing the same work twice.</p>";
        stage = eq(["C(3,1)'s C(2,1)   ← one call", "C(3,2)'s C(2,1)   ← a completely separate call, same subproblem"]);
        break;
      }
      case 3: {
        cap =
          "<p>Both copies of <code>C(2,1)</code> expand into <code>C(1,0) + C(1,1)</code>, and both of <em>those</em> are base cases -- edges of the triangle, always <code>1</code>. So each copy of <code>C(2,1)</code> separately arrives at <code>1 + 1 = 2</code>, by separately re-deriving it.</p>";
        stage = eq(["C(2,1) (copy 1) = C(1,0) + C(1,1) = 1 + 1 = 2", "C(2,1) (copy 2) = C(1,0) + C(1,1) = 1 + 1 = 2"]);
        break;
      }
      case 4: {
        var order = ["4,2", "3,1", "3,2", "2,0", "2,1", "2,2", "1,0", "1,1"];
        var rows = order.map(function (key) {
          var c = counts[key];
          return "C(" + key.replace(",", ",") + ") is called " + c + " time" + (c === 1 ? "" : "s");
        });
        var total = Object.keys(counts).reduce(function (s, key) { return s + counts[key]; }, 0);
        cap =
          "<p>Tallying every call made while computing <code>C(4,2)</code> this way: <code>" +
          total +
          "</code> calls in total -- exactly <code>2×6−1</code>, matching the <code>2×C(n,k)−1</code> identity -- for an answer built from just <code>8</code> distinct subproblems. <code>C(2,1)</code> alone gets recomputed <code>" +
          counts["2,1"] +
          "</code> times. That waste compounds fast: by <code>C(12,6)</code> it's already past <code>1,800</code> calls to fill in what the triangle's DP fill reaches in <code>91</code> table entries, no repeats at all.</p>";
        stage = eq(rows);
        break;
      }
    }
    root.querySelector(".caption").innerHTML = cap;
    root.querySelector(".stage").innerHTML = stage;
  }

  function initPascalWalk() {
    var root = document.getElementById("pascalw-widget");
    if (!root) return;
    // Fixed example, same as the Fibonacci walkthrough's reasoning: C(4,2)'s
    // call tree is small enough to tally by hand and still makes the
    // redundancy obvious, so there's no "New numbers" control here either.
    makeStepper(root, TITLES, render);
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initPascalWalk();
  });
})();
