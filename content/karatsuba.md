Title: Karatsuba Multiplication
Category: Algorithms
Date: 2026-09-28
Summary: Split each number into a high half and a low half, recurse, recombine -- and the one algebraic trick that turns 4 sub-products into 3, and O(n squared) into O(n^1.585...).
Tags: algorithms, divide-and-conquer, multiplication
Slug: karatsuba
Thumbnail: extra/sketches/karatsuba/thumb.svg
Script: extra/sketches/karatsuba/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">Anatoly Karatsuba</span>
</div>
<p class="byline-meta">In 1960, 23-year-old Karatsuba was a student in a
seminar run by Andrey Kolmogorov, who had conjectured that no algorithm
could multiply faster than the schoolbook <code>O(n&sup2;)</code> bound.
Within a week, Karatsuba found one that could. It was published (with Yu.
Ofman) as <cite>&ldquo;Multiplication of Many-Digital Numbers by Automatic
Computers,&rdquo; Proceedings of the USSR Academy of Sciences</cite>,
1962.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Naive D&amp;C</span><span class="cx-value">O(n&sup2;)</span></div>
<div class="cx-item"><span class="cx-label">Karatsuba</span><span class="cx-value">O(n^1.585)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(n)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Karatsuba multiplication sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Splitting the numbers</h2>
<p>Multiplying two <code>n</code>-digit numbers the way you learned in
school costs <code>O(n&sup2;)</code> -- every digit of <code>a</code>
against every digit of <code>b</code>. For decades that looked like the
best anyone could do. Splitting each number into a high half and a low
half and recursing doesn't help on its own -- the naive way to recombine
the pieces still needs four sub-products, and still costs
<code>O(n&sup2;)</code>. The trick is entirely in how the pieces get put
back together.</p>

<div class="wpanel" id="ksw-widget">
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

<p>That's the whole idea: three multiplications where the schoolbook
expansion needed four, using nothing but addition and subtraction to make
up the difference. The same split applies recursively to numbers of any
size -- <code>a1</code>, <code>a2</code>, <code>b1</code> and
<code>b2</code> above are themselves multiplied by the same algorithm, one
level further down, until the pieces are small enough to multiply
directly.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Why three beats four</h2>
<p>Solving each half and recombining costs:</p>
<div class="eq">naive:      T(n) = 4T(n/2) + O(n)  =  O(n&sup2;)
karatsuba:  T(n) = 3T(n/2) + O(n)  =  <b>O(n^1.585...)</b></div>
<p>Both recurrences fit case 1 of the master theorem: <code>a</code>
equally-sized subproblems, each <code>b = 2</code> times smaller, combine
cost <code>f(n) = &Theta;(n)</code>. In both cases <code>f(n)</code> is
polynomially smaller than <code>n<sup>log<sub>2</sub> a</sup></code> (that's
<code>n&sup2;</code> for naive's <code>a = 4</code>, or
<code>n<sup>log<sub>2</sub> 3</sup> &approx; n^1.585</code> for Karatsuba's
<code>a = 3</code>), so the combine step doesn't even show up in the final
bound. The whole answer comes from how many subproblems there are --
exactly the one number Karatsuba's algebra changes.</p>

<h3>Proving it: how fast the tree grows</h3>
<p>Toggle between the two variants to compare how many leaf
multiplications each one bottoms out in. Same depth, same size subproblems
at every level -- the only difference is the branching factor.</p>

<div class="wpanel">
<div class="controls">
<span class="seg" id="krt-mode" role="group" aria-label="Variant">
<button class="btn" type="button" data-mode="naive" aria-pressed="false">Naive (4-way)</button>
<button class="btn" type="button" data-mode="karatsuba" aria-pressed="true">Karatsuba (3-way)</button>
</span>
<span class="seg">
<button class="btn" id="krt-lvdown" type="button">Remove level</button>
<button class="btn primary" id="krt-lvup" type="button">Add level</button>
</span>
</div>
<div class="legend">
<span><i class="sw hi"></i>a naive subproblem</span>
<span><i class="sw lo"></i>a Karatsuba subproblem</span>
</div>
<div class="scroll"><div id="krt-tree"></div></div>
<div class="readout" id="krt-readout"></div>
</div>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>The full recursion tree for either variant, animated node by node: orange
while a problem is being split or its pieces recombined, yellow at the
leaves (single-digit multiplications), purple while a level's sub-products
are being combined, green once a result is ready. Switch bit-width to
watch the leaf count grow.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Karatsuba &amp; Ofman (1962), and the CMSC 244
divide-and-conquer slides. In the walkthrough above, operands are freshly
randomized each time, and every number shown is computed from actually
doing the arithmetic on that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/karatsuba/walkthroughs.js"></script>
