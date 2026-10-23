// Two bearings relative to a fixed, distant background direction.
// Returns forward depth (the bomb's range), not slant distance.
export function triangulate(a, b) {
  const baseline = b.x - a.x;
  const shift = Math.tan(a.angle) - Math.tan(b.angle);
  if (![a.x, b.x, a.angle, b.angle].every(Number.isFinite) || Math.abs(baseline) < 8 - 1e-9 || Math.abs(shift) < 0.005) return null;
  const depth = baseline / shift;
  if (!Number.isFinite(depth) || depth < 20 || depth > 240) return null;
  return { depth, x: a.x + depth * Math.tan(a.angle), seconds: (depth - 20) / 110 };
}

export const HALF_BASELINE = 8;
export class ParallaxScan {
  constructor(id, observation) {
    this.id = id; this.origin = observation.x; this.previous = observation;
    this.phase = 'outward'; this.side = 0; this.a = null; this.b = null; this.result = null;
  }
  sample(observation) {
    if (this.result) return;
    if (this.phase === 'outward' && Math.abs(observation.x - this.origin) >= HALF_BASELINE) {
      this.side = Math.sign(observation.x - this.origin);
      this.a = this.at(this.origin + this.side * HALF_BASELINE, observation);
      this.phase = 'crossing';
    } else if (this.phase === 'crossing' && this.side * (observation.x - this.origin) <= -HALF_BASELINE) {
      this.b = this.at(this.origin - this.side * HALF_BASELINE, observation);
      this.result = triangulate(this.a, this.b);
      if (this.result) this.phase = 'complete';
    }
    this.previous = observation;
  }
  at(x, observation) {
    // Interpolate the bearing tangent at the exact gate crossing: a fixed
    // target's tangent varies linearly with observer x, even on a slow frame.
    const t = (x - this.previous.x) / (observation.x - this.previous.x);
    return { x, angle: Math.atan(Math.tan(this.previous.angle) + t * (Math.tan(observation.angle) - Math.tan(this.previous.angle))) };
  }
  progress(x) {
    if (this.result) return { remaining: 0, fraction: 1, direction: 0 };
    const remaining = this.phase === 'outward' ? Math.max(0, HALF_BASELINE - Math.abs(x - this.origin)) : Math.max(0, this.side * (x - this.origin) + HALF_BASELINE);
    const total = this.phase === 'outward' ? HALF_BASELINE : HALF_BASELINE * 2;
    return { remaining, fraction: Math.max(0, Math.min(1, 1 - remaining / total)), direction: this.phase === 'crossing' ? -this.side : Math.sign(x - this.origin) };
  }
}
