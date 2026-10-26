Title: Fibonacci: Recursion vs. Dynamic Programming
Category: Algorithms
Date: 2026-09-29
Summary: One recurrence, F(n) = F(n-1) + F(n-2) -- translate it into code exactly as written and it takes exponential time, because the subproblems overlap. Caching each answer once, or just filling a table bottom-up, turns the same recurrence linear.
Tags: algorithms, recursion, dynamic-programming, recurrence-relations
Slug: fibonacci
Thumbnail: extra/sketches/fibonacci/thumb.svg
Script: extra/sketches/fibonacci/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Dynamic programming named by</span>
<span class="byline-name">Richard Bellman</span>
</div>
<p class="byline-meta">Fibonacci's own recurrence long predates computing
-- known in India by around 450 BC (Pingala), given its familiar
recursive form around 700 AD (Virahanka), and popularized in the West by
Leonardo of Pisa's 1202 <cite>Liber Abaci</cite>. What's specifically
Bellman's is the general technique this page demonstrates: solving a
recurrence by working out its overlapping subproblems only once, which he
named &ldquo;dynamic programming&rdquo; at RAND Corporation in 1953 --
&ldquo;dynamic,&rdquo; in his own words, because it was &ldquo;impossible
to use&hellip; in a pejorative sense,&rdquo; chosen partly to keep the
mathematics palatable to a Secretary of Defense who disliked the word
&ldquo;research.&rdquo; The specific top-down variant below -- caching a
recursive call's result the first time it's computed -- is called
<em>memoization</em>, a term Donald Michie coined separately in 1968.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive</span><span class="cx-value">&Theta;(&phi;<sup>n</sup>)</span></div>
<div class="cx-item"><span class="cx-label">Memoized</span><span class="cx-value">&Theta;(n)</span></div>
<div class="cx-item"><span class="cx-label">Bottom-up</span><span class="cx-value">&Theta;(n)</span></div>
<div class="cx-item"><span class="cx-label">Precedence graph</span><span class="cx-value">&Theta;(n)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Fibonacci recursion and dynamic programming sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>One recurrence, four ways to compute it</h2>
<p><code>F(n) = F(n&minus;1) + F(n&minus;2)</code>, with
<code>F(0) = 0</code> and <code>F(1) = 1</code>. Translate that directly
into recursive code and it looks perfectly reasonable -- but unlike every
divide-and-conquer algorithm elsewhere on this site, its subproblems
<em>overlap</em>. Mergesort's two halves never touch each other again once
split; Karatsuba's three sub-products are all genuinely different
multiplications. Here, computing <code>F(5)</code> needs <code>F(3)</code>
twice -- once directly, once again buried inside <code>F(4)</code>'s own
recursion -- and neither call has any idea the other one exists.</p>

<div class="wpanel" id="fibw-widget">
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<h3>Memoization: cache the first answer</h3>
<p>Keep the exact same recursive structure, but the first time
<code>F(k)</code> is actually worked out, save it. Every later call asking
for that same <code>k</code> -- and per the walkthrough above, there are
plenty -- gets answered instantly from the cache instead of recursing all
over again. The code barely changes; the cost drops from exponential to
linear.</p>

<h3>Bottom-up: skip the recursion entirely</h3>
<p>Once it's clear the only subproblems that matter are
<code>F(0)</code> through <code>F(n)</code>, there's no need to reach them
by recursing downward at all -- just fill a table upward from the base
cases: <code>F[0]</code>, <code>F[1]</code>, then <code>F[2]</code>
through <code>F[n]</code>, each one the sum of the two entries already
sitting right before it. No call stack, no cache to check, just one pass.</p>

