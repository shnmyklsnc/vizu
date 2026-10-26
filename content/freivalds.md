Title: Freivalds' Algorithm
Category: Algorithms
Date: 2026-09-29
Summary: Checking whether A×B = C looks like it needs a full O(n^3) multiplication -- Freivalds showed a random 0/1 vector and two O(n^2) matrix-vector products settle it instead, wrong only for at most half of all possible vectors.
Tags: algorithms, randomized-algorithms, matrix-multiplication, linear-algebra
Slug: freivalds
Thumbnail: extra/sketches/freivalds/thumb.svg
Script: extra/sketches/freivalds/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">Rūsiņš Mārtiņš Freivalds</span>
</div>
<p class="byline-meta">Published in 1977, this is one of the earliest
algorithms whose entire point is that flipping a coin can be faster than
knowing the answer for sure. It checks whether <code>A&times;B = C</code>
for <code>n&times;n</code> matrices without ever computing
<code>A&times;B</code> -- see
<a href="../matrix-multiplication/">the article on multiplying them</a> --
in <code>O(n&sup2;)</code> instead of the <code>O(n&sup3;)</code> (or
<code>O(n^2.807)</code>, with <a href="../matrix-multiplication/">Strassen</a>)
a real multiplication costs, at the price of a bounded, repeatable chance of
being wrong in one direction only.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Real check</span><span class="cx-value">O(n&sup3;)</span></div>
<div class="cx-item"><span class="cx-label">Freivalds</span><span class="cx-value">O(n&sup2;)</span></div>
<div class="cx-item"><span class="cx-label">Error (k trials)</span><span class="cx-value">&le; 2^&minus;k</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Freivalds' algorithm sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-why" aria-controls="panel-why" aria-selected="false" tabindex="-1">Why it works</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>Checking without multiplying</h2>
<p>Suppose someone hands you three <code>n&times;n</code> matrices and
claims <code>A&times;B = C</code>. The obvious way to check is to actually
compute <code>A&times;B</code> and compare it entry by entry against
<code>C</code> -- which costs exactly as much as the multiplication itself,
<code>O(n&sup3;)</code> the schoolbook way or
<code>O(n^2.807)</code> with Strassen. Verifying the claim is no cheaper
than proving it yourself from scratch.</p>

<p>Freivalds' algorithm checks it in <code>O(n&sup2;)</code> instead, by
never forming the full product at all. Pick a random vector
<code>r</code>, each of its <code>n</code> entries independently
<code>0</code> or <code>1</code>. Compute <code>A(Br)</code> -- first
<code>Br</code>, then <code>A</code> times that, two matrix-<em>vector</em>
products instead of one matrix-<em>matrix</em> product -- and separately
compute <code>Cr</code>. If <code>A&times;B</code> really does equal
<code>C</code>, these are guaranteed to match, always, for every possible
<code>r</code>. If they don't match, you've learned for certain that
<code>A&times;B ≠ C</code>. The only place uncertainty can sneak in is
the reverse case: <code>A&times;B ≠ C</code>, but this particular
random <code>r</code> happened to match anyway.</p>

<div class="wpanel" id="frw-widget">
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

<p>That one-sided gap is the whole story: a &ldquo;no&rdquo; is always
trustworthy, and a &ldquo;yes&rdquo; is trustworthy up to a bound Freivalds
pinned down exactly -- see the next tab.</p>

</section>

<section class="tab-panel" id="panel-why" role="tabpanel" aria-labelledby="tab-why" hidden>

<h2>At most half of all vectors can be fooled</h2>
<p>Let <code>D = A&times;B &minus; C</code>. If the claim is true,
<code>D</code> is the all-zero matrix, and
<code>Dr = ABr &minus; Cr</code> is the zero vector for <em>every</em>
<code>r</code> -- there's no way to get a false &ldquo;no.&rdquo; The only
question is: if the claim is false, so <code>D ≠ 0</code>, how often
can a random <code>r</code> still make <code>Dr = 0</code> and fool the
check?</p>

<p>Since <code>D ≠ 0</code>, some row <code>i</code> has a nonzero
entry; say column <code>j</code> is one such entry,
<code>D<sub>ij</sub> ≠ 0</code>. Fix every entry of <code>r</code>
<em>except</em> <code>r<sub>j</sub></code>. Then the <code>i</code>-th
entry of <code>Dr</code> is</p>
<div class="eq">(Dr)<sub>i</sub>  =  D<sub>ij</sub>&middot;r<sub>j</sub>  +  (a constant, from the other entries of row i)</div>
<p>a straight line in the single unknown <code>r<sub>j</sub></code>, with a
nonzero slope <code>D<sub>ij</sub></code>. Its two possible values --
one for <code>r<sub>j</sub> = 0</code>, another for
<code>r<sub>j</sub> = 1</code> -- are different, precisely because the
slope isn't zero. So <em>at most one</em> of those two choices can make
<code>(Dr)<sub>i</sub> = 0</code>, and <code>Dr = 0</code> as a whole
vector requires at least that much. Averaging over every possible setting
of the other <code>n &minus; 1</code> entries -- each one splits its two
choices of <code>r<sub>j</sub></code> exactly one bad, one good -- the
overall probability, over a uniformly random <code>r ∈ {0,1}<sup>n</sup></code>,
that <code>Dr = 0</code> is at most</p>
<div class="eq">Pr[Dr = 0 | D &ne; 0]  &le;  1/2</div>
<p>-- exactly Freivalds' bound. It's tight, too: change just <em>one</em>
entry of a correct product to build <code>C</code>, and <code>D</code> has
exactly one nonzero entry, hitting this bound exactly rather than beating
it -- which is exactly what the Try it tab's empirical count will show if
you run enough trials against a &ldquo;wrong&rdquo; <code>C</code> built
that way.</p>

<h3>Repeating the trial</h3>
<p>A coin flip's worth of confidence usually isn't enough on its own. Run
<code>k</code> <em>independent</em> trials -- a fresh random
<code>r</code> each time -- and only conclude &ldquo;yes&rdquo; if every
single one matches. A false claim now needs to fool all <code>k</code>
trials in a row:</p>
<div class="eq">Pr[fooled all k trials | A&times;B &ne; C]  &le;  (1/2)^k  =  2^&minus;k</div>
<p>Twenty trials already pushes the error below one in a million, still at
a total cost of <code>O(kn&sup2;)</code> -- for any reasonable
<code>k</code>, nowhere close to the <code>O(n&sup3;)</code> of just doing
the multiplication and being certain.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Set <code>C</code> to &ldquo;Correct&rdquo; and run trials -- it always
says &ldquo;Yes,&rdquo; no matter how many times. Switch it to
&ldquo;Wrong&rdquo; (one entry deliberately changed from the true product)
and run a hundred trials at once: the false-&ldquo;yes&rdquo; rate should
settle in right around the theoretical ceiling of 50% per trial, not below
it -- a single changed entry is exactly the case where Freivalds' bound is
tight rather than pessimistic.</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: R. Freivalds, &ldquo;Probabilistic machines can use
less running time,&rdquo; IFIP Congress, 1977; CLRS Chapter 5 (Probabilistic
Analysis and Randomized Algorithms) covers the same one-sided-error idea;
and the CMSC 244 divide-and-conquer slides. In the walkthrough above,
matrices are freshly randomized each time -- including whether
<code>C</code> is secretly right or wrong -- and every number shown is
computed from actually doing the arithmetic on that sample; nothing here is
hand-scripted.</p>

<script src="../../extra/sketches/freivalds/walkthroughs.js"></script>
