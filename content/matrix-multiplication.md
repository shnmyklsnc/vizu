Title: Matrix Multiplication
Category: Algorithms
Date: 2026-09-29
Summary: Splitting each matrix into quadrants and recursing costs 8 sub-multiplications the schoolbook way -- Strassen found a combination of sums and differences that gets there in 7, the first proof that matrix multiplication doesn't need cubic time.
Tags: algorithms, divide-and-conquer, matrix-multiplication, linear-algebra
Slug: matrix-multiplication
Thumbnail: extra/sketches/matrix-multiplication/thumb.svg
Script: extra/sketches/matrix-multiplication/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">Volker Strassen</span>
</div>
<p class="byline-meta">In 1969, while at UC Berkeley, Strassen showed that
two 2&times;2 matrices -- or, recursively, two <code>n&times;n</code>
matrices split into 2&times;2 blocks -- can be multiplied using
<code>7</code> scalar multiplications instead of the schoolbook
<code>8</code>: the first proof that matrix multiplication doesn't need
<code>&Theta;(n&sup3;)</code> time. It's the same trade
<a href="../karatsuba/">Karatsuba's algorithm</a> makes for multiplying
numbers, applied one level up, to matrices instead of digits. Published as
<cite>&ldquo;Gaussian Elimination is not Optimal,&rdquo; Numerische
Mathematik</cite>, volume 13, 1969.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive</span><span class="cx-value">O(n&sup3;)</span></div>
<div class="cx-item"><span class="cx-label">Strassen</span><span class="cx-value">O(n^2.807)</span></div>
<div class="cx-item"><span class="cx-label">Multiplications</span><span class="cx-value">8 &rarr; 7</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Matrix multiplication sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Splitting into quadrants</h2>
<p>Multiplying two <code>n&times;n</code> matrices the schoolbook way costs
<code>O(n&sup3;)</code>: each of the <code>n&sup2;</code> entries of the
result is a dot product of length <code>n</code>. Splitting each matrix
into four <code>(n/2)&times;(n/2)</code> quadrants and recursing doesn't
help on its own -- the schoolbook block formula still needs eight
sub-multiplications,</p>
<div class="eq">C11 = A11B11 + A12B21     C12 = A11B12 + A12B22
C21 = A21B11 + A22B21     C22 = A21B12 + A22B22</div>
<p>and still costs <code>O(n&sup3;)</code>, just organized recursively
instead of as one big triple loop. This is the exact same non-improvement
naive divide-and-conquer gives for multiplying numbers -- the trick, again,
is entirely in how the pieces get recombined.</p>

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

<p>That's the whole idea: seven multiplications where the schoolbook block
expansion needed eight, using nothing but extra additions and subtractions
to make up the difference -- <a href="../karatsuba/">Karatsuba's trick</a>
again, generalized one level up. There, splitting a number in half and
multiplying the <em>sums</em> of the halves saved one multiplication out
of four. Here, splitting a matrix into quadrants and multiplying sums (and
differences) of quadrants saves one multiplication out of eight. The same
split applies recursively to matrices of any size -- <code>A11</code>,
<code>A12</code> and the rest above are themselves multiplied by the same
algorithm, one level further down, until the blocks shrink to single
numbers.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why seven beats eight</h2>
<p>Splitting into quadrants and recombining costs:</p>
<div class="eq">naive:     T(n) = 8T(n/2) + O(n&sup2;)  =  O(n&sup3;)
strassen:  T(n) = 7T(n/2) + O(n&sup2;)  =  <b>O(n^log<sub>2</sub>7) &approx; O(n^2.807)</b></div>
<p>Both recurrences fit case 1 of the master theorem: <code>a</code>
equally-sized subproblems, each <code>b = 2</code> times smaller in each
dimension, combine cost <code>f(n) = &Theta;(n&sup2;)</code> (just the
additions and subtractions needed to build the sums going in and the
quadrants of <code>C</code> coming out). In both cases <code>f(n)</code>
is polynomially smaller than <code>n<sup>log<sub>2</sub> a</sup></code> --
that's <code>n<sup>log<sub>2</sub> 8</sup> = n&sup3;</code> for naive's
<code>a = 8</code>, or <code>n<sup>log<sub>2</sub> 7</sup> &approx;
n^2.807</code> for Strassen's <code>a = 7</code> -- so the combine step
never shows up in the final bound. Exactly like
<a href="../karatsuba/">Karatsuba</a>, the entire answer comes from the
branching factor, and Strassen's algebra is what changes it.</p>

<p>The exponent itself: <code>log<sub>2</sub>7 = ln7/ln2 &approx;
2.807354...</code> -- an irrational number with no tidy closed form,
which is part of why it's usually left as <code>n^log<sub>2</sub>7</code> rather
than rounded. The gap it opens up over <code>n&sup3;</code> keeps growing
with <code>n</code>:</p>
<div class="eq">n = 10      n&sup3; = 1,000              n^log<sub>2</sub>7 &approx; 642           (1.56&times;)
n = 100     n&sup3; = 1,000,000          n^log<sub>2</sub>7 &approx; 411,822       (2.43&times;)
n = 1,000   n&sup3; = 1,000,000,000      n^log<sub>2</sub>7 &approx; 264,280,285   (3.78&times;)
n = 10,000  n&sup3; = 1,000,000,000,000  n^log<sub>2</sub>7 &approx; 169,597,594,544 (5.90&times;)</div>

<h3>Proving it: how many sub-multiplications</h3>
<p>Toggle between the two variants to compare how many scalar
multiplications each one bottoms out in. Same depth, same size subproblems
at every level -- the only difference is the branching factor, eight
against seven.</p>

<div class="wpanel">
<div class="controls">
<span class="seg" id="mmrt-mode" role="group" aria-label="Variant">
<button class="btn" type="button" data-mode="naive" aria-pressed="false">Naive (8-way)</button>
<button class="btn" type="button" data-mode="strassen" aria-pressed="true">Strassen (7-way)</button>
</span>
<span class="seg">
<button class="btn" id="mmrt-lvdown" type="button">Remove level</button>
<button class="btn primary" id="mmrt-lvup" type="button">Add level</button>
</span>
</div>
<div class="legend">
<span><i class="sw hi"></i>a naive sub-multiplication</span>
<span><i class="sw lo"></i>a Strassen sub-multiplication</span>
</div>
<div class="scroll"><div id="mmrt-tree"></div></div>
<div class="readout" id="mmrt-readout"></div>
</div>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>The full recursion tree for either variant, animated node by node:
orange while a level is being split or its products combined, yellow at
the leaves (scalar multiplications), purple while a level's products are
being combined, green once a result is ready. The strip below the tree
shows the two matrices the current node is actually multiplying, and --
once that node's own combine step has fired -- the product it produced.
Switch matrix size to watch the leaf count grow: 8<sup>levels</sup> for
naive against 7<sup>levels</sup> for Strassen.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Volker Strassen, &ldquo;Gaussian Elimination is not
Optimal,&rdquo; Numerische Mathematik, vol. 13, 1969; CLRS Chapter 4; and
the CMSC 244 divide-and-conquer slides. In the walkthrough above, matrix
entries are freshly randomized each time, and every number shown is
computed from actually doing the arithmetic on that sample -- nothing here
is hand-scripted.</p>

<script src="../../extra/sketches/matrix-multiplication/walkthroughs.js"></script>