<h3>The general recipe: precedence graph, then topological order</h3>
<p>Bottom-up mode above works because it's obvious in advance which order
to fill the table in: left to right. That's not usually obvious -- most
dynamic-programming tables have a more tangled dependency structure than
Fibonacci's. The recipe that always works, whatever the shape: draw an
edge <code>k &rarr; j</code> for every &ldquo;<code>j</code> needs
<code>k</code>&rsquo;s answer first&rdquo; the recurrence implies, which
turns the recurrence into a <em>precedence graph</em> (also called a
dependency DAG). Any order that respects every edge -- a
<em>topological order</em> -- is a safe order to fill the table in, and
<a href="https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm">Kahn's
algorithm</a> finds one mechanically: repeatedly take any node with no
remaining unmet dependencies, &ldquo;compute&rdquo; it, and cross it off
its successors' dependency lists. For Fibonacci, <code>F(j)</code> depends
on exactly <code>F(j&minus;1)</code> and <code>F(j&minus;2)</code>, and
running Kahn's algorithm on that graph always discovers the order
<code>0, 1, 2, &hellip;, n</code> -- which is exactly bottom-up's left-to-right
fill, arrived at without anyone assuming it in advance. The fourth mode
below makes that discovery visible.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why naive recursion is exponential</h2>
<p>The running time of the naive recursive code obeys almost the same
recurrence as the numbers it's computing:</p>
<div class="eq">T(n) = T(n&minus;1) + T(n&minus;2) + O(1)</div>
<p>This is <em>not</em> a shape the master theorem covers -- every other
recurrence on this site shrinks its subproblems by a constant
<em>factor</em> (<code>n/2</code>, <code>n/4</code>); this one shrinks by
a constant <em>amount</em> (<code>n&minus;1</code>, <code>n&minus;2</code>),
the same asymmetry that put quicksort's worst case and median-of-medians'
accounting outside the master theorem too. Solving it directly, by its
characteristic equation <code>x&sup2; = x + 1</code>, gives roots
<code>(1 &plusmn; &radic;5)/2</code> -- and the dominant one is exactly the
golden ratio:</p>
<div class="eq">&phi; = (1 + &radic;5) / 2  &approx;  1.618034...
T(n) = &Theta;(&phi;<sup>n</sup>)</div>
<p>The number of calls really does grow like a power of <code>1.618</code>,
not a coincidence -- it falls out of the identical recurrence shape. The
gap over linear time widens fast:</p>
<div class="eq">n = 10      &phi;<sup>n</sup> &approx; 123
n = 20      &phi;<sup>n</sup> &approx; 15,127
n = 30      &phi;<sup>n</sup> &approx; 1,860,498
n = 40      &phi;<sup>n</sup> &approx; 228,826,127</div>

<h3>Why memoized and bottom-up are both &Theta;(n)</h3>
<p>There are only <code>n + 1</code> <em>distinct</em> subproblems in the
whole recursion -- <code>F(0)</code> through <code>F(n)</code> -- no
matter how many times naive recursion revisits them. Memoization computes
each one exactly once (constant work apiece, given its two dependencies
are already cached) and answers every repeat from the cache instantly, so
the call count is exactly:</p>
<div class="eq">memoized calls  =  2n &minus; 1</div>
<p>-- one real call per distinct value, plus one cache-hit call for every
repeat, and the repeats work out to exactly <code>n &minus; 3</code> of
them. Bottom-up sidesteps the call count altogether: one loop, one pass,
exactly <code>n + 1</code> table entries filled, each <code>O(1)</code>
work. Both land on <code>&Theta;(n)</code> total -- the same asymptotic
answer by two different routes, matching the &ldquo;same shape of work,
wildly different cost&rdquo; pattern <a href="../karatsuba/">Karatsuba</a>
and <a href="../matrix-multiplication/">Strassen</a> demonstrate elsewhere
on this site, just achieved here by not redoing work instead of by doing
less of it algebraically.</p>

<h3>Why the precedence-graph recipe is also &Theta;(n)</h3>
<p>Kahn's algorithm does a constant amount of work per node (dequeue it,
walk its outgoing edges, decrement a counter for each) and a constant
amount of work per edge (one decrement, and a possible enqueue). Fibonacci's
precedence graph has <code>n + 1</code> nodes and at most <code>2n</code>
edges -- two incoming per node, <code>F(j&minus;1) &rarr; F(j)</code> and
<code>F(j&minus;2) &rarr; F(j)</code>, for every <code>j &ge; 2</code> --
so the whole traversal is <code>&Theta;(n)</code>, same as bottom-up. That's
not a coincidence either: for this particular recurrence, Kahn's algorithm
and the bottom-up loop end up doing the identical sequence of work, just
arrived at two different ways -- one by mechanically discovering a valid
order, the other by recognizing it doesn't need to.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Naive and memoized modes draw the same kind of recursion tree as
Karatsuba's and Strassen's sketches -- orange while a call is in progress,
yellow at a base case, purple while combining two results, green once a
call's answer is ready. Memoized mode adds one more color, cyan: a call
that's answered straight from the cache instead of recursing again --
watch how dramatically that prunes the tree compared to naive mode at the
same <code>n</code>. Bottom-up mode looks nothing like a tree at all: a
single row of cells filling left to right, no recursion in sight.
Precedence-graph mode draws that same row of nodes but starts them all
gray, with curved arrows overhead showing every <code>k &rarr; j</code>
dependency; watch nodes turn orange the moment their last dependency
clears (joining the ready queue shown at the bottom of the panel) and
green once Kahn's algorithm actually processes them -- and watch that
happen strictly left to right, discovered rather than assumed.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Richard Bellman, &ldquo;An Introduction to the
Theory of Dynamic Programming,&rdquo; RAND Corporation, 1953; Donald
Michie's 1968 coinage of &ldquo;memoization&rdquo;; the Fibonacci
sequence's own history via Pingala (&asymp;450 BC), Virahanka (&asymp;700
AD), and Leonardo of Pisa's <cite>Liber Abaci</cite> (1202); CLRS Chapter
15 (Dynamic Programming); and the CMSC 244 divide-and-conquer slides,
which use this exact example as the bridge from divide-and-conquer into
dynamic programming.</p>

<script src="../../extra/sketches/fibonacci/walkthroughs.js"></script>
