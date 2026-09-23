Title: Closest Pair of Points
Category: Algorithms
Date: 2024-03-10
Summary: Divide-and-conquer search for the two nearest points, in 1D, 2D or 3D.
Tags: algorithms, divide-and-conquer, geometry
Slug: closest-pair
Thumbnail: extra/sketches/closest-pair/thumb.svg
Script: extra/sketches/closest-pair/sketch.js

Sorts the points, splits them in half along one axis, solves each half
recursively, then checks a thin band around the split for a pair closer
than the best found so far. Once an axis is fixed, the band is searched by
treating it as one dimension lower and recursing again: 2D reduces to a 1D
scan, 3D reduces to 2D and then to 1D. Change the point count or dimension
below, then step through it.
