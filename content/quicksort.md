Title: Quicksort
Category: Algorithms
Date: 2026-09-28
Summary: Partition around a pivot, then recurse -- and the one choice (which pivot?) that decides whether that recursion is balanced or a straight line.
Tags: algorithms, divide-and-conquer, sorting, partitioning
Slug: quicksort
Thumbnail: extra/sketches/quicksort/thumb.svg
Script: extra/sketches/quicksort/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">C. A. R. Hoare</span>
</div>
<p class="byline-meta">While working on a machine-translation project at
Moscow State University in 1959, Hoare needed a fast way to sort Russian
words for a dictionary lookup. He published the result as <cite>&ldquo;Algorithm
64: Quicksort,&rdquo; Communications of the ACM</cite>, July 1961, with a
fuller analysis in <cite>The Computer Journal</cite> the following year.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Best</span><span class="cx-value">O(n log n)</span></div>
<div class="cx-item"><span class="cx-label">Average</span><span class="cx-value">O(n log n)</span></div>
<div class="cx-item"><span class="cx-label">Worst</span><span class="cx-value">O(n&sup2;)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(log n)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Quicksort sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Partitioning, step by step</h2>
<p>This is the one move every pivot strategy below shares. Lomuto's scheme
keeps a boundary index <code>i</code> (how much of the range is confirmed
&le; the pivot so far) and a scan index <code>j</code> that checks one more
element at a time, left to right, swapping an element behind the boundary
whenever it belongs there.</p>

<div class="wpanel" id="pw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New numbers</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="legend">
<span><i class="sw piv"></i>pivot</span>
<span><i class="sw lo"></i>confirmed &le; pivot</span>
<span><i class="sw hi"></i>confirmed &gt; pivot</span>
<span><i class="sw unk"></i>not yet looked at</span>
</div>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h2>Choosing the pivot</h2>
<p>Partition itself is always <code>O(n)</code>, whatever the pivot turns out
to be. What changes is how <em>even</em> the split is -- and that alone
decides whether the recursion is a balanced tree of depth <code>log n</code>,
or a straight line of depth <code>n</code>. Four ways of choosing, from free
to guaranteed.</p>

<h3>Last element or first element</h3>
<div class="wpanel" id="lfw-widget">
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

<h3>Random</h3>
<div class="wpanel" id="rw-widget">
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

<h3>Sample median (of 3)</h3>
<div class="wpanel" id="m3w-widget">
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

<h3>Median of medians</h3>
<p>The first three strategies all <em>hope</em> for a good split. Median of
medians <em>guarantees</em> one, in <code>O(n)</code>, without ever sorting
the whole range -- proved in the <em>Recurrence</em> tab.</p>
<div class="wpanel" id="momw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New numbers</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="legend">
<span><i class="sw med"></i>a group's median</span>
<span><i class="sw piv"></i>median of the medians (x)</span>
<span><i class="sw lo"></i>known &le; x</span>
<span><i class="sw hi"></i>known &ge; x</span>
<span><i class="sw unk"></i>could be either</span>
</div>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h2>Handling duplicates: three-way partitioning</h2>
<p>Lomuto's scan above puts every element &le; the pivot on one side and
everything else on the other -- but "&le;" bundles two different cases
together. When many elements equal the pivot, they all still get compared
and shuffled through the same two-way split, even though none of them need
to move again. Edsger Dijkstra's <em>Dutch national flag</em> problem asks
for a single pass that carves out three regions instead of two -- less
than, equal to, and greater than the pivot -- using three pointers,
<code>low</code>, <code>mid</code> and <code>high</code>, so the equal
region lands in its final place immediately and is never touched again.</p>

<div class="wpanel" id="dfw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New numbers</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="legend">
<span><i class="sw lo"></i>&lt; pivot</span>
<span><i class="sw med"></i>= pivot</span>
<span><i class="sw hi"></i>&gt; pivot</span>
<span><i class="sw unk"></i>not yet classified</span>
</div>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why the pivot choice matters</h2>
<p>Read off the worst case for each strategy, assuming an adversarial (or
just unlucky) input:</p>
<div class="eq">last / first element:    T(n) = T(n&minus;1)     + O(n)  =  &Theta;(n&sup2;)
random (average case):  E[T(n)] = 2T(n/2)   + O(n)  =  O(n log n)
sample median of 3:     still &Theta;(n&sup2;) possible, rare in practice
median of medians:      T(n) &le; T(n/5) + T(7n/10) + O(n)  =  <b>O(n)</b></div>
<p>The first three all reduce to "usually fine, occasionally terrible."
Median of medians is the only one worth actually proving, because its
recurrence has two <em>differently sized</em> subproblems -- the master
theorem doesn't apply, so the bound has to be earned directly.</p>

