import test from 'node:test';
import assert from 'node:assert/strict';
import { BombCharge } from '../charge.mjs';
test('hold duration increases range and caps at 240 without auto-firing', () => {
  const c = new BombCharge(); c.begin('pointer:1', 100);
  assert.equal(c.range(100), 20); assert.equal(c.range(1100), 130);
  assert.equal(c.range(4100), 240); assert.equal(c.active, true);
  assert.equal(c.release('pointer:1', 4100), 240); assert.equal(c.active, false);
});
test('only the initiating input can release and a second input cannot reset charge', () => {
  const c = new BombCharge(); c.begin('pointer:1', 0);
  assert.equal(c.begin('keyboard', 500), false);
  assert.equal(c.release('pointer:2', 1000), null);
  assert.equal(c.release('pointer:1', 1000), 130);
  assert.equal(c.release('pointer:1', 1200), null);
});
test('cancellation discards the shot and the next press starts at minimum', () => {
  const c = new BombCharge(); c.begin('keyboard', 0); c.cancel();
  assert.equal(c.release('keyboard', 2000), null);
  c.begin('pointer:3', 3000); assert.equal(c.release('pointer:3', 3000), 20);
});
