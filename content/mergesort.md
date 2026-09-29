Title: Mergesort
Category: Algorithms
Date: 2026-09-29
Summary: Split exactly in half, recurse, then merge two sorted runs back together in one linear pass -- and because the split never gambles, the running time barely moves no matter what order the input starts in.
Tags: algorithms, divide-and-conquer, sorting, merging
Slug: mergesort
Thumbnail: extra/sketches/mergesort/thumb.svg
Script: extra/sketches/mergesort/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">John von Neumann</span>
</div>
<p class="byline-meta">Von Neumann is credited with inventing mergesort in
1945. A full description and analysis of the bottom-up (iterative) version
-- the one below that runs without recursion -- appeared three years later
in <cite>&ldquo;Planning and Coding of Problems for an Electronic Computing
Instrument,&rdquo; Institute for Advanced Study</cite>, the report he
co-authored with Herman Goldstine in 1947&ndash;1948.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Time</span><span class="cx-value">O(n log n)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(n)</span></div>
<div class="cx-item"><span class="cx-label">Stable</span><span class="cx-value">Yes</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Mergesort sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>The one move: merge two sorted runs</h2>
<p>Quicksort does its work at the split -- partitioning is where the effort
and the risk both live, and once the pivot settles, the two halves need no
further attention. Mergesort is the mirror image. The split costs nothing:
cut the range at its midpoint, no comparisons, no choices, nothing that can
go badly. All the real work happens afterward, at the <em>combine</em> step,
merging two halves that recursion has already sorted.</p>

<p>Merging itself is one simple, repeated move: look at the front of each
run -- the smallest not-yet-used element in each -- and take whichever is
smaller into the output. That's it. Because each run is already sorted,
neither front can ever secretly hide something smaller further back, so one
comparison per step is always enough.</p>

<div class="wpanel" id="msw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New runs</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<p>Recursion supplies the sorted runs to merge in the first place: split
<code>[lo..hi]</code> at its midpoint, sort each half by the exact same
process, and the base case is a run of one element, which is sorted simply
by being alone. Ties break toward the left run's element -- a small
decision with a real consequence: it's what makes mergesort <em>stable</em>,
meaning two equal elements never swap places relative to each other, no
matter how deep the recursion. Quicksort's Lomuto partition makes no such
promise.</p>

<p>There's also a second way to reach the exact same merges without any
recursion at all: instead of splitting top-down, sweep the array bottom-up
in passes, merging every adjacent pair of size-1 runs into size-2 runs, then
every pair of size-2 runs into size-4 runs, and so on, doubling each pass
until one run covers the whole array. Same merge step, same total work, no
call stack -- this is the version the Try it tab's &ldquo;Bottom-up&rdquo;
mode runs, and it's the version Goldstine and von Neumann actually worked
out on paper first.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Splitting in half, every time</h2>
<p>Merging two runs of combined size <code>k</code> is <code>O(k)</code>
work -- one comparison-or-copy per element, no more. Sorting the two halves
first is where the recursion is, and both halves are always exactly
<code>n/2</code>, never lopsided the way an unlucky quicksort partition can
be:</p>
<div class="eq">T(n) = 2T(n/2) + O(n)</div>
<p>This is the same recurrence, worked out to the same case, as
<a href="../closest-pair/">Closest Pair of Points</a>'s split-and-check
step: <code>a = 2</code> subproblems, each <code>1/b = 1/2</code> the size,
and combine work <code>f(n) = O(n)</code> that lands exactly on
<code>n<sup>log<sub>b</sub>a</sup> = n<sup>log<sub>2</sub>2</sup> = n</code>
-- master theorem case 2, straight to <code>T(n) = &Theta;(n log n)</code>,
no substitution proof required. Contrast that with quicksort's
median-of-medians recurrence, <code>T(n) &le; T(n/5) + T(7n/10) + O(n)</code>: two
<em>differently</em> sized subproblems, which the master theorem can't
touch at all -- see quicksort's own Recurrence tab for what proving that one
by hand actually takes. Splitting evenly is what buys mergesort the
shortcut.</p>

<p>Two equivalent ways to count the same total:</p>

<h3>Top-down: a tree with O(n) work per level</h3>
<p>Draw the recursion as a tree. The root call merges after both halves
return, doing <code>O(n)</code> work; its two children each merge
<code>n/2</code> elements, <code>O(n/2)</code> work apiece, <code>O(n)</code>
combined; the next level down is four calls at <code>n/4</code> each, again
<code>O(n)</code> combined -- every level costs <code>O(n)</code> in total,
because the sizes at each level always add back up to <code>n</code>.
Halving <code>n</code> down to 1 takes <code>log&#8322; n</code> levels, so:</p>
<div class="eq">T(n)  =  O(n) work/level &times; log&#8322;n levels  =  O(n log n)</div>

<h3>Bottom-up: a fixed number of passes, each touching every element once</h3>
<p>The iterative version makes the same count without a tree at all. Run
width starts at 1 and doubles every pass -- 1, 2, 4, 8, &hellip; -- so it
takes exactly <code>&#8968;log&#8322;n&#8969;</code> passes to reach a run
covering the whole array. Within any one pass, the merges are disjoint and
their sizes add up to <code>n</code>, so each pass is <code>O(n)</code> work
regardless of how many separate merges it's split into:</p>
<div class="eq">T(n)  =  O(n) work/pass &times; &#8968;log&#8322;n&#8969; passes  =  O(n log n)</div>
<p>Same arithmetic, same answer -- the passes are just the tree's levels,
visited in the opposite order (smallest runs first, instead of largest
range first).</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Switch between top-down (recursive) and bottom-up (iterative) from the
panel's Mode dropdown -- same merges either way, just reached in a different
order. Try the &ldquo;Worst case (sorted)&rdquo; preset and compare the
comparison count against quicksort's: mergesort barely notices which order
the input started in, because the split never depends on the data.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Knuth, <cite>The Art of Computer Programming, Vol.
3</cite> (for the 1945 attribution), Goldstine &amp; von Neumann,
&ldquo;Planning and Coding of Problems for an Electronic Computing
Instrument&rdquo; (1947&ndash;1948), CLRS Chapter 2, and the CMSC 244
divide-and-conquer slides. In the walkthrough above, runs are freshly
randomized each time, and every number shown comes from actually merging
that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/mergesort/walkthroughs.js"></script>
