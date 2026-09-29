Title: Edit Distance
Category: Algorithms
Date: 2026-09-29
Summary: One table answers two questions -- how many edits apart, or how much do they still share -- plus two ways to pay less for the answer, in time or in space.
Tags: algorithms, dynamic-programming, strings, bit-parallel
Slug: edit-distance
Thumbnail: extra/sketches/edit-distance/thumb.svg
Script: extra/sketches/edit-distance/sketch.js
Layout: freeform

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Devised by</span>
<span class="byline-name">Vladimir Levenshtein</span>
</div>
<p class="byline-meta">Levenshtein defined this distance in 1965 while
studying error-correcting codes, publishing it as <cite>&ldquo;Binary
codes capable of correcting deletions, insertions, and reversals,&rdquo;
Soviet Physics Doklady</cite> (1966 translation). The table-filling way to
compute it -- the standard-DP variant below -- came a decade later, from
<cite>Wagner &amp; Fischer, &ldquo;The String-to-String Correction
Problem,&rdquo; Journal of the ACM</cite>, 1974.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">DP table</span><span class="cx-value">O(nm)</span></div>
<div class="cx-item"><span class="cx-label">Bit-parallel</span><span class="cx-value">O(nm/w)</span></div>
<div class="cx-item"><span class="cx-label">Space</span><span class="cx-value">O(m)</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Edit distance sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-recurrence" aria-controls="panel-recurrence" aria-selected="false" tabindex="-1">Recurrence</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>One table, two questions</h2>
<p>Edit distance and Longest Common Subsequence turn out to be answered by
exactly the same table: same dimensions, same fill order (row by row,
comparing one letter of <code>A</code> against one letter of <code>B</code>
per cell), same three neighbors consulted at every step -- the cell
above, the cell to the left, and the cell diagonally above-left. They just
ask a different question of those neighbors. Edit distance asks
<em>&ldquo;what's the fewest edits to turn this prefix of A into this
prefix of B?&rdquo;</em>, counting up from 0 and paying for every mismatch.
LCS asks <em>&ldquo;how long is the longest sequence of letters these two
prefixes agree on, in order?&rdquo;</em>, counting up from 0 and paying for
nothing at all.</p>

<div class="wpanel" id="edw-widget">
<div class="controls">
<button class="btn" type="button" data-role="newnums">New words</button>
</div>
<ol class="steps" data-role="stepnav"></ol>
<div class="caption"></div>
<div class="stage"></div>
<div class="controls">
<button class="btn" type="button" data-role="back">Back</button>
<button class="btn primary" type="button" data-role="next">Next step</button>
</div>
</div>

<p>That's the whole reason this page covers both: LCS isn't a variant on
edit distance's <em>algorithm</em> so much as the same table asked a
different question. Once the table is full, LCS backtracks through the
diagonal matches (highlighted below, in the Try it tab) to recover one
actual longest common subsequence -- edit distance's bottom-right cell is
already the whole answer it needs.</p>

</section>

<section class="tab-panel" id="panel-recurrence" role="tabpanel" aria-labelledby="tab-recurrence" hidden>

<h2>Same table, four ways to pay for it</h2>
<p>Written out formally, for <code>A[1..n]</code> and <code>B[1..m]</code>:</p>
<div class="eq">edit distance:
  dp[i][j] = dp[i&minus;1][j&minus;1]                             if A[i] = B[j]
           = 1 + min(dp[i&minus;1][j&minus;1], dp[i][j&minus;1], dp[i&minus;1][j])   otherwise

lcs length:
  dp[i][j] = dp[i&minus;1][j&minus;1] + 1                         if A[i] = B[j]
           = max(dp[i][j&minus;1], dp[i&minus;1][j])               otherwise</div>
<p>Either way, filling <code>n&times;m</code> cells at <code>O(1)</code>
work each is <code>O(nm)</code> time -- and if you keep the whole table
around (which LCS needs, to backtrack), <code>O(nm)</code> space too. The
other two variants on the Try it tab exist because <code>O(nm)</code> space
and time aren't always affordable, and this table happens to have exactly
the structure needed to cut each one down.</p>

<h3>Cutting the space: one row instead of a table</h3>
<p>Look at what <code>dp[i][j]</code> actually depends on: only row
<code>j&minus;1</code> and the current row <code>j</code>. Nothing from two
rows back is ever read again once row <code>j</code> is done. So the whole
table can be thrown away except the previous row -- or, taken further,
a <em>single</em> reused row that gets overwritten in place as the scan
moves left to right. The Try it tab's rolling-array variant pushes this
one step more: it answers a different question (does the pattern occur
<em>anywhere</em> inside a longer text, allowing <code>k</code> errors),
using one row of size <code>m+1</code> that resets its first entry to 0 at
the start of every column -- <code>O(m)</code> space, full stop, no matter
how long the text is.</p>

<h3>Cutting the time: bit-parallel</h3>
<p>The DP recurrence updates one cell at a time, but Myers' 1999 trick
notices that the update rule is the same bitwise operation repeated across
an entire column -- so pack the whole column into one machine word
(<code>w</code> bits, typically 64) and update it with a handful of
word-level bitwise instructions instead of a <code>w</code>-iteration loop.
That turns each text character's column update from <code>O(m)</code> work
into <code>O(m/w)</code> words -- effectively <code>O(1)</code> for any
pattern under 64 characters -- so the whole scan runs in <code>O(nm/w)</code>
instead of <code>O(nm)</code>.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Simulate it yourself</h2>
<p>Pick a variant from the panel's dropdown -- all four work on the same
underlying idea, just differently:</p>

<button type="button" id="panel-toggle" class="panel-toggle-btn">Hide controls</button>
<div class="sketch-layout" id="sketch-layout">
<div id="sketch-holder">
<button type="button" id="fullscreen-toggle" class="fullscreen-btn" aria-label="View fullscreen" aria-pressed="false"></button>
</div>
<div id="controls-holder" class="panel"></div>
</div>

</section>

<p class="foot">Source: Levenshtein (1966), Wagner &amp; Fischer (1974),
Myers (1999), Sellers (1980), and the CMSC 244 dynamic-programming slides.
In the walkthrough above, words are freshly randomized each time, and
every number shown is computed from actually running both recurrences on
that sample -- nothing here is hand-scripted.</p>

<script src="../../extra/sketches/edit-distance/walkthroughs.js"></script>
