// Step-by-step walkthrough for the Freivalds' Algorithm article.
//
//   #frw-widget -- one random 3x3 example, end to end: A, B and a C that
//                  is secretly either the real product or a perturbed
//                  one (50/50 each time), a random 0/1 vector r, the two
//                  matrix-vector products, and the comparison -- with the
//                  ground truth revealed only at the end. Nothing here is
//                  scripted: every run actually does the arithmetic.

(function () {
  "use strict";

  var TITLES = ["The setup", "Pick a random vector", "Compute A(Br)", "Compute Cr", "Compare -- and reveal the truth"];

  function randEntry() {
    return 1 + Math.floor(Math.random() * 9);
  }

  function randMatrix(n) {
    var m = [];
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < n; j++) row.push(randEntry());
      m.push(row);
    }
    return m;
  }

  function multiply(X, Y) {
    var rows = X.length,
      inner = Y.length,
      cols = Y[0].length;
    var out = [];
    for (var i = 0; i < rows; i++) {
      var row = [];
      for (var j = 0; j < cols; j++) {
        var s = 0;
        for (var k = 0; k < inner; k++) s += X[i][k] * Y[k][j];
        row.push(s);
      }
      out.push(row);
    }
    return out;
  }

  function randVector01(n) {
    var v = [];
    for (var i = 0; i < n; i++) v.push([Math.random() < 0.5 ? 0 : 1]);
    return v;
  }

  function vecEqual(u, v) {
    for (var i = 0; i < u.length; i++) if (u[i][0] !== v[i][0]) return false;
    return true;
  }

  function fmtMat(m) {
    return m.map(function (row) { return "[" + row.join(", ") + "]"; }).join(" ");
  }
  function fmtVec(v) {
    return "[" + v.map(function (row) { return row[0]; }).join(", ") + "]ᵀ";
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function newRound() {
    var n = 3;
    var A = randMatrix(n);
    var B = randMatrix(n);
    var trueC = multiply(A, B);
    var isCorrect = Math.random() < 0.5;
    var C;
    if (isCorrect) {
      C = trueC;
    } else {
      C = trueC.map(function (row) { return row.slice(); });
      var i = Math.floor(Math.random() * n),
        j = Math.floor(Math.random() * n);
      var delta = 0;
      while (delta === 0) delta = Math.floor(Math.random() * 11) - 5;
      C[i][j] += delta;
    }
    var r = randVector01(n);
    var Br = multiply(B, r);
    var ABr = multiply(A, Br);
    var Cr = multiply(C, r);
    var matched = vecEqual(ABr, Cr);
    return { n: n, A: A, B: B, C: C, isCorrect: isCorrect, r: r, Br: Br, ABr: ABr, Cr: Cr, matched: matched };
  }

  function initFreivaldsWalk() {
    var root = document.getElementById("frw-widget");
    if (!root) return;

    var T;

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Here's <code>A</code>, <code>B</code>, and a candidate <code>C</code> -- maybe it's really <code>A×B</code>, maybe someone (or something) got it wrong. Checking the honest way means computing <code>A×B</code> in full and comparing, which costs exactly as much as the multiplication itself. Freivalds' algorithm checks without ever multiplying the matrices together.</p>";
          stage = eq(["A = " + fmtMat(T.A), "B = " + fmtMat(T.B), "C = " + fmtMat(T.C) + "   (is this really A×B?)"]);
          break;
        }
        case 1: {
          cap = "<p>Pick a random vector <code>r</code>, each entry independently 0 or 1.</p>";
          stage = eq(["r = " + fmtVec(T.r)]);
          break;
        }
        case 2: {
          cap =
            "<p>Compute <code>Br</code> first, then <code>A(Br)</code> -- two matrix-vector products, each <code>O(n²)</code>, instead of one <code>O(n³)</code> matrix-matrix product.</p>";
          stage = eq(["Br = " + fmtVec(T.Br), "A(Br) = " + fmtVec(T.ABr)]);
          break;
        }
        case 3: {
          cap = "<p>Separately, compute <code>Cr</code> with the very same <code>r</code> -- another <code>O(n²)</code> matrix-vector product.</p>";
          stage = eq(["Cr = " + fmtVec(T.Cr)]);
          break;
        }
        case 4: {
          var verdict = T.matched ? "“Yes, A×B = C”" : "“No, A×B ≠ C”";
          var truthLabel = T.isCorrect ? "C really was A×B" : "C was actually wrong (one entry was changed)";
          var correctness = T.matched === T.isCorrect ? "the algorithm's answer was correct" : "this was the algorithm's one-sided blind spot -- a false “yes”, which the theorem allows for at most half of all possible r";
          cap =
            "<p>Compare <code>A(Br)</code> against <code>Cr</code>: " +
            (T.matched ? "they match, so the algorithm says " : "they differ, so the algorithm says ") +
            verdict +
            ". The truth this time: <strong>" +
            truthLabel +
            "</strong> -- so " +
            correctness +
            ".</p>";
          stage = eq([
            "A(Br) = " + fmtVec(T.ABr),
            "Cr     = " + fmtVec(T.Cr),
            T.matched ? "equal → “Yes”" : "different → “No”",
          ]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    T = newRound();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, function () {
      T = newRound();
    });
  }

  // Page-level section tabs (Learn / Why it works / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initFreivaldsWalk();
  });
})();
