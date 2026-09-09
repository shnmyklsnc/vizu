// Flow field: particles steered by a Perlin-noise vector field.
let particles = [];
const numParticles = 400;
const noiseScale = 0.005;

function setup() {
  const holder = document.getElementById('sketch-holder');
  const canvas = createCanvas(600, 400);
  canvas.parent('sketch-holder');
  background(15);

  for (let i = 0; i < numParticles; i++) {
    particles.push(createVector(random(width), random(height)));
  }
}

function draw() {
  // Slight fade instead of a full clear, so trails persist.
  noStroke();
  fill(15, 15, 20, 8);
  rect(0, 0, width, height);

  stroke(255, 40);
  for (let p of particles) {
    const angle = noise(p.x * noiseScale, p.y * noiseScale) * TWO_PI * 2;
    const prevX = p.x;
    const prevY = p.y;
    p.x += cos(angle) * 1.5;
    p.y += sin(angle) * 1.5;
    line(prevX, prevY, p.x, p.y);

    // wrap around edges
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  }
}
