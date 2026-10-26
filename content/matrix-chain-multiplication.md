Title: Matrix Chain Multiplication
Category: Algorithms
Date: 2026-09-29
Summary: Multiplying A1A2...An always gives the same answer no matter how it's parenthesized -- but the arithmetic cost of getting there can differ by orders of magnitude. An interval DP table finds the cheapest order in O(n&sup3;), instead of trying all exponentially many groupings.
Tags: algorithms, dynamic-programming, matrix-multiplication, interval-dp
Slug: matrix-chain-multiplication
Thumbnail: extra/sketches/matrix-chain/thumb.svg
Script: extra/sketches/matrix-chain/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">First polynomial-time algorithm by</span>
<span class="byline-name">S. S. Godbole</span>
</div>
<p class="byline-meta">The problem itself -- and the fact that a bad
parenthesization can cost asymptotically more than an optimal one -- was
studied earlier (Chandra, 1975, showed a poor order can need
&Omega;(F<sub>opt</sub><sup>3</sup>) work), but it was Godbole who first gave
a polynomial-time way to find the <em>best</em> order, in
&ldquo;On Efficient Computation of Matrix Chain Products,&rdquo;
<cite>IEEE Transactions on Computers</cite>, C-22(9), 1973 -- the same
O(n&sup3;) dynamic-programming table shown below. Hu &amp; Shing later
(1982&ndash;84) brought it down to O(n log n) by reducing the problem to
polygon triangulation.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">All orderings</span><span class="cx-value">&Omega;(4<sup>n</sup>/n<sup>1.5</sup>)</span></div>
<div class="cx-item"><span class="cx-label">DP table</span><span class="cx-value">O(n&sup3;)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(n&sup2;)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Matrix chain multiplication sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>The parentheses are free to move -- the cost isn't</h2>
<p>Matrix multiplication is associative: <code>A1(A2A3)</code> and
<code>(A1A2)A3</code> land on exactly the same matrix. But each side does a
different amount of scalar arithmetic to get there, because multiplying an
<code>a&times;b</code> matrix by a <code>b&times;c</code> matrix costs
<code>a&times;b&times;c</code> scalar multiplications and leaves an
<code>a&times;c</code> result -- and that result's shape changes what the
<em>next</em> multiplication costs. Chain enough matrices together with the
right (or wrong) dimensions, and the gap between the best and worst
parenthesization gets enormous.</p>

<div class="wpanel" id="mcw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New dimensions</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h3>Why not just try every order?</h3>
<p>Because there are too many. The number of ways to fully parenthesize a
chain of <code>n</code> matrices is the <code>(n&minus;1)</code>th Catalan
number -- <code>1, 2, 5, 14, 42, 132&hellip;</code> for
<code>n = 2, 3, 4, 5, 6, 7</code> -- which grows exponentially
(<code>&Omega;(4<sup>n</sup>/n<sup>1.5</sup>)</code>). Brute force is only
practical for a handful of matrices. The trick, as with every dynamic-
programming problem on this site, is that the sub-chains overlap: the best
way to multiply <code>A2..A5</code> gets reused no matter whether it ends up
nested inside <code>A1(A2..A5)</code> or <code>(A1..A5)A6</code> elsewhere in
the search, so it only ever needs to be solved once.</p>

<h3>Filling the table by chain length</h3>
<p>The Try it tab's table holds <code>m[i][j]</code>, the cheapest cost to
multiply the sub-chain <code>Ai..Aj</code>, for every <code>i &le; j</code>.
A single matrix costs nothing (<code>m[i][i] = 0</code>) -- that's the
diagonal, filled in immediately. Every other cell is filled by trying <em>
every</em> split point <code>k</code> between <code>i</code> and
<code>j</code>: pay whatever <code>Ai..Ak</code> and
<code>A(k+1)..Aj</code> already cost (both already known, from a shorter
sub-chain computed earlier), plus the cost of multiplying those two results
together, and keep the cheapest split. Cells are filled by increasing chain
length, so by the time any cell needs an answer from a shorter sub-chain,
that sub-chain is already sitting in the table.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>The recurrence</h2>
<p>With matrices <code>A1..An</code>, dimensions
<code>p<sub>0</sub>, p<sub>1</sub>, &hellip;, p<sub>n</sub></code> (so
<code>A<sub>k</sub></code> is <code>p<sub>k&minus;1</sub> &times;
p<sub>k</sub></code>):</p>
<div class="eq">m[i][i] = 0
m[i][j] = min over i &le; k &lt; j of
            m[i][k] + m[k+1][j] + p<sub>i&minus;1</sub>&middot;p<sub>k</sub>&middot;p<sub>j</sub></div>
<p>This is a different shape of dynamic programming than anywhere else on
this site so far. Fibonacci's subproblems are single indices; edit
distance's and LCS's are pairs of <em>prefixes</em>, filled corner to
corner. Here every subproblem is an <em>interval</em> <code>[i, j]</code> of
the original chain, and solving it means searching over every way to split
that interval in two -- so the table isn't filled row by row, but diagonal
by diagonal, in order of increasing interval length.</p>

<h3>Why it's O(n&sup3;)</h3>
<p>There are <code>O(n&sup2;)</code> distinct intervals <code>[i, j]</code>
-- roughly <code>n&sup2;/2</code>, since only <code>i &le; j</code> matters.
Each one searches over up to <code>O(n)</code> split points to find its
minimum. <code>O(n&sup2;)</code> subproblems &times; <code>O(n)</code> work
apiece = <code>O(n&sup3;)</code> total, with <code>O(n&sup2;)</code> space to
hold the table. Compare that to trying every parenthesization directly,
which costs a Catalan number's worth of work:</p>
<div class="eq">n = 5     C(4)  = 14
n = 10    C(9)  = 4,862
n = 15    C(14) = 2,674,440
n = 20    C(19) = 1,767,263,190</div>
<p>The DP table turns an exponential search into a cubic one by noticing
that most of those exponentially many parenthesizations recompute the exact
same sub-chain costs over and over -- the same overlapping-subproblems trick
behind <a href="../fibonacci/">memoized Fibonacci</a>, just applied over
intervals instead of single values.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>The table fills diagonal by diagonal (shortest sub-chains first). Orange
marks the cell currently being decided; purple marks the two shorter
sub-chains it's combining while every split point is tried; green marks a
finished cell. Once the whole table is full, the cells actually used by the
optimal parenthesization light up gold, and the status line spells out the
winning order in full -- alongside what a naive left-to-right order would
have cost for comparison.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: S. S. Godbole, &ldquo;On Efficient Computation of
Matrix Chain Products,&rdquo; <cite>IEEE Transactions on Computers</cite>
C-22(9), 1973; A. K. Chandra, &ldquo;Computing Matrix Chain Products in
Near-Optimal Time,&rdquo; 1975; T. C. Hu &amp; M. T. Shing,
&ldquo;Computation of Matrix Chain Products,&rdquo; <cite>SIAM Journal on
Computing</cite>, 1982&ndash;1984; CLRS Chapter 15; and the CMSC 244
dynamic-programming slides.</p>

<script src="../../extra/sketches/matrix-chain/walkthroughs.js"></script>
