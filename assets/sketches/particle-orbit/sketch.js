// Particle orbit: circles orbiting a shared center on sin/cos paths.
let angle = 0;
const numOrbiters = 12;

function setup() {
  const canvas = createCanvas(600, 400);
  canvas.parent('sketch-holder');
  noStroke();
}

function draw() {
  background(20);
  translate(width / 2, height / 2);

  for (let i = 0; i < numOrbiters; i++) {
    const radius = 30 + i * 14;
    const speed = 0.01 + i * 0.002;
    const x = cos(angle * speed * 40) * radius;
    const y = sin(angle * speed * 40) * radius;
    fill(200, 220 - i * 10, 255, 200);
    circle(x, y, 10);
  }

  angle += 0.02;
}
