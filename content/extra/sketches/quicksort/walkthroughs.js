// Step-by-step walkthroughs for the redesigned Quicksort article. These are
// deliberately coarse, narrative widgets (a handful of named "macro steps"
// per pivot strategy) -- NOT the same thing as the fine-grained, one-step-
// per-comparison p5.js simulation embedded lower on the page (sketch.js).
// Each widget below derives every number it shows from actually running
// the real algorithm on the current sample array, the same discipline the
// p5 sketch follows, just narrated at a coarser grain.
//
// Six independent widgets, each self-contained:
//   #pw-widget   -- Partitioning, step by step (Lomuto scan)
//   #lfw-widget  -- Choosing the pivot: last/first element
//   #rw-widget   -- Choosing the pivot: random
//   #m3w-widget  -- Choosing the pivot: sample median (of 3)
//   #momw-widget -- Choosing the pivot: median of medians
//   #dfw-widget  -- Handling duplicates: three-way (Dutch flag) partition
// plus one non-stepper widget:
//   #rt-tree     -- the median-of-medians recursion tree (group-size toggle)

(function () {
  "use strict";

  // ---- shared helpers ----

  function shuffleDistinct(count, max) {
    var pool = [],
      i,
      j,
      t;
    for (i = 1; i <= max; i++) pool.push(i);
    for (i = pool.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, count);
  }

  function asc(a, b) {
    return a - b;
  }

  function cell(v, cls) {
    return '<span class="cell' + (cls ? " " + cls : "") + '">' + v + "</span>";
  }

  function flatRow(vals, clsFn) {
    return (
      '<div class="flat">' +
      vals
        .map(function (v, i) {
          return cell(v, clsFn ? clsFn(v, i) : "");
        })
        .join("") +
      "</div>"
    );
  }

  // makeStepper()/wireNewNumbers() now live in the shared extra/js/stepper.js
  // (loaded for every freeform article -- see theme/templates/article.html),
  // so every widget below just calls them as globals.

  // ---- Lomuto partition, shared by the partitioning + last/first widgets ----

  function lomutoTrace(arr) {
    var a = arr.slice(),
      n = a.length,
      pivot = a[n - 1],
      i = 0,
      trace = [];
    for (var j = 0; j < n - 1; j++) {
      var doSwap = a[j] <= pivot;
      var cmpVal = a[j];
      if (doSwap) {
        var t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      trace.push({ j: j, iBefore: i, doSwap: doSwap, cmpVal: cmpVal, arrAfter: a.slice() });
      if (doSwap) i++;
    }
    var arrBefore = a.slice();
    var t2 = a[i];
    a[i] = a[n - 1];
    a[n - 1] = t2;
    trace.push({ final: true, i: i, arrBefore: arrBefore, arrAfter: a.slice() });
    return { steps: trace, pivot: pivot, result: a, pivotIndex: i };
  }

  // idx classification for a mid-scan (or post-scan) snapshot: [0, iBound)
  // is confirmed <= pivot, [iBound, jBound) is confirmed > pivot, the rest
  // (besides the pivot itself, at the last index) is still unknown.
  function classify3way(vals, iBound, jBound) {
    var n = vals.length;
    return function (v, idx) {
      if (idx === n - 1) return "piv";
      if (idx < iBound) return "lo";
      if (idx < jBound) return "hi";
      return "unk";
    };
  }

  // ---- Dutch-flag (3-way) partition, shared by #dfw-widget ----

  // Dijkstra's three-way partition: sweep [mid..high] once, sending each
  // element to one of three regions relative to pivotVal instead of two.
  // low/mid/high are captured *before* this step's mutation, matching
  // lomutoTrace's convention, so a caption can say "a[mid] was v" while
  // arrAfter already reflects the swap.
  function dutchFlagTrace(arr, pivotVal) {
    var a = arr.slice(),
      n = a.length,
      low = 0,
      mid = 0,
      high = n - 1,
      trace = [];
    while (mid <= high) {
      var midBefore = mid,
        lowBefore = low,
        highBefore = high,
        v = a[mid],
        t;
      if (v < pivotVal) {
        t = a[low];
        a[low] = a[mid];
        a[mid] = t;
        trace.push({ action: "lt", mid: midBefore, low: lowBefore, high: highBefore, v: v, arrAfter: a.slice() });
        low++;
        mid++;
      } else if (v > pivotVal) {
        t = a[mid];
        a[mid] = a[high];
        a[high] = t;
        trace.push({ action: "gt", mid: midBefore, low: lowBefore, high: highBefore, v: v, arrAfter: a.slice() });
        high--;
      } else {
        trace.push({ action: "eq", mid: midBefore, low: lowBefore, high: highBefore, v: v, arrAfter: a.slice() });
        mid++;
      }
    }
    return { steps: trace, pivot: pivotVal, result: a.slice(), low: low, high: high };
  }

  // Cell classification for a snapshot mid-sweep: [0, low) is < pivot,
  // [low, mid) is == pivot (already final), [mid, high] is unclassified,
  // (high, n) is > pivot.
  function classifyDutch(n, low, mid, high) {
    return function (v, idx) {
      if (idx < low) return "lo";
      if (idx < mid) return "med";
      if (idx <= high) return "unk";
      return "hi";
    };
  }

  // ---- #pw-widget: Partitioning, step by step ----

  function initPartitionWalk() {
    var root = document.getElementById("pw-widget");
    if (!root) return;
    var arr = [],
      T;

    function newArr() {
      arr = shuffleDistinct(9, 60);
      T = lomutoTrace(arr);
    }

    var TITLES = [
      "The setup",
      "Scanning left to right",
      "A comparison that swaps",
      "A comparison that stays",
      "Placing the pivot",
      "Done: partitioned",
    ];

    function render(step) {
      var cap = "",
        stage = "";
      var n = arr.length;
      switch (step) {
        case 0:
          cap =
            "<h3>The setup</h3><p>Partition rearranges one range around a pivot so everything &le; the pivot ends up to its left, everything &gt; it ends up to its right &mdash; and the pivot itself lands in its final sorted position, all in one O(n) left-to-right scan. Here the pivot is simply the last element, " +
            arr[n - 1] +
            ".</p>";
          stage = flatRow(arr, function (v, idx) {
            return idx === n - 1 ? "piv" : "";
          });
          break;
        case 1: {
          var mid = T.steps[Math.floor((n - 1) / 2)];
          var iAfter = mid.iBefore + (mid.doSwap ? 1 : 0);
          cap =
            "<h3>Scanning left to right</h3><p>A boundary index i counts how many elements so far are known to be &le; the pivot; a scan index j checks one more element at a time. Partway through: everything before i is confirmed &le; " +
            T.pivot +
            " (teal), everything from i up to j is confirmed &gt; " +
            T.pivot +
            " (plum), and everything after j is still unknown (gray).</p>";
          stage = flatRow(mid.arrAfter, classify3way(mid.arrAfter, iAfter, mid.j + 1));
          break;
        }
        case 2: {
          var swapStep = T.steps.find(function (s) {
            return !s.final && s.doSwap;
          });
          if (swapStep) {
            cap =
              "<h3>A comparison that swaps</h3><p>a[" +
              swapStep.j +
              "] = " +
              swapStep.cmpVal +
              " is &le; " +
              T.pivot +
              ", so it swaps into position i, and the boundary i moves one step right.</p>";
            stage = flatRow(swapStep.arrAfter, classify3way(swapStep.arrAfter, swapStep.iBefore + 1, swapStep.j + 1));
          } else {
            cap = "<h3>A comparison that swaps</h3><p>(This sample never needed one before the final step &mdash; try New numbers.)</p>";
            stage = flatRow(arr);
          }
          break;
        }
        case 3: {
          var stayStep = T.steps.find(function (s) {
            return !s.final && !s.doSwap;
          });
          if (stayStep) {
            cap =
              "<h3>A comparison that stays</h3><p>a[" +
              stayStep.j +
              "] = " +
              stayStep.cmpVal +
              " is &gt; " +
              T.pivot +
              ", so nothing moves &mdash; j simply advances, and that element stays on the &gt; side, waiting behind the boundary.</p>";
            stage = flatRow(stayStep.arrAfter, classify3way(stayStep.arrAfter, stayStep.iBefore, stayStep.j + 1));
          } else {
            cap = "<h3>A comparison that stays</h3><p>(Every comparison in this sample happened to swap &mdash; try New numbers.)</p>";
            stage = flatRow(arr);
          }
          break;
        }
        case 4: {
          var finalStep = T.steps[T.steps.length - 1];
          cap =
            "<h3>Placing the pivot</h3><p>The scan is done. One last swap moves the pivot from the end into position i &mdash; its final, correct sorted position &mdash; putting everything &le; it to the left and everything &gt; it to the right.</p>";
          stage = flatRow(finalStep.arrBefore, function (v, idx) {
            if (idx === n - 1) return "piv";
            return idx < finalStep.i ? "lo" : "hi";
          });
          break;
        }
        default:
          cap =
            "<h3>Done: partitioned</h3><p>" +
            T.pivot +
            " is now at index " +
            T.pivotIndex +
            ". Quicksort recurses into both sides independently; quickselect keeps only the one side that can still contain the target rank.</p>";
          stage = flatRow(T.result, function (v, idx) {
            if (idx === T.pivotIndex) return "piv";
            return idx < T.pivotIndex ? "lo" : "hi";
          });
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
    render(0);
  }

  // ---- #lfw-widget: choosing the pivot -- last/first element ----

  function initLastFirstWalk() {
    var root = document.getElementById("lfw-widget");
    if (!root) return;
    var arr = [];

    function newArr() {
      arr = shuffleDistinct(9, 60).sort(asc);
    }

    var TITLES = ["The rule", "The trap: sorted input", "Every level, the same trap"];

    function render(step) {
      var cap = "",
        stage = "";
      var n = arr.length;
      switch (step) {
        case 0:
          cap =
            "<h3>The rule</h3><p>Always take the last element as the pivot (or, mirrored, always the first). It costs nothing to find &mdash; no scanning, no sampling &mdash; which is exactly why it is the textbook default.</p>";
          stage = flatRow(arr, function (v, idx) {
            return idx === n - 1 ? "piv" : "";
          });
          break;
        case 1: {
          var T = lomutoTrace(arr);
          cap =
            "<h3>The trap: sorted input</h3><p>On an already-sorted array, the last element is always the maximum. Every other element is &le; it, so the partition splits " +
            (n - 1) +
            " elements to one side and <strong>zero</strong> to the other &mdash; the worst possible split.</p>";
          stage = flatRow(T.result, function (v, idx) {
            return idx === T.pivotIndex ? "piv" : "lo";
          });
          break;
        }
        default:
          cap =
            "<h3>Every level, the same trap</h3><p>Remove the pivot and the remaining n&minus;1 elements are <em>still sorted</em>, so the next recursive call hits the identical trap, and the one after that. The recursion never gets shallower than a straight line:</p>";
          stage = '<div class="eq">T(n)  =  T(n&minus;1) + O(n)  =  <b>&Theta;(n&sup2;)</b></div>';
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
    render(0);
  }

  // ---- #rw-widget: choosing the pivot -- random ----

  function initRandomWalk() {
    var root = document.getElementById("rw-widget");
    if (!root) return;
    var arr = [],
      picks = [];

    function newArr() {
      arr = shuffleDistinct(9, 60);
      picks = [];
      for (var i = 0; i < 4; i++) picks.push(Math.floor(Math.random() * arr.length));
    }

    var TITLES = ["Roll the die", "Good on average"];

    function render(step) {
      var cap = "",
        stage = "";
      if (step === 0) {
        cap =
          "<h3>Roll the die</h3><p>Pick a pivot index uniformly at random, independent of what the data looks like. A sorted array is no more dangerous than a shuffled one &mdash; the algorithm cannot be tricked by input order alone.</p>";
        stage = flatRow(arr, function (v, idx) {
          return idx === picks[0] ? "piv" : "";
        });
      } else {
        cap =
          "<h3>Good on average</h3><p>Four random draws from the same array &mdash; the pivot lands somewhere different almost every time. Averaged across all possible draws, a random pivot lands in the &ldquo;good middle half&rdquo; of the range at least half the time, which is enough to guarantee E[T(n)] = O(n log n). No single unlucky draw can repeat forever, the way sorted input defeats &ldquo;always the last element&rdquo; every single time.</p>";
        stage =
          '<div class="cols">' +
          picks
            .map(function (p, i) {
              return (
                '<div class="col"><div class="cap">draw ' +
                (i + 1) +
                "</div>" +
                flatRow(arr, function (v, idx) {
                  return idx === p ? "piv" : "";
                }) +
                "</div>"
              );
            })
            .join("") +
          "</div>";
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
    render(0);
  }

  // ---- #m3w-widget: choosing the pivot -- sample median (of 3) ----

  function initMedian3Walk() {
    var root = document.getElementById("m3w-widget");
    if (!root) return;
    var arr = [],
      idxs = [],
      sortedSample = [];

    function newArr() {
      arr = shuffleDistinct(9, 60);
      var pool = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i];
        pool[i] = pool[j];
        pool[j] = t;
      }
      idxs = pool.slice(0, 3).sort(asc);
      sortedSample = idxs.map(function (i) {
        return arr[i];
      });
      sortedSample.sort(asc);
    }

    var TITLES = ["Sample three", "Sort just those three", "Take the middle", "Why this helps"];

    function render(step) {
      var cap = "",
        stage = "";
      switch (step) {
        case 0:
          cap =
            "<h3>Sample three</h3><p>Pick three indices at random &mdash; here " +
            idxs.join(", ") +
            " &mdash; and look only at those values: " +
            idxs
              .map(function (i) {
                return arr[i];
              })
              .join(", ") +
            ".</p>";
          stage = flatRow(arr, function (v, i) {
            return idxs.indexOf(i) !== -1 ? "med" : "";
          });
          break;
        case 1:
          cap = "<h3>Sort just those three</h3><p>Three elements sort in constant time &mdash; O(1), regardless of n.</p>";
          stage = flatRow(sortedSample, function () {
            return "med";
          });
          break;
        case 2:
          cap =
            "<h3>Take the middle</h3><p>The middle of the three, " +
            sortedSample[1] +
            ", becomes the pivot &mdash; an estimate of the true median, for the cost of a couple of comparisons.</p>";
          stage = flatRow(sortedSample, function (v, i) {
            return i === 1 ? "piv" : "med";
          });
          break;
        default:
          cap =
            "<h3>Why this helps</h3><p>A sample of three rarely lands on an extreme value, so this dodges the &ldquo;always the max/min&rdquo; trap that defeats last/first element on sorted or reverse-sorted input every time. It is still possible to construct an adversarial input that defeats it &mdash; median-of-3 alone does not <em>guarantee</em> &Theta;(n log n) the way median-of-medians does &mdash; but in practice it is cheap insurance.</p>";
          stage = '<div class="eq">worst case still possible:  &Theta;(n&sup2;)\ntypical case:  &Theta;(n log n)</div>';
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
    render(0);
  }

  // ---- #momw-widget: choosing the pivot -- median of medians ----
  // (Ported from the reference walkthrough: same model, same five build-up
  // steps, stopping at "why x is good" -- the partition itself is already
  // covered by #pw-widget above, so it isn't repeated here.)

  function initMomWalk() {
    var root = document.getElementById("momw-widget");
    if (!root) return;
    var N = 25,
      arr = [];

    function newArr() {
      arr = shuffleDistinct(N, 99);
    }

    function colsHTML(cols, clsFn, capFn) {
      return (
        '<div class="cols">' +
        cols
          .map(function (col, j) {
            return (
              '<div class="col"><div class="cap">' +
              capFn(j) +
              "</div>" +
              col
                .map(function (v, r) {
                  return cell(v, clsFn(j, r));
                })
                .join("") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function model() {
      var groups = [],
        i;
      for (i = 0; i < 5; i++) groups.push(arr.slice(i * 5, i * 5 + 5));
      var sg = groups.map(function (g) {
        return g.slice().sort(asc);
      });
      var meds = sg.map(function (g) {
        return g[2];
      });
      var order = [0, 1, 2, 3, 4].sort(function (a, b) {
        return meds[a] - meds[b];
      });
      var ordered = order.map(function (i) {
        return sg[i];
      });
      var medSorted = order.map(function (i) {
        return meds[i];
      });
      var x = medSorted[2];
      return { groups: groups, sg: sg, ordered: ordered, medSorted: medSorted, x: x };
    }

    var TITLES = ["Input", "Groups of five", "Group medians", "Median of medians", "Why x is good"];

    function render(step) {
      var m = model(),
        cap = "",
        stage = "";
      switch (step) {
        case 0:
          cap =
            "<h3>The input</h3><p>n = 25 numbers. Median of medians finds a pivot guaranteed to split the range well &mdash; without sorting the whole array.</p>";
          stage = flatRow(arr);
          break;
        case 1:
          cap =
            "<h3>Cut into groups of five</h3><p>Read left to right in blocks of five, one block per column: n/5 = 5 groups. This step costs O(n).</p>";
          stage = colsHTML(
            m.groups,
            function () {
              return "";
            },
            function (j) {
              return "group " + (j + 1);
            }
          );
          break;
        case 2:
          cap = "<h3>Sort each group, take its median</h3><p>Sorting five numbers is O(1); doing that n/5 times is still O(n) total.</p>";
          stage = colsHTML(
            m.sg,
            function (j, r) {
              return r === 2 ? "med" : "";
            },
            function (j) {
              return "group " + (j + 1);
            }
          );
          break;
        case 3:
          cap =
            "<h3>Find the median of the medians</h3><p>The five medians are themselves a list of n/5 numbers; their median is x = " +
            m.x +
            ". Columns are now placed left to right by their median.</p>";
          stage =
            '<div class="strip"><span class="rowcap">the medians, sorted</span>' +
            flatRow(m.medSorted, function (v, i) {
              return i === 2 ? "piv" : "med";
            }) +
            "</div>" +
            colsHTML(
              m.ordered,
              function (j, r) {
                return r === 2 ? (j === 2 ? "piv" : "med") : "";
              },
              function (j) {
                return "median " + m.medSorted[j];
              }
            );
          break;
        default:
          cap =
            "<h3>Why x is good</h3><p>Columns are sorted, and the columns themselves are ordered by median, so every cell in the teal block is &le; x and every cell in the plum block is &ge; x &mdash; 9 cells each side here, about 3n/10 in general. That guarantee is what makes x a good pivot.</p>";
          stage =
            colsHTML(
              m.ordered,
              function (j, r) {
                if (j === 2 && r === 2) return "piv";
                if (j <= 2 && r <= 2) return "lo";
                if (j >= 2 && r >= 2) return "hi";
                return "unk";
              },
              function (j) {
                return "median " + m.medSorted[j];
              }
            ) + '<div class="badges"><span class="badge lo">9 cells &le; x</span><span class="badge hi">9 cells &ge; x</span></div>';
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
    render(0);
  }

  // ---- #dfw-widget: handling duplicates with a three-way partition ----

  function initDutchFlagWalk() {
    var root = document.getElementById("dfw-widget");
    if (!root) return;
    var arr = [],
      T,
      pivotVal;

    function newArr() {
      // A small value range over more elements than distinct values
      // guarantees duplicates by the pigeonhole principle -- without
      // them there'd be nothing for a three-way partition to win. Retry
      // (rare) draws where the mode lands at the low or high end of the
      // range, since the widget's four named steps need at least one
      // element on every side of the pivot to have something to show.
      var attempts = 0;
      do {
        arr = [];
        for (var k = 0; k < 12; k++) arr.push(1 + Math.floor(Math.random() * 6));
        var counts = {};
        arr.forEach(function (v) {
          counts[v] = (counts[v] || 0) + 1;
        });
        pivotVal = arr.reduce(function (best, v) {
          return counts[v] > counts[best] ? v : best;
        }, arr[0]);
        attempts++;
      } while (
        attempts < 30 &&
        !(arr.some(function (v) { return v < pivotVal; }) && arr.some(function (v) { return v > pivotVal; }))
      );
      T = dutchFlagTrace(arr, pivotVal);
    }

    var TITLES = ["The setup", "Less than pivot", "Equal to pivot", "Greater than pivot", "Done: three regions"];

    function render(step) {
      var cap = "",
        stage = "";
      var n = arr.length;
      switch (step) {
        case 0:
          cap =
            "<h3>The setup</h3><p>Pick a pivot value that already repeats -- <code>" +
            pivotVal +
            "</code> here -- and classify every element against it in one left-to-right pass with three pointers: <code>low</code>, <code>mid</code> and <code>high</code>. Everything starts unclassified.</p>";
          stage = flatRow(arr, function (v) {
            return v === pivotVal ? "med" : "";
          });
          break;
        case 1: {
          var s = T.steps.find(function (x) {
            return x.action === "lt";
          });
          if (s) {
            cap =
              "<h3>Less than pivot</h3><p>a[" +
              s.mid +
              "] = <code>" +
              s.v +
              "</code> is less than <code>" +
              pivotVal +
              "</code>, so swap it down to a[" +
              s.low +
              "] and advance both <code>low</code> and <code>mid</code>.</p>";
            stage = flatRow(s.arrAfter, classifyDutch(n, s.low + 1, s.mid + 1, s.high));
          }
          break;
        }
        case 2: {
          var s2 = T.steps.find(function (x) {
            return x.action === "eq";
          });
          if (s2) {
            cap =
              "<h3>Equal to pivot</h3><p>a[" +
              s2.mid +
              "] = <code>" +
              s2.v +
              "</code> already equals <code>" +
              pivotVal +
              "</code>, so it's already in the middle region -- just advance <code>mid</code>.</p>";
            stage = flatRow(s2.arrAfter, classifyDutch(n, s2.low, s2.mid + 1, s2.high));
          }
          break;
        }
        case 3: {
          var s3 = T.steps.find(function (x) {
            return x.action === "gt";
          });
          if (s3) {
            cap =
              "<h3>Greater than pivot</h3><p>a[" +
              s3.mid +
              "] = <code>" +
              s3.v +
              "</code> is greater than <code>" +
              pivotVal +
              "</code>, so swap it with a[" +
              s3.high +
              "] and shrink <code>high</code>. <code>mid</code> stays put -- the element just swapped in from the right hasn't been checked yet.</p>";
            stage = flatRow(s3.arrAfter, classifyDutch(n, s3.low, s3.mid, s3.high - 1));
          }
          break;
        }
        case 4: {
          var eqCount = T.high - T.low + 1;
          cap =
            "<h3>Done: three regions</h3><p>One pass, three regions, no extra recursion: <code>" +
            T.low +
            "</code> element(s) below <code>" +
            pivotVal +
            "</code> (teal), <code>" +
            eqCount +
            "</code> equal to it (amber) already in final position, and <code>" +
            (n - T.high - 1) +
            "</code> above it (plum). A plain two-way partition would have sorted right through that middle block for nothing.</p>";
          stage = flatRow(T.result, classifyDutch(n, T.low, T.high + 1, T.high));
          break;
        }
      }
      root.querySelector(".caption").innerHTML = cap;
      root.querySelector(".stage").innerHTML = stage;
    }

    newArr();
    var stepper = makeStepper(root, TITLES, render);
    wireNewNumbers(root, stepper, newArr);
  }

  // ---- #rt-tree: the median-of-medians recursion tree (ported as-is) ----

  function initRecursionTree() {
    var treeEl = document.getElementById("rt-tree");
    if (!treeEl) return;
    var readoutEl = document.getElementById("rt-readout");
    var gselEl = document.getElementById("rt-gsel");
    var lvdownEl = document.getElementById("rt-lvdown");
    var lvupEl = document.getElementById("rt-lvup");
    var replayEl = document.getElementById("rt-replay");

    var g = 5,
      shown = 4,
      timer = null;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    }
    function frac(p, q) {
      var d = gcd(p, q);
      return p / d + "/" + q / d;
    }
    function fmt(f) {
      if (f === 1) return "n";
      var s = (f >= 0.1 ? f.toFixed(2) : f.toFixed(3)).replace(/0+$/, "").replace(/\.$/, "");
      return s + "n";
    }
    function buildTree(gs) {
      var a = 1 / gs,
        b = (3 * gs - 1) / (4 * gs),
        lv = [[1]],
        L;
      for (L = 1; L < 4; L++) {
        var cur = [];
        lv[L - 1].forEach(function (f) {
          cur.push(f * a);
          cur.push(f * b);
        });
        lv.push(cur);
      }
      return { lv: lv, a: a, b: b, r: a + b };
    }

    function renderTree(animate) {
      var T = buildTree(g),
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
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" role="img" aria-label="Recursion tree for median of medians with groups of ' + g + '">';
      s += '<text x="' + cx0 + '" y="18" class="svg-h">work at this level</text>';
      for (var L = 0; L < shown; L++) {
        var n = T.lv[L].length,
          y = rowY(L);
        var isNew = animate && L === shown - 1 && L > 0;
        s += '<g class="' + (isNew ? "enter" : "") + '">';
        s += '<text x="4" y="' + (y + 4) + '" class="lvl-t">level ' + L + "</text>";
        T.lv[L].forEach(function (f, i) {
          var cx = tx0 + (i + 0.5) * tw / n,
            kind = L === 0 ? "root" : i % 2 === 0 ? "med" : "kept";
          if (L > 0) {
            var pcx = tx0 + (Math.floor(i / 2) + 0.5) * tw / (n / 2),
              py = rowY(L - 1) + nodeH / 2;
            s += '<line x1="' + pcx + '" y1="' + py + '" x2="' + cx + '" y2="' + (y - nodeH / 2) + '" class="edge ' + kind + '"/>';
          }
          s += '<rect x="' + (cx - nodeW / 2) + '" y="' + (y - nodeH / 2) + '" width="' + nodeW + '" height="' + nodeH + '" rx="6" class="node ' + kind + '"/>';
          s += '<text x="' + cx + '" y="' + (y + 4.5) + '" text-anchor="middle" class="node-t">' + fmt(f) + "</text>";
        });
        var cost = Math.pow(T.r, L);
        s += '<rect x="' + cx0 + '" y="' + (y - 9) + '" width="' + cost * 150 + '" height="18" rx="3" class="costbar"/>';
        s += '<text x="' + cx0 + '" y="' + (y + 26) + '" class="cost-t">' + cost.toFixed(2) + " an</text>";
        s += "</g>";
      }
      if (shown === 4) {
        s += '<text x="' + (tx0 + tw / 2) + '" y="' + (rowY(3) + 62) + '" text-anchor="middle" class="lvl-t">and so on, until the subproblems reach constant size</text>';
      }
      s += "</svg>";
      treeEl.innerHTML = s;

      var keptFrac = frac(3 * g - 1, 4 * g),
        sumFrac = frac(3 * (g + 1), 4 * g),
        r = T.r,
        txt;
      txt =
        "<p>With groups of " +
        g +
        ", the left child is n/" +
        g +
        " (the group medians) and the right child is at most " +
        keptFrac +
        " n. The right one comes from counting: about half of the n/" +
        g +
        " groups have a median at least x, and each such group has " +
        (g + 1) / 2 +
        " elements at least x, so at least " +
        frac(g + 1, 4 * g) +
        " n elements are on the discarded side. The two fractions sum to " +
        sumFrac +
        ".</p>";
      if (Math.abs(r - 1) < 1e-9) {
        txt +=
          "<p><strong>The sum is exactly 1.</strong> Every level costs the full an, and there are about log n levels, so the total is &Theta;(n log n). This is why groups of three do not give a linear algorithm.</p>";
      } else {
        txt +=
          "<p><strong>The sum is below 1.</strong> Each level costs " +
          sumFrac +
          " of the level above, so the total is an (1 + r + r&sup2; + ...) = an / (1 - r) = " +
          (1 / (1 - r)).toFixed(1) +
          " an, which is linear.</p>";
      }
      readoutEl.innerHTML = txt;
      lvdownEl.disabled = shown <= 1;
      lvupEl.disabled = shown >= 4;
    }

    [3, 5, 7, 9].forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = v;
      b.setAttribute("data-g", v);
      b.setAttribute("aria-pressed", v === g ? "true" : "false");
      gselEl.appendChild(b);
    });
    gselEl.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-g]");
      if (!b) return;
      g = parseInt(b.getAttribute("data-g"), 10);
      Array.prototype.forEach.call(gselEl.querySelectorAll("button"), function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      renderTree(false);
    });
    lvupEl.addEventListener("click", function () {
      clearInterval(timer);
      if (shown < 4) {
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
        shown = 4;
        renderTree(false);
        return;
      }
      shown = 1;
      renderTree(false);
      timer = setInterval(function () {
        if (shown >= 4) {
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
  // article -- see theme/templates/article.html. Nothing in this file
  // measures a widget's container size on init, and the p5 sketch below
  // uses a fixed-pixel createCanvas(), so it's safe for every widget here
  // to exist inside an initially-hidden panel.

  document.addEventListener("DOMContentLoaded", function () {
    initPartitionWalk();
    initLastFirstWalk();
    initRandomWalk();
    initMedian3Walk();
    initMomWalk();
    initDutchFlagWalk();
    initRecursionTree();
  });
})();
