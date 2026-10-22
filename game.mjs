export const ROCK_HEIGHT = 0;
export const BOMB_SPEED = 100;
export const BLAST_RADIUS = 4.5;
export const ROUND_SECONDS = 60;
export class FlightGame {
  constructor() { this.reset(); }
  reset() {
    this.status = 'ready'; this.x = 0; this.kills = 0; this.score = 0;
    this.shots = 0; this.bomb = null; this.elapsed = 0;
    this.eventId = 0; this.lastEvent = null;
    this.nextRockId = 0; this.rocks = [];
    for (const lane of [-60, -36, -12, 12, 36, 60]) this.rocks.push(this.createRock(null, lane));
  }
  get remaining() { return Math.max(0, ROUND_SECONDS - this.elapsed); }
  createRock(previous = null, lane = null) {
    let candidate;
    const suitable = rock => (!previous || Math.abs(rock.x - previous.x) >= 18) &&
      this.rocks.every(r => Math.hypot(r.x - rock.x, r.depth - rock.depth) > r.radius + rock.radius + 8);
    for (let attempt = 0; attempt < 80; attempt++) {
      candidate = { x: lane === null ? -66 + Math.random() * 132 : lane + (Math.random() - 0.5) * 10,
        depth: 55 + Math.random() * 170, radius: 2.6 + Math.random() * 4.2 };
      if (suitable(candidate)) break;
    }
    // A bounded fallback guarantees a different reachable position even if RNG
    // repeatedly chooses an unsuitable location.
    if (!suitable(candidate)) {
      fallback: for (const x of [-66, -44, -22, 0, 22, 44, 66]) for (const depth of [55, 90, 125, 160, 195, 225]) {
        const option = { x, depth, radius: candidate.radius };
        if (suitable(option)) { candidate = option; break fallback; }
      }
    }
    return { ...candidate, id: this.nextRockId++ };
  }
  start() { if (this.status === 'ready') this.status = 'playing'; }
  pause() { if (this.status === 'playing') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'playing'; }
  fire(range) {
    if (this.status !== 'playing' || this.bomb || !Number.isFinite(range) || range < 20 || range > 240) return false;
    this.bomb = { x: this.x, depth: 0, range }; this.shots++; return true;
  }
  emit(event) { this.lastEvent = { ...event, id: ++this.eventId }; }
  advance(dt, direction) {
    this.x = Math.max(-72, Math.min(72, this.x + direction * 24 * dt));
    this.elapsed += dt;
    if (this.bomb) this.bomb.depth += BOMB_SPEED * dt;
  }
  step(dt, direction = 0) {
    if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, this.remaining);
    direction = Number.isFinite(direction) ? Math.max(-1, Math.min(1, direction)) : 0;
    // Split at detonation so the hit uses the rock's position at that instant,
    // independent of render frame rate or the size of the simulation step.
    const flightTime = this.bomb ? (this.bomb.range - this.bomb.depth) / BOMB_SPEED : Infinity;
    const until = Math.min(dt, flightTime);
    this.advance(until, direction);
    if (this.bomb && flightTime <= dt + 1e-10) {
      const bomb = this.bomb;
      const hits = this.rocks.filter(rock => Math.hypot(rock.x - bomb.x, rock.depth - bomb.range) <= rock.radius + BLAST_RADIUS);
      const nearest = this.rocks.reduce((best, rock) => !best || Math.hypot(rock.x - bomb.x, rock.depth - bomb.range) < Math.hypot(best.x - bomb.x, best.depth - bomb.range) ? rock : best, null);
      const hint = !nearest ? '' : Math.abs(nearest.x - bomb.x) > nearest.radius + BLAST_RADIUS ? '좌우 조준을 먼저 맞춰 보세요.' : nearest.depth > bomb.range ? '너무 가까이서 터졌어요. 폭발 거리를 늘려 보세요.' : '너무 멀리서 터졌어요. 폭발 거리를 줄여 보세요.';
      const distanceBonus = hits.reduce((sum, rock) => sum + Math.floor(rock.depth / 10), 0);
      const points = hits.length * 10 + distanceBonus;
      this.score += points;
      this.rocks = this.rocks.filter(rock => !hits.includes(rock)); this.kills += hits.length;
      for (const destroyed of hits) this.rocks.push(this.createRock(destroyed));
      this.emit({ kind: hits.length ? 'hit' : 'miss', x: bomb.x, depth: bomb.range, count: hits.length, points, distanceBonus, hint });
      this.bomb = null;
      if (dt > until) this.advance(dt - until, direction);
    }
    if (this.remaining <= 1e-9) { this.elapsed = ROUND_SECONDS; this.status = 'finished'; this.bomb = null; }
  }
}
