// Step-by-step walkthrough for the redesigned Edit Distance article, which
// now also covers Longest Common Subsequence as a fourth variant (LCS fills
// the exact same table, in the exact same order, just with a different
// recurrence at every cell -- see the article's own note on why it was
// folded in here rather than kept as its own page).
//
// One widget:
//   #edw-widget -- one table, two recurrences: runs both edit distance and
//                  LCS, cell by cell, on the same pair of random strings,
//                  so the "same shape, different arithmetic" claim is
//                  something you can watch happen rather than take on faith.

(function () {
  "use strict";

  var TITLES = ["The setup", "A shared letter", "No shared letter", "Two different totals"];
  var ALPHABET = "ABCD";
  var WORD_LEN = 5;

  function randWord(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }

  // Runs the real edit-distance recurrence and the real LCS recurrence side
  // by side, over the same table, so every number in the widget comes from
  // actually filling both tables -- nothing here is hand-picked.
  function twoRecurrences(a, b) {
    var w = a.length,
      h = b.length;
    var ed = new Array(w * h).fill(0);
    var lcs = new Array(w * h).fill(0);
    var matchIdx = null,
      mismatchIdx = null;

    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) {
        var idx = j * w + i;
        var diagEd = i > 0 && j > 0 ? ed[(j - 1) * w + (i - 1)] : Math.max(i, j);
        var diagLcs = i > 0 && j > 0 ? lcs[(j - 1) * w + (i - 1)] : 0;

        if (a[i] === b[j]) {
          ed[idx] = diagEd;
          lcs[idx] = diagLcs + 1;
          if (matchIdx === null && i > 0 && j > 0) matchIdx = { i: i, j: j, idx: idx, diagEd: diagEd, diagLcs: diagLcs };
        } else {
          var edLeft = i > 0 ? ed[j * w + (i - 1)] : j + 1;
          var edTop = j > 0 ? ed[(j - 1) * w + i] : i + 1;
          ed[idx] = 1 + Math.min(diagEd, edLeft, edTop);

          var lcsLeft = i > 0 ? lcs[j * w + (i - 1)] : 0;
          var lcsTop = j > 0 ? lcs[(j - 1) * w + i] : 0;
          lcs[idx] = Math.max(lcsLeft, lcsTop);

          if (mismatchIdx === null && i > 0 && j > 0) {
            mismatchIdx = { i: i, j: j, idx: idx, diagEd: diagEd, edLeft: edLeft, edTop: edTop, lcsLeft: lcsLeft, lcsTop: lcsTop };
          }
        }
      }
    }

    return {
      a: a,
      b: b,
      w: w,
      h: h,
      ed: ed,
      lcs: lcs,
      matchIdx: matchIdx,
      mismatchIdx: mismatchIdx,
      finalEd: w > 0 && h > 0 ? ed[w * h - 1] : Math.max(w, h),
      finalLcs: w > 0 && h > 0 ? lcs[w * h - 1] : 0,
    };
  }

  function eq(lines) {
    return '<div class="eq">' + lines.join("\n") + "</div>";
  }

  function initEditDistanceWalk() {
    var root = document.getElementById("edw-widget");
    if (!root) return;

    var T;

    function newWords() {
      var tries = 0;
      do {
        T = twoRecurrences(randWord(WORD_LEN), randWord(WORD_LEN));
        tries++;
      } while (tries < 30 && (!T.matchIdx || !T.mismatchIdx));
    }

    function render(step) {
      var cap, stage;
      switch (step) {
        case 0: {
          cap =
            "<p>Take two random strings, <code>A = " +
            T.a +
            "</code> and <code>B = " +
            T.b +
            "</code>. Both edit distance and LCS build a <code>" +
            T.w +
            "&times;" +
            T.h +
            "</code> table, one row per letter of <code>B</code>, one column per letter of <code>A</code>, filled top-to-bottom, left-to-right -- exactly the same table, exactly the same order.</p>";
          stage = eq(["A = " + T.a, "B = " + T.b, "table size: " + T.w + " &times; " + T.h]);
          break;
        }
        case 1: {
          var m = T.matchIdx;
          cap =
            "<p>At <code>A[" +
            m.i +
            "] = " +
            T.a[m.i] +
            "</code> and <code>B[" +
            m.j +
            "] = " +
            T.b[m.j] +
            "</code>, the letters match. Edit distance costs nothing for a match -- it just copies the diagonal. LCS gets to extend a shared subsequence -- it adds one to the diagonal.</p>";
          stage = eq(["edit distance: copy diagonal " + m.diagEd + " &rarr; " + m.diagEd, "lcs:           diagonal " + m.diagLcs + " + 1 &rarr; " + (m.diagLcs + 1)]);
          break;
        }
        case 2: {
          var x = T.mismatchIdx;
          cap =
            "<p>At <code>A[" +
            x.i +
            "] = " +
            T.a[x.i] +
            "</code> and <code>B[" +
            x.j +
            "] = " +
            T.b[x.j] +
            "</code>, the letters differ. Now the two recurrences genuinely disagree about what to do with the same three neighbors: edit distance takes the <em>cheapest</em> neighbor and pays one more for the mismatch; LCS just takes the <em>longest</em> of the two neighbors that don't require a match, and pays nothing.</p>";
          stage = eq([
            "edit distance: 1 + min(diag=" + x.diagEd + ", left=" + x.edLeft + ", top=" + x.edTop + ") = " + (1 + Math.min(x.diagEd, x.edLeft, x.edTop)),
            "lcs:           max(left=" + x.lcsLeft + ", top=" + x.lcsTop + ") = " + Math.max(x.lcsLeft, x.lcsTop),
          ]);
          break;
        }
        case 3: {
          cap =
            "<p>Carry that out over the whole table and the bottom-right cell holds the answer: <code>" +
            T.a +
            "</code> is <code>" +
            T.finalEd +
            "</code> edits away from <code>" +
            T.b +
            "</code>, and they share a common subsequence of length <code>" +
            T.finalLcs +
            "</code>. Same table, same fill order, two different questions -- and that's why one page covers both.</p>";
          stage = eq(["edit distance(A, B) = " + T.finalEd, "lcs length(A, B)    = " + T.finalLcs]);
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newWords();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newWords);
  }

  // Page-level section tabs (Learn / Recurrence / Try it) are handled by
  // the shared extra/js/page-tabs.js, loaded once for every freeform
  // article -- see theme/templates/article.html.

  document.addEventListener("DOMContentLoaded", function () {
    initEditDistanceWalk();
  });
})();
