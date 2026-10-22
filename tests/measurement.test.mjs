import test from 'node:test';
import assert from 'node:assert/strict';
import { triangulate } from '../measurement.mjs';
const bearing = (observer, x, depth) => ({x:observer, angle:Math.atan2(x-observer,depth)});
test('two bearings recover forward depth in both travel directions and off-axis', () => {
 for (const depth of [55,100,140,225]) for (const [a,b] of [[0,12],[20,-10],[-30,-10]]) {
  const result=triangulate(bearing(a,12,depth),bearing(b,12,depth));
  assert.ok(Math.abs(result.depth-depth)<1e-9);
  assert.ok(Math.abs(result.x-12)<1e-9);
  assert.ok(Math.abs(result.seconds-(depth-20)/110)<1e-9);
 }
});
test('reject insufficient baseline, parallel bearings and invalid observations', () => {
 assert.equal(triangulate(bearing(0,0,100),bearing(7,0,100)),null);
 assert.equal(triangulate({x:0,angle:0},{x:10,angle:0}),null);
 assert.equal(triangulate({x:NaN,angle:0},{x:10,angle:1}),null);
});
import { ParallaxScan } from '../measurement.mjs';
test('automatic scan samples symmetric gates in either direction even with overshoot', () => {
 for(const side of [-1,1]) {
  const scan=new ParallaxScan(7,bearing(12,12,140));
  scan.sample(bearing(12+side*5,12,140)); assert.equal(scan.phase,'outward');
  scan.sample(bearing(12+side*11,12,140)); assert.equal(scan.phase,'crossing');
  assert.equal(scan.a.x,12+side*8);
  scan.sample(bearing(12,12,140)); assert.equal(scan.result,null);
  scan.sample(bearing(12-side*10,12,140)); assert.equal(scan.phase,'complete');
  assert.equal(Math.abs(scan.a.x-scan.b.x),16);
  assert.ok(Math.abs(scan.result.depth-140)<1e-9);
  const before=scan.result;scan.sample(bearing(50,12,140));assert.equal(scan.result,before);
 }
});
test('turning too early does not complete scan and movement away increases remaining', () => {
 const scan=new ParallaxScan(1,bearing(0,0,100));
 scan.sample(bearing(4,0,100));scan.sample(bearing(0,0,100));assert.equal(scan.phase,'outward');
 scan.sample(bearing(-8,0,100));assert.equal(scan.progress(-8).remaining,16);
 scan.sample(bearing(-12,0,100));assert.equal(scan.progress(-12).remaining,20);
 scan.sample(bearing(7,0,100));assert.equal(scan.result,null);
});
test('same baseline gives larger angular shift for a nearer target', () => {
 const deltas=[60,200].map(depth=>{const s=new ParallaxScan(1,bearing(0,0,depth));s.sample(bearing(-8,0,depth));s.sample(bearing(8,0,depth));return Math.abs(s.a.angle-s.b.angle)});
 assert.ok(deltas[0]>deltas[1]);
});
