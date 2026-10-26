Title: Traveling Salesman Problem
Category: Algorithms
Date: 2026-09-29
Summary: Visit every city once, return home, spend as little as possible. Trying every ordering costs (n-1)! -- Held-Karp's dynamic-programming table and branch-and-bound's pruned search tree both find the exact optimum without ever paying that full price.
Tags: algorithms, dynamic-programming, branch-and-bound, graphs
Slug: tsp
Thumbnail: extra/sketches/tsp/thumb.svg
Script: extra/sketches/tsp/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Dynamic-programming solution independently by</span>
<span class="byline-name">Bellman, and Held &amp; Karp</span>
</div>
<p class="byline-meta">Both published in 1962: Richard Bellman (already
credited on this site for naming <a href="../fibonacci/">dynamic
programming</a> itself, nine years earlier) in &ldquo;Dynamic Programming
Treatment of the Travelling Salesman Problem,&rdquo; <cite>Journal of the
ACM</cite> 9; and, separately, Michael Held &amp; Richard M. Karp in
&ldquo;A Dynamic Programming Approach to Sequencing Problems,&rdquo;
<cite>Journal of SIAM</cite> 10(1) -- the bitmask formulation shown below
now carries their names. Branch-and-bound search for TSP followed shortly
after, most notably J. D. C. Little, K. G. Murty, D. W. Sweeney &amp; C.
Karel's 1963 &ldquo;An Algorithm for the Traveling Salesman Problem,&rdquo;
<cite>Operations Research</cite> 11(6) -- the cheapest-edge lower-bound
style of pruning taught alongside the DP approach in the CMSC 244 slides.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Brute force</span><span class="cx-value">O((n&minus;1)!)</span></div>
<div class="cx-item"><span class="cx-label">Held-Karp DP</span><span class="cx-value">O(2<sup>n</sup>n&sup2;)</span></div>
<div class="cx-item"><span class="cx-label">Branch and bound</span><span class="cx-value">O(n!) worst case</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Traveling salesman problem sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Every ordering, or a smarter search?</h2>
<p>Fix a start city. There are <code>(n&minus;1)!</code> ways to order the
rest into a tour -- for <code>10</code> cities that's already
<code>362,880</code>; for <code>20</code> it's past
<code>10<sup>17</sup></code>. Brute force is exact but useless past a
handful of cities. This page covers two exact algorithms that both avoid
that factorial blowup, in very different ways.</p>

<div class="wpanel" id="tspw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New cities</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h3>Held-Karp: build up from small subsets</h3>
<p>Just like every other dynamic-programming table on this site, the
insight is overlapping subproblems: the cheapest way to visit some subset
of cities and end at a particular one doesn't care what order got built up
to reach it, just its cost -- so once <code>C[S][e]</code> (cheapest way to
start at city 0, visit exactly the cities in <code>S</code>, and end at
<code>e</code>) is known, it never needs recomputing, however many longer
tours end up routing through it.</p>

<h3>Branch and bound: search, but skip what can't win</h3>
<p>The other approach explores partial tours top-down, exactly like brute
force would -- but before expanding a partial tour further, it computes a
cheap-to-compute <em>lower bound</em> on how much finishing it could
possibly cost. If that bound already can't beat the best complete tour
found so far, the entire subtree under that partial tour is skipped,
unexplored -- no ordering it could produce needs to be checked, because
none of them could possibly win.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Held-Karp's recurrence</h2>
<p>With cities <code>0..n&minus;1</code>, city <code>0</code> fixed as the
start, and <code>d(i, j)</code> the distance between cities
<code>i</code> and <code>j</code>:</p>
<div class="eq">C({e}, e) = d(0, e)
C(S, e) = min over j &isin; S \ {e} of  C(S \ {e}, j) + d(j, e)
answer  = min over e of  C(V \ {0}, e) + d(e, 0)</div>
<p>There are <code>2<sup>n&minus;1</sup></code> subsets of the non-start
cities and up to <code>n</code> choices of end city, so
<code>O(2<sup>n</sup>n)</code> table entries; each one searches up to
<code>O(n)</code> predecessors, for <code>O(2<sup>n</sup>n&sup2;)</code>
total time and <code>O(2<sup>n</sup>n)</code> space. Still exponential --
TSP is NP-hard, so no polynomial algorithm is known -- but
<code>2<sup>n</sup>n&sup2;</code> is a dramatically smaller exponential than
<code>(n&minus;1)!</code>: at <code>n = 20</code>, Held-Karp is on the
order of <code>2</code>&times;<code>10<sup>8</sup></code> operations
against brute force's <code>10<sup>17</sup></code>-plus.</p>

<h3>The branch-and-bound lower bound</h3>
<p>For a partial tour ending at city <code>v</code> with unvisited cities
<code>R</code> remaining, this page's bound adds up, for
<code>v</code> and for every city in <code>R</code>, the single cheapest
edge available from that city to anywhere it could still legally connect:</p>
<div class="eq">bound  =  cost so far  +  &sum;<sub>u &isin; R &cup; {v}</sub> cheapest edge out of u</div>
<p>This never overestimates: every one of those <code>|R| + 1</code>
cities needs at least one more edge to complete the tour, and each city's
contribution is a genuine lower bound on whatever edge it actually ends up
using -- so the true remaining cost can never come in under this estimate.
A bound that can underestimate but never overestimate is exactly what makes
pruning safe: any branch this bound rules out truly cannot contain a better
tour, so branch and bound stays exact despite skipping most of the search
space. How much it skips depends entirely on the instance and the order
branches are tried -- the Try it tab's node count makes that concrete for
whatever's currently on screen.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Both variants share the same random city layout (the small inset map
shows city <code>0</code> in orange and the best tour found so far in
gold). In the Held-Karp table, rows are visited subsets grouped by size;
orange marks the cell being decided, purple the predecessor cell it's
reading from, green a finished cell, and gold the cells the optimal tour
actually used. In branch and bound, orange/purple mark the node currently
being visited, a dashed gray circle with an <code>&times;</code> marks a
branch pruned without expanding it further, green marks a complete tour
that didn't improve on the best so far, and gold marks a new best.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Richard Bellman, &ldquo;Dynamic Programming
Treatment of the Travelling Salesman Problem,&rdquo; <cite>Journal of the
ACM</cite> 9, 1962; Michael Held &amp; Richard M. Karp, &ldquo;A Dynamic
Programming Approach to Sequencing Problems,&rdquo; <cite>Journal of the
Society for Industrial and Applied Mathematics</cite> 10(1), 1962; J. D. C.
Little, K. G. Murty, D. W. Sweeney &amp; C. Karel, &ldquo;An Algorithm for
the Traveling Salesman Problem,&rdquo; <cite>Operations Research</cite>,
1963; CLRS Chapter 15 and 34; and the CMSC 244 dynamic-programming and
branch-and-bound slides.</p>

<script src="../../extra/sketches/tsp/walkthroughs.js"></script>