<h3>Proving it: median of medians is O(n)</h3>

<h4>Recursion tree</h4>
<p>Group size <code>g = 5</code> sends <code>n/5</code> elements into the
"find the median of the medians" call and at most <code>7n/10</code> into
the "keep this side of the partition" call. Toggle the group size below to
see why five is the smallest choice that works, and add levels to watch the
cost shrink geometrically.</p>

<div class="wpanel">
<div class="controls">
<span class="seg" id="rt-gsel" role="group" aria-label="Group size"><span class="lbl">Group size</span></span>
<span class="seg">
<button class="btn" id="rt-lvdown" type="button">Remove level</button>
<button class="btn" id="rt-lvup" type="button">Add level</button>
<button class="btn primary" id="rt-replay" type="button">Replay</button>
</span>
</div>
<div class="legend">
<span><i class="sw med"></i>call on the group medians</span>
<span><i class="sw hi"></i>call on the side we keep</span>
</div>
<div class="scroll"><div id="rt-tree"></div></div>
<div class="readout" id="rt-readout"></div>
</div>

<p>Call the work to scan a level's elements and combine the results
<code>an</code> -- a constant <code>a</code> (comparisons per element) times
<code>n</code> (how many elements are left at that level). Level 0 costs
<code>an</code>. Level 1 costs <code>an(1/5 + 7/10)</code>, which is
<code>9/10</code> of level 0. Every level costs <code>9/10</code> of the
level above it, so the total is a geometric series:</p>
<div class="eq">T(n)  &le;  an (1 + 9/10 + (9/10)&sup2; + ...)  =  <b>10 an</b>  =  O(n)</div>

<h4>Substitution</h4>
<p>Claim: <code>T(n) &le; cn</code> for some constant <code>c</code>. Assume
<code>T(k) &le; ck</code> for every <code>k &lt; n</code>, then push the
assumption through the recurrence.</p>
<div class="eq">T(n)  &le;  c(n/5) + c(7n/10) + an
       =  (9/10) cn + an
       =  cn - (cn/10 - an)
       &le;  cn          whenever c &ge; 10a</div>
<p>Choose <code>c</code> at least <code>10a</code> and large enough to cover
the base cases. By induction, <code>T(n) = O(n)</code>.</p>

<h4>With floors and ceilings</h4>
<p>Discarding the group that contains <code>x</code>, and the possibly
incomplete last group, costs a few extra elements. The exact recurrence is
<code>T(n) &le; T(&lceil;n/5&rceil;) + T(7n/10 + 6) + an</code> for
<code>n &ge; 140</code>.</p>
<div class="eq">T(n)  &le;  c&lceil;n/5&rceil; + c(7n/10 + 6) + an
       &le;  cn + (an - c(n/10 - 7))
       &le;  cn          when c &ge; 20a and n &ge; 140</div>
<p>The constants are uglier but the argument is unchanged. <code>n &ge; 140</code>
gives <code>n/(n &minus; 70) &le; 2</code>, which is where <code>20a</code>
comes from.</p>

<h4>Why groups of five</h4>
<p>The two fractions above must sum to less than 1. Try <code>g = 3</code>
in the tree: the fractions sum to exactly 1, every level costs the same,
and the total becomes <code>&Theta;(n log n)</code> instead -- no better
than random. Five is the smallest odd group size whose sum comes in below
1.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>All five strategies, both quicksort and quickselect, on any array you
type in -- stepped one comparison and swap at a time, exactly as the
algorithm runs, rather than the narrated macro-steps in the other tabs.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: CLRS, Chapter 7 (Quicksort) and Chapter 9 (Medians
and Order Statistics), and the CMSC 244 divide-and-conquer slides. In the
walkthroughs above, sample arrays are freshly randomized each time, and
every number shown is computed from actually running the algorithm on
that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/quicksort/walkthroughs.js"></script>
