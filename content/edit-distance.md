Title: Edit Distance (Levenshtein)
Category: Algorithms
Date: 2024-03-25
Summary: The DP table for the minimum insert, delete and substitute edits between two words.
Tags: algorithms, dynamic-programming, strings
Slug: edit-distance
Thumbnail: extra/sketches/edit-distance/thumb.svg
Script: extra/sketches/edit-distance/sketch.js

Same table shape as the longest-common-subsequence sketch, different
recurrence: each cell costs one more than the cheapest of its three
neighbors (insert, delete, substitute), unless the two letters already
match, in which case it just copies the diagonal. The bottom-right cell
ends up holding the full edit distance between the two words.
