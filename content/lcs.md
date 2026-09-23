Title: Longest Common Subsequence
Category: Algorithms
Date: 2024-03-20
Summary: Filling a DP table to find the longest subsequence shared by two strings.
Tags: algorithms, dynamic-programming, strings
Slug: lcs
Thumbnail: extra/sketches/lcs/thumb.svg
Script: extra/sketches/lcs/sketch.js

Builds the classic LCS table one cell at a time: each cell either extends a
diagonal match by one, or carries over the better of the cell above it and
the cell to its left. Once the table is full, one longest common
subsequence is traced back through the matching diagonal cells
(highlighted in green). Change the two strings below to try your own.
