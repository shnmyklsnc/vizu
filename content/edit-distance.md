Title: Edit Distance (Levenshtein)
Category: Algorithms
Date: 2024-03-25
Summary: Three ways to compute the same distance -- the full DP table, a bit-parallel pass, and a rolling array that searches a pattern inside a longer text.
Tags: algorithms, dynamic-programming, strings, bit-parallel
Slug: edit-distance
Thumbnail: extra/sketches/edit-distance/thumb.svg
Script: extra/sketches/edit-distance/sketch.js

Pick a variant from the panel's dropdown -- all three compute edit
distance, just differently:

- **Standard DP.** Same table shape as the longest-common-subsequence
  sketch, different recurrence: each cell costs one more than the cheapest
  of its three neighbors (insert, delete, substitute), unless the two
  letters already match, in which case it just copies the diagonal. The
  bottom-right cell ends up holding the full edit distance between the two
  words.
- **Bit-parallel (Myers).** The same two words, but no table at all --
  Myers' 1999 algorithm packs each pattern character's positions into a
  bitmask and updates a pair of delta bit-vectors one text character at a
  time, reading the running edit distance off their popcount.
- **Rolling array (free start).** A different question: does a pattern
  appear *inside* a longer text, allowing up to *k* errors, starting
  anywhere? Sellers' 1980 algorithm answers it with a single reused row of
  size (pattern length + 1) that slides across the text one column at a
  time, resetting its first entry to 0 every column so a match is never
  penalized for where it starts.
