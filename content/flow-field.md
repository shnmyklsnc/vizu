Title: Flow Field
Date: 2024-01-15
Summary: Particles drifting through a Perlin-noise vector field.
Tags: generative, noise, particles
Slug: flow-field
Thumbnail: extra/sketches/flow-field/thumb.svg
Script: extra/sketches/flow-field/sketch.js

A grid of invisible vectors is generated from 2D Perlin noise. Each particle
reads the vector at its current position and steers along it, leaving a
faint trail. Adjust `noiseScale` in `sketch.js` for tighter or looser
swirls.
