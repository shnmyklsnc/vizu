Title: Finding the Minimum and Maximum
Category: Algorithms
Date: 2026-09-29
Summary: Scanning once for both the minimum and maximum costs 2n-2 comparisons -- pairing elements up first, or splitting the array and combining two comparisons at a time, gets there in about 3n/2 instead, and Pohl proved in 1972 that's as few as any algorithm can do.
Tags: algorithms, divide-and-conquer, comparisons, lower-bounds
Slug: min-max
Thumbnail: extra/sketches/min-max/thumb.svg
Script: extra/sketches/min-max/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Proved optimal by</span>
<span class="byline-name">Ira Pohl</span>
</div>
<p class="byline-meta">The divide-and-conquer algorithm below is a
straightforward extension of the split-recurse-combine pattern already
used by <a href="../mergesort/">mergesort</a> and
<a href="../closest-pair/">closest pair of points</a>. What's genuinely
Pohl's contribution is the exact count: he showed
<code>&#8968;3n/2&#8969; &minus; 2</code> comparisons both suffice and are
necessary -- no comparison-based algorithm can find the min and max
together in fewer -- in <cite>&ldquo;A Sorting Problem and Its
Complexity,&rdquo; Communications of the ACM</cite>, volume 15, 1972.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive</span><span class="cx-value">2n &minus; 2</span></div>
<div class="cx-item"><span class="cx-label">This page</span><span class="cx-value">&#8968;3n/2&#8969; &minus; 2</span></div>
<div class="cx-item"><span class="cx-label">Optimal</span><span class="cx-value">Yes</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Finding the minimum and maximum sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Two comparisons per element, or three per pair</h2>
<p>The obvious way to track both the minimum and the maximum while scanning
an array is to check every new element against both: is it smaller than
the running min? Is it bigger than the running max? Two comparisons per
element, <code>2(n &minus; 1)</code> in total after seeding both from the
first element. It works, but it's wasteful in a specific way: those two
checks are independent, and for most elements only one of them can
possibly come out true.</p>

<div class="wpanel" id="mmw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New numbers</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<p>That one extra comparison -- pitting the two new elements against each
other before checking either against the running min or max -- is the
entire trick, and it applies just as well recursively as it does in a
straight scan:</p>

<h3>Divide and conquer</h3>
<p>Split the range in half, find the (min, max) pair of each half by the
same process, then combine with exactly 2 comparisons: the smaller of the
two mins is the overall min, the larger of the two maxes is the overall
max. The recursion bottoms out at a single element (trivially both its own
min and max, 0 comparisons) or a pair (1 comparison settles both). This is
the version the Try it tab's &ldquo;Divide and conquer&rdquo; mode runs.</p>

<h3>Paired scan</h3>
<p>The same saving without any recursion: walk the array two elements at a
time. Compare the pair to each other first (1 comparison), then compare
only the smaller one against the running min and only the larger one
against the running max (2 more comparisons) -- 3 comparisons per pair
instead of 4. An odd-length array just seeds the running min and max from
a single leftover element first, for free, so everything else still comes
in pairs. This is the &ldquo;Paired scan&rdquo; mode.</p>

<p>Both variants make exactly the same trade and land on exactly the same
total. Neither one's comparison count depends on what order the data comes
in -- unlike quicksort or mergesort, there's no data-dependent branching
here at all, so the count depends only on <code>n</code>.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why 3n/2, not 2n</h2>
<p>The divide-and-conquer version's recurrence, with <code>T(1) = 0</code>
and <code>T(2) = 1</code> as base cases:</p>
<div class="eq">T(n) = 2T(n/2) + 2</div>
<p>This looks like mergesort's recurrence with the combine cost changed
from <code>O(n)</code> to a flat <code>O(1)</code> -- just 2 comparisons,
no matter how big the two halves are. That single change flips which
master theorem case applies: with <code>a = 2</code>, <code>b = 2</code>,
and <code>f(n) = &Theta;(1) = &Theta;(n<sup>0</sup>)</code>, the combine
work is <em>polynomially smaller</em> than
<code>n<sup>log<sub>b</sub>a</sup> = n</code> -- master theorem case 1,
same case as Karatsuba's two variants, and the opposite of mergesort's and
closest pair's case 2. Case 1 means the leaves dominate: almost all the
work happens at the bottom of the recursion tree, not in combining at the
top.</p>

<p>Solving it exactly, by induction on powers of 2. Base case:
<code>T(2) = 1 = 3(2)/2 &minus; 2</code>. Inductive step, assuming
<code>T(n/2) = 3(n/2)/2 &minus; 2</code>:</p>
<div class="eq">T(n)  =  2 &middot; T(n/2) + 2
     =  2(3n/4 &minus; 2) + 2
     =  3n/2 &minus; 4 + 2
     =  3n/2 &minus; 2</div>
<p>For <code>n</code> not a power of 2, splitting at the floor and ceiling
of <code>n/2</code> still comes out to exactly
<code>&#8968;3n/2&#8969; &minus; 2</code> -- the same count the paired scan
reaches by a completely different route (no recursion, just a running
tally), which is itself good evidence that 3n/2 isn't an artifact of one
particular way of organizing the comparisons.</p>

<h3>Why you can't do better</h3>
<p>Pohl's proof that <code>&#8968;3n/2&#8969; &minus; 2</code> is also a
<em>lower</em> bound -- not just what these two algorithms happen to
achieve -- runs roughly like this. Classify every element by what its
comparisons have shown so far: never compared; only ever the smaller side
of a comparison (still a possible min, ruled out as the max); only ever
the larger side (still a possible max, ruled out as the min); or both at
some point (ruled out as either). To finish, every element except the true
min must at some point be the larger side of some comparison, and every
element except the true max must at some point be the smaller side of
some comparison -- <code>2n &minus; 2</code> of these &ldquo;rulings&rdquo;
are unavoidable, and a comparison between two never-yet-compared elements
is the only kind that produces two rulings at once. There are at most
<code>&#8968;n/2&#8969;</code> such comparisons available (every other
comparison touches at least one already-ruled element, and produces at
most one new ruling), which is exactly where the <code>3n/2</code> comes
from. The full accounting -- including why ties at the edges push the
bound to a ceiling rather than a clean fraction -- is in Pohl's paper.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Switch between &ldquo;Divide and conquer&rdquo; and &ldquo;Paired
scan&rdquo; from the panel's Mode dropdown -- same 3-per-pair saving,
reached recursively or in one straight pass. Try any of the three data
presets and watch the comparison count on the status line: it won't move,
because neither variant ever branches on the data itself.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Ira Pohl, &ldquo;A Sorting Problem and Its
Complexity,&rdquo; Communications of the ACM, vol. 15, 1972; CLRS Section
9.1; and the CMSC 244 divide-and-conquer slides. In the walkthrough above,
numbers are freshly randomized each time, and every number shown is
computed from that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/min-max/walkthroughs.js"></script>
