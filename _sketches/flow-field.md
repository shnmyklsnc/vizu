---
title: "Flow Field"
date: 2024-01-15
description: "Particles drifting through a Perlin-noise vector field."
thumbnail: /assets/sketches/flow-field/thumb.svg
script: /assets/sketches/flow-field/sketch.js
tags: [generative, noise, particles]
---
A grid of invisible vectors is generated from 2D Perlin noise. Each particle
reads the vector at its current position and steers along it, leaving a
faint trail. Adjust `noiseScale` in `sketch.js` for tighter or looser
swirls.
