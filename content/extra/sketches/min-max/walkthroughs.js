// Step-by-step walkthrough for the Finding the Minimum and Maximum article.
//
// One widget:
//   #mmw-widget -- the one saving both variants make: compare a fresh pair
//                  of elements to each other before checking them against
//                  the running min/max, so one of the two checks becomes
//                  unnecessary. Uses a fresh random running min/max and a
//                  fresh random pair each time, and narrates the real
//                  arithmetic (nothing here is hand-scripted).

(function () {
  "use strict";

  var TITLES = ["The naive way: 4 comparisons", "Compare the pair first", "Only the winner can beat the min", "Only the winner can beat the max", "Three instead of four"];

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  // Draws a running min/max and a fresh pair of new elements, all
  // distinct, and works out both the naive and the paired accounting.
  function newRound() {
    var pool = [];
    for (var v = 1; v <= 60; v++) pool.push(v);
    for (var k = pool.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var t = pool[k];
      pool[k] = pool[r];
      pool[r] = t;
    }
    var runningMin = Math.min(pool[0], pool[1]);
    var runningMax = Math.max(pool[0], pool[1]);
    var a = pool[2];
    var b = pool[3];
    var pairSmall = Math.min(a, b);
    var pairLarge = Math.max(a, b);
    var newMin = Math.min(runningMin, pairSmall);
    var newMax = Math.max(runningMax, pairLarge);
    return { runningMin: runningMin, runningMax: runningMax, a: a, b: b, pairSmall: pairSmall, pairLarge: pairLarge, newMin: newMin, newMax: newMax };
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function initMinMaxWalk() {
    var root = document.getElementById("mmw-widget");
    if (!root) return;

    var R;

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Say the running min so far is <code>" +
            R.runningMin +
            "</code> and the running max is <code>" +
            R.runningMax +
            "</code>, and two new elements arrive: <code>" +
            R.a +
            "</code> and <code>" +
            R.b +
            "</code>. Checked separately, that's 4 comparisons -- each new element against the running min, and each against the running max.</p>";
          stage = eq([
            R.a + " vs min(" + R.runningMin + ")   " + R.a + " vs max(" + R.runningMax + ")",
            R.b + " vs min(" + R.runningMin + ")   " + R.b + " vs max(" + R.runningMax + ")",
            "4 comparisons for 2 new elements",
          ]);
          break;
        }
        case 1: {
          cap =
            "<p>Instead, compare the two new elements to <em>each other</em> first: <code>" +
            R.a +
            "</code> vs <code>" +
            R.b +
            "</code>. That's comparison #1, and it already tells us which one -- <code>" +
            R.pairSmall +
            "</code> -- could possibly be small enough to matter, and which one -- <code>" +
            R.pairLarge +
            "</code> -- could possibly be large enough to matter.</p>";
          stage = eq([R.a + " vs " + R.b, "&rarr; smaller: " + R.pairSmall + "   larger: " + R.pairLarge]);
          break;
        }
        case 2: {
          cap =
            "<p>Only the pair's smaller side, <code>" +
            R.pairSmall +
            "</code>, needs checking against the running min <code>" +
            R.runningMin +
            "</code> (comparison #2). The pair's larger side can be skipped entirely: it already lost to <code>" +
            R.pairSmall +
            "</code>, so if <code>" +
            R.pairSmall +
            "</code> isn't smaller than the running min, the larger side certainly isn't either.</p>";
          stage = eq([R.pairSmall + " vs min(" + R.runningMin + ")", "&rarr; new min: " + Math.min(R.runningMin, R.pairSmall)]);
          break;
        }
        case 3: {
          cap =
            "<p>By the same logic, only the pair's larger side, <code>" +
            R.pairLarge +
            "</code>, needs checking against the running max <code>" +
            R.runningMax +
            "</code> (comparison #3). The smaller side already lost to it, so it can't be a new max either.</p>";
          stage = eq([R.pairLarge + " vs max(" + R.runningMax + ")", "&rarr; new max: " + Math.max(R.runningMax, R.pairLarge)]);
          break;
        }
        case 4: {
          cap =
            "<p>Three comparisons handled two new elements: min is now <code>" +
            R.newMin +
            "</code>, max is now <code>" +
            R.newMax +
            "</code> -- the same correct answer the naive 4-comparison version would reach, one comparison cheaper. Do that for every pair in an n-element array and the total drops from <code>2n &minus; 2</code> to about <code>3n/2</code>.</p>";
          stage = eq(["3 comparisons per pair, not 4", "over n elements: about 3n/2, not 2n &minus; 2"]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    R = newRound();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, function () {
      R = newRound();
    });
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initMinMaxWalk();
  });
})();
