Title: Pascal's Triangle: Computing C(n,k)
Category: Algorithms
Date: 2026-09-29
Summary: C(n,k) -- the number of ways to choose k items from n -- obeys the same recurrence as every other overlapping-subproblem: C(n,k) = C(n-1,k-1) + C(n-1,k). Naive recursion recomputes the same subproblem over and over; Pascal's triangle, filled once as a DP table, never does.
Tags: algorithms, dynamic-programming, combinatorics, recurrence-relations
Slug: pascal-triangle
Thumbnail: extra/sketches/pascal-triangle/thumb.svg
Script: extra/sketches/pascal-triangle/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Triangle named in the West after</span>
<span class="byline-name">Blaise Pascal</span>
</div>
<p class="byline-meta">The numbers are far older than Pascal's name for them.
India's Pingala described the underlying counting method -- his
<cite>Chāndaḥ-śāstra</cite>, on Sanskrit poetic meter -- by around 450 BC;
Halayudha's 10th-century commentary on it is the earliest surviving
picture of the triangle itself, called <em>meru-prastāra</em> (&ldquo;the
mountain of jewels&rdquo;). Persia's Omar Khayyám and China's Jia Xian
both studied the same array of coefficients independently in the 11th
century, and Jia Xian's version was popularized a further two centuries
on by Yang Hui, whose name the triangle still carries in China today.
Niccolò Tartaglia published its first six rows in Italy in 1556. What's
specifically Pascal's is his 1654 treatise <cite>Traité du triangle
arithmétique</cite> (published posthumously in 1665), which systematically
worked out the triangle's properties and its connection to the binomial
theorem and to probability -- thorough enough that Western mathematics
adopted his name for it ever since.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive recursion</span><span class="cx-value">&Theta;(C(n,k))</span></div>
<div class="cx-item"><span class="cx-label">Pascal's-triangle DP</span><span class="cx-value">&Theta;(n&sup2;)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Pascal's triangle and C(n,k) sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>One recurrence, two ways to compute it</h2>
<p><code>C(n,k)</code> counts the number of ways to choose <code>k</code>
items out of <code>n</code>, order not mattering. Split on whether a
single fixed item is included or not, and Pascal's rule falls straight
out: the choices that include it are a choice of <code>k&minus;1</code>
more from the remaining <code>n&minus;1</code>; the choices that exclude
it are a choice of all <code>k</code> from those same
<code>n&minus;1</code>.</p>
<div class="eq">C(n, k) = C(n&minus;1, k&minus;1) + C(n&minus;1, k)
C(n, 0) = C(n, n) = 1   (base cases -- choose nothing, or choose everything)</div>
<p>Translate that directly into recursive code and, just like Fibonacci's
<code>F(n) = F(n&minus;1) + F(n&minus;2)</code>, the subproblems
<em>overlap</em> -- computing <code>C(4,2)</code> needs <code>C(2,1)</code>
twice, once down each branch, and neither call knows the other one
exists.</p>

<div class="wpanel" id="pascalw-widget">
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h3>Pascal's triangle: fill it once, read off any cell</h3>
<p>Arrange every <code>C(i,j)</code> for <code>i</code> from
<code>0</code> to <code>n</code> in a triangle, row <code>i</code> holding
<code>i+1</code> entries. The two edges of each row are the base cases,
always <code>1</code>; every interior entry is the sum of the two entries
diagonally above it -- exactly Pascal's rule, just filled forward instead
of recursed backward. Fill the whole triangle once, row by row, and
<code>C(n,k)</code> is sitting right there as one cell, having cost nothing
extra beyond filling in every other cell along the way too.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why naive recursion costs exactly 2&times;C(n,k) &minus; 1</h2>
<p>Let <code>T(n,k)</code> be the number of calls naive recursion makes to
compute <code>C(n,k)</code>. Base cases cost one call each;
otherwise it's one call for the current node plus whatever its two
children cost:</p>
<div class="eq">T(n, 0) = T(n, n) = 1
T(n, k) = 1 + T(n&minus;1, k&minus;1) + T(n&minus;1, k)</div>
<p>This recurrence has exactly the same shape as <code>C(n,k)</code>'s own
-- and it turns out to have exactly the same solution, up to a constant:</p>
<div class="eq">T(n, k) = 2&middot;C(n, k) &minus; 1</div>
<p>Every call either lands on a base case (contributing a <code>+1</code>
that pairs up with another base case's <code>+1</code>) or triggers real
work, and the pairing telescopes out to precisely double the answer, minus
one for the root. That's a much steeper bill than it looks: central
binomial coefficients, <code>k = n/2</code>ish, grow close to
<code>4<sup>n</sup></code>, not the golden ratio's <code>~1.618<sup>n</sup></code>
that Fibonacci's naive recursion pays:</p>
<div class="eq">C(4,2) = 6         naive calls = 11
C(8,4) = 70        naive calls = 139
C(12,6) = 924      naive calls = 1,847
C(16,8) = 12,870   naive calls = 25,739
C(20,10) = 184,756 naive calls = 369,511</div>

<h3>Why Pascal's-triangle DP is &Theta;(n&sup2;)</h3>
<p>Filling the triangle through row <code>n</code> touches
<code>(n+1)(n+2)/2</code> cells total -- a triangular number, so
<code>&Theta;(n&sup2;)</code> -- each one <code>O(1)</code> work (one
addition, reading two already-filled neighbors). No matter which cell
<code>k</code> ultimately picks out, the DP fills the same fixed-size
triangle: computing a huge central value like <code>C(20,10)</code> costs
exactly as much table-filling as computing a tiny corner one like
<code>C(20,1)</code>, a sharp contrast with naive recursion, whose cost
depends entirely on the size of the answer itself. The same &ldquo;doing
strictly less work by never repeating any of it&rdquo; story as every
other DP article on this site, just measured in cells instead of calls.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Naive mode draws the same kind of recursion tree as Fibonacci's,
Karatsuba's and Strassen's sketches -- orange while a call is in progress,
yellow at a base case (an edge of the triangle), purple while combining
two results, green once a call's answer is ready. Pascal's-triangle mode
looks nothing like a tree: the whole triangle up to row <code>n</code>,
filled cell by cell, gray until touched, orange while a cell is being
computed, green once filled, and gold for the one cell that actually
answers <code>C(n,k)</code>. Pick <code>k</code> anywhere from
<code>0</code> to <code>n</code> -- a corner (<code>k=0</code> or
<code>k=n</code>) resolves in naive mode instantly, a central
<code>k</code> makes the naive tree's blowup dramatic, while the triangle
fill costs the same either way.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Blaise Pascal, <cite>Traité du triangle
arithmétique</cite>, written 1654, published 1665; Niccolò Tartaglia's 1556
publication of the triangle's first six rows; Jia Xian's 11th-century
version, popularized in China by Yang Hui in the 13th century (hence
&ldquo;Yang Hui's triangle&rdquo;); Omar Khayyám's independent 11th-century
study in Persia; Pingala's <cite>Chāndaḥ-śāstra</cite> (&asymp;450 BC) and
Halayudha's 10th-century commentary describing <em>meru-prastāra</em>;
CLRS Chapter 15 (Dynamic Programming); and the CMSC 244
divide-and-conquer-into-dynamic-programming slides, which use C(n,k)
alongside Fibonacci as the bridge example.</p>

<script src="../../extra/sketches/pascal-triangle/walkthroughs.js"></script>
