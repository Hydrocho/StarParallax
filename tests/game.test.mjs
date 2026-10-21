import test from 'node:test';
import assert from 'node:assert/strict';
import { FlightGame } from '../game.mjs';

test('ship can traverse the wider field and stays inside its boundary', () => {
 const g=new FlightGame();g.start();g.step(1,1);assert.equal(g.x,24);
 g.step(5,1);assert.equal(g.x,72);g.step(10,-1);assert.equal(g.x,-72);
});
test('all rocks remain stationary even while the ship moves and time passes', () => {
 const g=new FlightGame();const initial=structuredClone(g.rocks);g.start();g.step(12,1);
 assert.deepEqual(g.rocks,initial);assert.equal(g.remaining,48);
 assert.ok(Math.min(...g.rocks.map(r=>r.x)) < -50 && Math.max(...g.rocks.map(r=>r.x)) > 50);
 assert.ok(g.rocks.every(r=>r.depth>=55 && r.depth<=225));
});
test('a hit replaces the rock at another location without ending play', () => {
 const g=new FlightGame();g.start();g.x=0;
 g.rocks=[{id:100,x:0,depth:80,radius:3}];g.fire(80);g.step(1,1);
 assert.equal(g.kills,1);assert.equal(g.x,24);assert.equal(g.rocks.length,1);
 assert.equal(g.status,'playing');assert.notEqual(g.rocks[0].id,100);
 assert.ok(Math.abs(g.rocks[0].x)>=18);assert.equal(g.lastEvent.x,0);assert.equal(g.lastEvent.depth,80);
});
test('multiple hits replenish every destroyed rock without same-explosion chain hits', () => {
 const g=new FlightGame();g.start();g.rocks=[{id:100,x:0,depth:80,radius:3},{id:101,x:3,depth:80,radius:3}];
 g.fire(80);g.step(1);assert.equal(g.kills,2);assert.equal(g.rocks.length,2);
 assert.equal(new Set(g.rocks.map(r=>r.id)).size,2);
});
test('bomb passes rocks and detonates only at the chosen distance', () => {
 const g=new FlightGame();g.start();g.rocks=[{id:100,x:0,depth:40,radius:3}];
 g.fire(100);g.step(.5);assert.equal(g.kills,0);assert.ok(g.bomb);
 g.step(.5);assert.equal(g.bomb,null);assert.equal(g.lastEvent.kind,'miss');assert.equal(g.rocks.length,1);
});
test('pause freezes countdown and projectile; restart resets score and random field', () => {
 const g=new FlightGame();g.start();g.fire(100);g.step(.2);g.pause();
 const time=g.remaining, depth=g.bomb.depth;g.step(10,1);
 assert.equal(g.remaining,time);assert.equal(g.bomb.depth,depth);assert.equal(g.fire(80),false);
 g.resume();g.step(.1);assert.ok(g.remaining<time);
 g.reset();assert.equal(g.status,'ready');assert.equal(g.remaining,60);assert.equal(g.kills,0);assert.equal(g.shots,0);assert.equal(g.bomb,null);assert.equal(g.rocks.length,6);
});
test('deadline cancels bombs that would arrive late and prevents further scoring', () => {
 const g=new FlightGame();g.start();g.step(59.5);g.rocks=[{id:100,x:0,depth:100,radius:3}];g.fire(100);
 g.step(3);assert.equal(g.status,'finished');assert.equal(g.remaining,0);assert.equal(g.kills,0);assert.equal(g.bomb,null);
 assert.equal(g.fire(100),false);g.step(10,1);assert.equal(g.kills,0);assert.equal(g.elapsed,60);
});
test('a bomb arriving exactly at the deadline still counts', () => {
 const g=new FlightGame();g.start();g.step(59);g.rocks=[{id:100,x:0,depth:100,radius:3}];g.fire(100);g.step(1);
 assert.equal(g.kills,1);assert.equal(g.status,'finished');
});
test('repeated replacements remain reachable with bounded size and unique ids', () => {
 const g=new FlightGame();g.start();const ids=new Set(g.rocks.map(r=>r.id));
 for(let i=0;i<15;i++){
  const rock=g.rocks[0];g.x=rock.x;g.fire(rock.depth);g.step(rock.depth/100);
  assert.equal(g.rocks.length,6);
  for(const r of g.rocks){assert.ok(Math.abs(r.x)<=66);assert.ok(r.depth>=55 && r.depth<=225);assert.ok(r.radius>=2.6 && r.radius<=6.8);ids.add(r.id);}
 }
 assert.ok(g.kills>=15);assert.ok(ids.size>=21);
});
test('invalid shot ranges and time steps do not corrupt play', () => {
 const g=new FlightGame();g.start();for(const range of [NaN,Infinity,-1,0,241])assert.equal(g.fire(range),false);
 g.step(NaN,1);g.step(-1,1);assert.equal(g.x,0);
});
