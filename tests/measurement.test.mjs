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
test('both endpoints are required, in either order, with overshoot',()=>{
 for(const side of [-1,1]) {
  const x=7.99999999999999,scan=new ParallaxScan(1,bearing(x,12,140));
  scan.sample(bearing(x+side*10,12,140));assert.equal(scan.phase,'crossing');assert.equal(scan.result,null);
  assert.equal(scan.a.x,x+side*8);
  scan.sample(bearing(x,12,140));assert.equal(scan.result,null);
  scan.sample(bearing(x-side*10,12,140));assert.equal(scan.phase,'complete');
  assert.ok(Math.abs(scan.a.x-scan.b.x)-16<1e-9);assert.ok(Math.abs(scan.result.depth-140)<1e-8);
 }
});
