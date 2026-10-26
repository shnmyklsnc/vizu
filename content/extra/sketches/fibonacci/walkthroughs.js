// Step-by-step walkthrough for the Fibonacci: Recursion vs Dynamic
// Programming article.
//
//   #fibw-widget -- naive recursion computing F(5) by hand, tracking
//                   exactly which smaller Fibonacci numbers get
//                   recomputed and how many times, before memoization or
//                   bottom-up ever enter the picture.

(function () {
  "use strict";

  var TITLES = ["F(5), the recursive way", "F(5) needs F(4) and F(3)", "F(4) needs F(3) again", "F(3) alone gets computed twice", "The full tally"];

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  // Counts how many times naive recursion would call F(k) while
  // computing F(5), for every k from 0 to 5 -- computed for real, not
  // hard-coded, so if the reader changes anything here the numbers below
  // would still be honest (they can't change it, but the arithmetic is
  // still genuinely done rather than typed in as literals).
  function countCalls(n) {
    var counts = {};
    function rec(k) {
      counts[k] = (counts[k] || 0) + 1;
      if (k > 1) {
        rec(k - 1);
        rec(k - 2);
      }
    }
    rec(n);
    return counts;
  }

  function render(step) {
    var root = document.getElementById("fibw-widget");
    var counts = countCalls(5);
    var cap, stage;
    switch (step) {
      case 0: {
        cap =
          "<p>The recurrence <code>F(n) = F(n−1) + F(n−2)</code> translates directly into code: to get <code>F(5)</code>, call <code>F(4)</code> and <code>F(3)</code>, add the results. No memory of anything computed along the way.</p>";
        stage = eq(["F(5) = F(4) + F(3)"]);
        break;
      }
      case 1: {
        cap = "<p>To get <code>F(4)</code>, the same rule applies again: <code>F(4) = F(3) + F(2)</code>. So does <code>F(3)</code> on the right: <code>F(3) = F(2) + F(1)</code>.</p>";
        stage = eq(["F(5) = F(4) + F(3)", "     = (F(3) + F(2)) + (F(2) + F(1))"]);
        break;
      }
      case 2: {
        cap =
          "<p>Notice <code>F(3)</code> already appears once, on the left. And expanding <code>F(4)</code>'s own call to <code>F(3)</code> means computing it <em>again</em>, completely from scratch -- naive recursion has no way to know it's already about to do this work a second time.</p>";
        stage = eq(["F(4) = F(3) + F(2)   ← this F(3) is a brand new call", "F(5)'s own right-hand branch is ALSO F(3)   ← so is this one"]);
        break;
      }
      case 3: {
        cap =
          "<p>Both copies of <code>F(3)</code> now separately expand into <code>F(2) + F(1)</code>, and each of those <code>F(2)</code>s expands again into <code>F(1) + F(0)</code>. Every one of these branches is real, separate work -- nothing here is being reused.</p>";
        stage = eq(["F(3) (copy 1) = F(2) + F(1)", "F(3) (copy 2) = F(2) + F(1)", "each F(2) above further expands into F(1) + F(0)"]);
        break;
      }
      case 4: {
        var rows = [];
        for (var k = 5; k >= 0; k--) {
          rows.push("F(" + k + ") is called " + counts[k] + " time" + (counts[k] === 1 ? "" : "s"));
        }
        var total = Object.keys(counts).reduce(function (s, k) { return s + counts[k]; }, 0);
        cap =
          "<p>Tallying every call made while computing <code>F(5)</code> this way: <code>" +
          total +
          "</code> calls in total for an answer that only needed <code>6</code> distinct values (<code>F(0)</code> through <code>F(5)</code>). <code>F(2)</code> alone gets recomputed <code>" +
          counts[2] +
          "</code> times. That waste compounds -- by <code>F(18)</code> it's already past <code>8,000</code> calls for <code>19</code> distinct values.</p>";
        stage = eq(rows);
        break;
      }
    }
    root.querySelector(".caption").innerHTML = cap;
    root.querySelector(".stage").innerHTML = stage;
  }

  function initFibWalk() {
    var root = document.getElementById("fibw-widget");
    if (!root) return;
    // This widget has no randomized sample -- F(5)'s call tree is fixed
    // and exhaustively countable, which is the whole point (it's small
    // enough to tally by hand and still makes the redundancy obvious).
    // No "New numbers" control is wired up, matching that.
    makeStepper(root, TITLES, render);
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initFibWalk();
  });
})();
