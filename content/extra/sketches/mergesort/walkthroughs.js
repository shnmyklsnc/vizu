// Step-by-step walkthrough for the Mergesort article.
//
// One widget:
//   #msw-widget -- the one move mergesort ever makes: merge two runs that
//                  are each already sorted. Picks two small random sorted
//                  runs, actually merges them, and narrates a handful of
//                  moments from that real merge (nothing here is
//                  hand-scripted) -- the full step-by-step trace, for any
//                  array size, lives in the Try it tab.

(function () {
  "use strict";

  var TITLES = ["Two sorted runs", "Compare the fronts", "Same rule again", "One run empties out", "The merged result"];
  var LEFT_LEN = 4;
  var RIGHT_LEN = 4;
  var POOL_MAX = 24;

  function shuffledPool(max) {
    var pool = [];
    for (var v = 1; v <= max; v++) pool.push(v);
    for (var k = pool.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var t = pool[k];
      pool[k] = pool[r];
      pool[r] = t;
    }
    return pool;
  }

  // Runs the real merge -- same rule the Try it tab's simulation runs --
  // over two freshly-drawn sorted runs, and records every comparison so
  // the widget can narrate real ones instead of inventing an example.
  function mergeRuns(left, right) {
    var comparisons = [];
    var merged = [];
    var i = 0,
      j = 0;
    while (i < left.length && j < right.length) {
      var takeLeft = left[i] <= right[j];
      comparisons.push({ leftVal: left[i], rightVal: right[j], takeLeft: takeLeft });
      merged.push(takeLeft ? left[i] : right[j]);
      if (takeLeft) i++;
      else j++;
    }
    var exhausted = i === left.length ? "left" : "right";
    var remaining = i === left.length ? right.slice(j) : left.slice(i);
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    return { left: left, right: right, comparisons: comparisons, merged: merged, exhausted: exhausted, remaining: remaining };
  }

  function newRuns() {
    var T, tries = 0;
    var interesting = false;
    do {
      var pool = shuffledPool(POOL_MAX);
      var chosen = pool.slice(0, LEFT_LEN + RIGHT_LEN);
      var left = chosen.slice(0, LEFT_LEN).sort(function (a, b) { return a - b; });
      var right = chosen.slice(LEFT_LEN, LEFT_LEN + RIGHT_LEN).sort(function (a, b) { return a - b; });
      T = mergeRuns(left, right);
      tries++;
      // Prefer a run where the two sides actually interleave (some
      // comparisons go each way) rather than one side sweeping the other
      // -- a more representative first example.
      var sides = {};
      for (var c = 0; c < T.comparisons.length; c++) sides[T.comparisons[c].takeLeft] = true;
      interesting = Object.keys(sides).length >= 2;
    } while (tries < 20 && !interesting);
    return T;
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function initMergesortWalk() {
    var root = document.getElementById("msw-widget");
    if (!root) return;

    var T;

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Merge only ever looks at two runs that are already individually sorted -- here, a left run and a right run of " +
            T.left.length +
            " items each. (In the full sort, those runs came from smaller merges; the smallest possible run, a single element, is sorted by definition.)</p>";
          stage = eq(["left run:  " + T.left.join(", "), "right run: " + T.right.join(", ")]);
          break;
        }
        case 1: {
          var c0 = T.comparisons[0];
          cap =
            "<p>Compare just the <em>front</em> of each run -- " +
            c0.leftVal +
            " vs " +
            c0.rightVal +
            " -- and move the smaller one into the output. That's the entire rule. It never needs to look any deeper into either run, because each run is already sorted: whatever's behind the front is guaranteed to be no smaller than it.</p>";
          stage = eq([c0.leftVal + (c0.takeLeft ? " &le; " : " &gt; ") + c0.rightVal, "&rarr; take " + (c0.takeLeft ? "left's " + c0.leftVal : "right's " + c0.rightVal)]);
          break;
        }
        case 2: {
          var c1 = T.comparisons.length > 1 ? T.comparisons[1] : T.comparisons[0];
          cap =
            "<p>Same rule, next pair of fronts: " +
            c1.leftVal +
            " vs " +
            c1.rightVal +
            ". Whichever run just gave up an element, its <em>new</em> front slides into view and gets compared next time -- one comparison, one item moved to the output, repeat.</p>";
          stage = eq([c1.leftVal + (c1.takeLeft ? " &le; " : " &gt; ") + c1.rightVal, "&rarr; take " + (c1.takeLeft ? "left's " + c1.leftVal : "right's " + c1.rightVal)]);
          break;
        }
        case 3: {
          cap =
            "<p>Eventually one run runs out -- here it's the " +
            T.exhausted +
            " run, after " +
            T.comparisons.length +
            " comparison" +
            (T.comparisons.length === 1 ? "" : "s") +
            ". The moment that happens, every comparison stops mattering: the other run's " +
            T.remaining.length +
            " leftover item" +
            (T.remaining.length === 1 ? "" : "s") +
            " -- " +
            T.remaining.join(", ") +
            " -- " +
            (T.remaining.length === 1 ? "is" : "are") +
            " already sorted among themselves and already bigger than everything merged so far, so they just get copied straight across.</p>";
          stage = eq(["comparisons so far: " + T.comparisons.length, T.exhausted + " run: empty", "remaining, copied straight across: " + T.remaining.join(", ")]);
          break;
        }
        case 4: {
          cap =
            "<p>Merged: <code>" +
            T.merged.join(", ") +
            "</code>. Every one of the " +
            (T.left.length + T.right.length) +
            " items cost exactly one comparison-or-copy to place -- merging two runs is always O(n) in their combined size, no matter how the two runs happen to interleave.</p>";
          stage = eq(["merged: " + T.merged.join(", ")]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    T = newRuns();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, function () {
      T = newRuns();
    });
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initMergesortWalk();
  });
})();
