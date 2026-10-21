export class BombCharge {
  constructor() { this.cancel(); }
  get active() { return this.source !== null; }
  begin(source, now) {
    if (this.active) return false;
    this.source = source; this.started = now; return true;
  }
  range(now) { return Math.round(20 + Math.min(1, Math.max(0, (now - this.started) / 2000)) * 220); }
  release(source, now) {
    if (!this.active || source !== this.source) return null;
    const range = this.range(now); this.cancel(); return range;
  }
  cancel() { this.source = null; this.started = 0; }
}
