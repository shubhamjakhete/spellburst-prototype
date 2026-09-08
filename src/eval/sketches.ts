import { STILL_MOTION, type ColourName } from '../lib/measure'

/**
 * Six fixed sketches. Frozen so that runs stay comparable, which also makes
 * them tidier than what a real session produces.
 *
 * Every one animates from millis() rather than frameCount, so a slow machine
 * measures the same motion as a fast one. Anything driven by a plain sine wave
 * is avoided or made to travel, because a sketch whose state repeats every
 * 500ms would capture two identical frames and read as motionless.
 */

export type MotionClass = 'still' | 'subtle' | 'lively'

export const MOTION_BANDS: Record<MotionClass, { min: number; max: number }> = {
  still: { min: 0, max: STILL_MOTION },
  subtle: { min: STILL_MOTION, max: 0.06 },
  lively: { min: 0.06, max: 1 },
}

export function classifyMotion(value: number): MotionClass {
  if (value < MOTION_BANDS.still.max) return 'still'
  if (value < MOTION_BANDS.subtle.max) return 'subtle'
  return 'lively'
}

export type BaseSketch = {
  id: string
  title: string
  /** Why the motion class below is what it is, written before measuring. */
  reasoning: string
  expectedMotion: MotionClass
  expectedPalette: ColourName
  code: string
}

export const BASE_SKETCHES: BaseSketch[] = [
  {
    id: 'night-sky',
    title: 'night sky, moving stars',
    reasoning:
      'Stars cover about 2% of the frame and displace fully, on a sky that never changes.',
    expectedMotion: 'subtle',
    expectedPalette: 'blue',
    code: `let stars = [];

function setup() {
  createCanvas(600, 400);
  noStroke();
  randomSeed(7);
  for (let i = 0; i < 140; i++) {
    stars.push({
      x: random(600),
      y: random(400),
      r: random(2, 4.5),
      speed: random(18, 55)
    });
  }
}

function draw() {
  background(16, 26, 46);
  fill(232, 238, 247);
  const t = millis() / 1000;
  for (const s of stars) {
    circle((s.x + s.speed * t) % 600, s.y, s.r * 2);
  }
}`,
  },
  {
    id: 'drifting-particles',
    title: 'drifting particles',
    reasoning:
      'Particles cover about 4% and drift roughly their own width between captures.',
    expectedMotion: 'subtle',
    expectedPalette: 'purple',
    code: `let bits = [];

function setup() {
  createCanvas(600, 400);
  noStroke();
  randomSeed(11);
  for (let i = 0; i < 110; i++) {
    bits.push({
      x: random(600),
      y: random(400),
      r: random(3, 7),
      dx: random(-18, 18),
      dy: random(-12, 12)
    });
  }
}

function draw() {
  background(29, 20, 48);
  fill(186, 154, 232);
  const t = millis() / 1000;
  for (const b of bits) {
    const x = ((b.x + b.dx * t) % 600 + 600) % 600;
    const y = ((b.y + b.dy * t) % 400 + 400) % 400;
    circle(x, y, b.r * 2);
  }
}`,
  },
  {
    id: 'pulsing-circle',
    title: 'pulsing circle',
    reasoning:
      'A ramp, not a sine, so every 500ms window contains change. The ring swept out is roughly a fifth of the frame at high contrast.',
    expectedMotion: 'lively',
    expectedPalette: 'green',
    code: `function setup() {
  createCanvas(600, 400);
  noStroke();
}

function draw() {
  background(18, 33, 26);
  const t = millis() / 1000;
  const r = 20 + 170 * ((t % 1.4) / 1.4);
  fill(127, 212, 160);
  circle(300, 200, r * 2);
}`,
  },
  {
    id: 'rotating-grid',
    title: 'rotating grid',
    reasoning:
      'Lines cover about a fifth of the frame and sweep well past their own width in 500ms, so nearly every line pixel changes.',
    expectedMotion: 'lively',
    expectedPalette: 'cyan',
    code: `function setup() {
  createCanvas(600, 400);
}

function draw() {
  background(0);
  const t = millis() / 1000;
  stroke(63, 208, 216);
  strokeWeight(5);
  push();
  translate(300, 200);
  rotate(t * 0.9);
  for (let i = -9; i <= 9; i++) {
    line(i * 50, -430, i * 50, 430);
    line(-430, i * 50, 430, i * 50);
  }
  pop();
}`,
  },
  {
    id: 'wave-line',
    title: 'wave line',
    reasoning:
      'A travelling wave, so it never repeats within a capture window, but the stroke is only a couple of percent of the frame.',
    expectedMotion: 'subtle',
    expectedPalette: 'orange',
    code: `function setup() {
  createCanvas(600, 400);
  noFill();
}

function draw() {
  background(0);
  const t = millis() / 1000;
  stroke(217, 122, 43);
  strokeWeight(6);
  beginShape();
  for (let x = 0; x <= 600; x += 6) {
    vertex(x, 200 + 70 * sin(x * 0.02 + t * 1.6));
  }
  endShape();
}`,
  },
  {
    id: 'scattered-dots',
    title: 'scattered dots',
    reasoning:
      'Dots cover over a tenth of the frame and orbit far enough to clear their own diameter.',
    expectedMotion: 'lively',
    expectedPalette: 'pink',
    code: `let dots = [];

function setup() {
  createCanvas(600, 400);
  noStroke();
  randomSeed(23);
  for (let i = 0; i < 90; i++) {
    dots.push({
      x: random(60, 540),
      y: random(60, 340),
      r: random(7, 14),
      phase: random(TWO_PI),
      rate: random(1.2, 2.6)
    });
  }
}

function draw() {
  background(0);
  fill(224, 64, 154);
  const t = millis() / 1000;
  for (const d of dots) {
    const a = d.phase + t * d.rate;
    circle(d.x + 26 * cos(a), d.y + 26 * sin(a), d.r * 2);
  }
}`,
  },
]
