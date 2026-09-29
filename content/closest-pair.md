Title: Closest Pair of Points
Category: Algorithms
Date: 2026-09-28
Summary: Sort once, split the plane in half, recurse -- then check only a thin strip along the seam, because a packing argument guarantees nothing farther away can matter.
Tags: algorithms, divide-and-conquer, geometry
Slug: closest-pair
Thumbnail: extra/sketches/closest-pair/thumb.svg
Script: extra/sketches/closest-pair/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">Michael Shamos &amp; Dan Hoey</span>
</div>
<p class="byline-meta">Checking every pair of <code>n</code> points costs
<code>O(n&sup2;)</code>, and for years that looked unavoidable. In 1975,
Shamos and Hoey showed a divide-and-conquer split gets there in
<code>O(n log n)</code> instead, published as <cite>&ldquo;Closest-point
problems,&rdquo; Proceedings of the 16th Annual Symposium on Foundations of
Computer Science</cite>.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive</span><span class="cx-value">O(n&sup2;)</span></div>
<div class="cx-item"><span class="cx-label">Divide &amp; conquer</span><span class="cx-value">O(n log n)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(n)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Closest pair sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Splitting the plane</h2>
<p>Given <code>n</code> points, find the two that are closest together. The
same three-part shape as any divide-and-conquer algorithm applies: split the
points into two halves, solve each half on its own, then combine. The only
subtlety is the combine step -- a pair closer than anything found inside
either half might straddle the seam between them, so that seam needs its
own, separate check.</p>

<div class="wpanel" id="cpw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New points</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="legend">
<span><i class="sw lo"></i>left half</span>
<span><i class="sw hi"></i>right half</span>
<span><i class="sw med"></i>inside the strip</span>
<span><i class="sw piv"></i>current best pair</span>
<span><i class="sw unk"></i>not yet split</span>
</div>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h3>Why checking 7 neighbors is enough</h3>
<p>Once a candidate distance <code>d</code> is in hand, cut the strip into
squares of side <code>d/2</code>, stacked along the split line. Two points
in the same square would already be closer than <code>d</code> -- impossible,
since <code>d</code> is the best distance found so far -- so every square
holds at most one point. That makes any run of height <code>d</code> along
the strip cover at most 8 such squares, so at most 8 points. Once the strip
is sorted by <code>y</code>, that means no point needs to be checked against
more than the next 7 below it: anything farther down is already more than
<code>d</code> away in <code>y</code> alone, so it can't possibly be closer.
This is what keeps the combine step <code>O(n)</code> instead of
<code>O(n&sup2;)</code>.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why the strip is enough</h2>
<p>Solving both halves and combining them costs:</p>
<div class="eq">naive:               check all pairs        =  O(n&sup2;)
divide and conquer:  T(n) = 2T(n/2) + O(n)  =  <b>O(n log n)</b></div>
<p>Unlike quicksort's median-of-medians case, both children here are exactly
the same size -- <code>n/2</code> and <code>n/2</code> -- so this is the
"balanced" recurrence the master theorem was built for:
<code>a = 2</code> subproblems, each <code>b = 2</code> times smaller,
combine cost <code>f(n) = &Theta;(n)</code>. Since <code>f(n)</code> matches
<code>n<sup>log<sub>2</sub> 2</sup> = n</code> exactly, this is case 2 of the
theorem, and the answer is <code>&Theta;(n log n)</code> straight away --
no substitution proof required.</p>

<h3>Proving it: the recursion tree</h3>
<p>Toggle levels below to watch the cost <em>not</em> shrink the way
quicksort's median-of-medians tree did. Both children of every node are the
same size, so the work at each level stays exactly the same all the way
down -- that flatness is what turns a sum over <code>log n</code> levels
into <code>n log n</code> instead of just <code>n</code>.</p>

<div class="wpanel">
<div class="controls">
<span class="seg">
<button class="btn" id="cprt-lvdown" type="button">Remove level</button>
<button class="btn" id="cprt-lvup" type="button">Add level</button>
<button class="btn primary" id="cprt-replay" type="button">Replay</button>
</span>
</div>
<div class="legend">
<span><i class="sw lo"></i>a subproblem of size n/2<sup>L</sup></span>
</div>
<div class="scroll"><div id="cprt-tree"></div></div>
<div class="readout" id="cprt-readout"></div>
</div>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>The full recursive algorithm, in 1D, 2D or 3D, animated point by point --
pan and zoom in 2D, rotate in 3D, and step through at your own pace.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Shamos &amp; Hoey (1975), and the CMSC 244
divide-and-conquer slides. In the walkthrough above, points are freshly
randomized each time, and every number shown is computed from actually
running the algorithm on that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/closest-pair/walkthroughs.js"></script>
