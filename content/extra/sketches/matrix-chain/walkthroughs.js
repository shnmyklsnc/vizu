// Step-by-step walkthrough for the Matrix Chain Multiplication article.
//
//   #mcw-widget -- the smallest case where order actually matters: three
//                  matrices, two possible parenthesizations, computed for
//                  real on a fresh random-dimension example each time.

(function () {
  "use strict";

  var TITLES = [
    "Three matrices, two ways to group them",
    "(A1 A2) A3",
    "A1 (A2 A3)",
    "Same matrices, very different cost",
    "The table just needs to try both",
  ];

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function randomDims() {
    var p = [];
    for (var i = 0; i < 4; i++) p.push(2 + Math.floor(Math.random() * 38));
    return p;
  }

  var current = null;

  function newRound() {
    var p = randomDims();
    var cost1 = p[0] * p[1] * p[2] + p[0] * p[2] * p[3]; // (A1 A2) A3
    var cost2 = p[1] * p[2] * p[3] + p[0] * p[1] * p[3]; // A1 (A2 A3)
    current = { p: p, cost1: cost1, cost2: cost2 };
  }

  function render(step) {
    var root = document.getElementById("mcw-widget");
    var p = current.p;
    var cap, stage;
    switch (step) {
      case 0: {
        cap =
          "<p>Three matrices: <code>A1</code> is <code>" +
          p[0] +
          "×" +
          p[1] +
          "</code>, <code>A2</code> is <code>" +
          p[1] +
          "×" +
          p[2] +
          "</code>, <code>A3</code> is <code>" +
          p[2] +
          "×" +
          p[3] +
          "</code>. The product <code>A1A2A3</code> is fixed either way -- but multiplication is associative, so it can be computed as <code>(A1A2)A3</code> or as <code>A1(A2A3)</code>, and those two orders do different amounts of arithmetic to reach the exact same answer.</p>";
        stage = eq(["A1: " + p[0] + "×" + p[1], "A2: " + p[1] + "×" + p[2], "A3: " + p[2] + "×" + p[3]]);
        break;
      }
      case 1: {
        cap =
          "<p>Group the left pair first. <code>A1A2</code> is a <code>" +
          p[0] +
          "×" +
          p[1] +
          "</code> times a <code>" +
          p[1] +
          "×" +
          p[2] +
          "</code>, costing <code>" +
          p[0] +
          "×" +
          p[1] +
          "×" +
          p[2] +
          "</code> scalar multiplications and producing a <code>" +
          p[0] +
          "×" +
          p[2] +
          "</code> result. Multiplying that by <code>A3</code> (<code>" +
          p[2] +
          "×" +
          p[3] +
          "</code>) costs <code>" +
          p[0] +
          "×" +
          p[2] +
          "×" +
          p[3] +
          "</code> more.</p>";
        stage = eq([
          "(A1A2)A3:",
          "  A1A2   = " + p[0] + "×" + p[1] + "×" + p[2] + " = " + p[0] * p[1] * p[2],
          "  ×A3   = " + p[0] + "×" + p[2] + "×" + p[3] + " = " + p[0] * p[2] * p[3],
          "  total  = " + current.cost1,
        ]);
        break;
      }
      case 2: {
        cap =
          "<p>Group the right pair first instead. <code>A2A3</code> costs <code>" +
          p[1] +
          "×" +
          p[2] +
          "×" +
          p[3] +
          "</code> and produces a <code>" +
          p[1] +
          "×" +
          p[3] +
          "</code> result; multiplying <code>A1</code> by that costs <code>" +
          p[0] +
          "×" +
          p[1] +
          "×" +
          p[3] +
          "</code> more. Same three matrices, same final answer -- different arithmetic entirely.</p>";
        stage = eq([
          "A1(A2A3):",
          "  A2A3   = " + p[1] + "×" + p[2] + "×" + p[3] + " = " + p[1] * p[2] * p[3],
          "  A1×   = " + p[0] + "×" + p[1] + "×" + p[3] + " = " + p[0] * p[1] * p[3],
          "  total  = " + current.cost2,
        ]);
        break;
      }
      case 3: {
        var ratio = (Math.max(current.cost1, current.cost2) / Math.min(current.cost1, current.cost2)).toFixed(2);
        cap =
          "<p><code>(A1A2)A3</code> costs <code>" +
          current.cost1 +
          "</code>; <code>A1(A2A3)</code> costs <code>" +
          current.cost2 +
          "</code> -- a <code>" +
          ratio +
          "×</code> difference, from nothing but where the parentheses go. With more matrices the gap widens fast, and the number of ways to parenthesize a chain of <code>n</code> matrices grows exponentially (it's the Catalan numbers) -- far too many to just try them all past a handful of matrices.</p>";
        stage = eq(["(A1A2)A3 = " + current.cost1, "A1(A2A3) = " + current.cost2, "ratio ≈ " + ratio + "×"]);
        break;
      }
      case 4: {
        var winner = current.cost1 <= current.cost2 ? "(A1A2)A3" : "A1(A2A3)";
        cap =
          "<p>The DP table (Try it tab) does not guess -- for every sub-chain it tries every split point once and keeps the cheapest, building up from single matrices to the whole chain. For length-3 chains that's exactly the two options just computed by hand; for longer chains it's the same idea; scaled up, filling <code>O(n²)</code> cells at <code>O(n)</code> work each. For this example the table would pick <code>" +
          winner +
          "</code>.</p>";
        stage = eq(["winner: " + winner, "cost " + Math.min(current.cost1, current.cost2) + " vs " + Math.max(current.cost1, current.cost2)]);
        break;
      }
    }
    root.querySelector(".caption").innerHTML = cap;
    root.querySelector(".stage").innerHTML = stage;
  }

  function initMcWalk() {
    var root = document.getElementById("mcw-widget");
    if (!root) return;
    newRound();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newRound);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMcWalk();
  });
})();
