import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitGeometry } from '../orbit.mjs';
test('increasing star distance reduces both half-angle and apparent shift', () => {
  const near = orbitGeometry(0, 120), far = orbitGeometry(0, 220);
  assert.ok(near.p > far.p);
  assert.ok(Math.abs(near.apparentX - 180) > Math.abs(far.apparentX - 180));
  assert.ok(far.starY < near.starY);
});
test('opposite observations are symmetric and a full orbit returns to the start', () => {
  for (const distance of [120, 191, 220]) {
    const a = orbitGeometry(0, distance), b = orbitGeometry(6, distance), end = orbitGeometry(12, distance);
    assert.ok(Math.abs(a.apparentX + b.apparentX - 360) < 1e-8);
    assert.ok(Math.abs(a.apparentX - end.apparentX) < 1e-8);
    assert.equal(a.starY, b.starY); assert.equal(a.p, b.p);
  }
});
