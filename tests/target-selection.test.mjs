import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { FlightScene } from '../flight-scene.js';
function pick(rocks,x=0) {
 const scene=Object.create(FlightScene.prototype);scene.scene=new THREE.Scene();scene.rockMeshes=new Map();
 for(const rock of rocks)scene.rockMeshes.set(rock.id,scene.makeRock(rock));
 try{return scene.pickTarget(rocks,x)?.id??null;}finally{for(const m of scene.rockMeshes.values()){m.geometry.dispose();m.material.dispose();}}
}
test('foreground surface wins even when background center is better aligned',()=>{
 const near={id:1,x:2,depth:60,radius:5},far={id:2,x:0,depth:150,radius:4};
 assert.equal(pick([far,near]),1);assert.equal(pick([near,far]),1);
});
test('off-center occluded candidate also resolves to the visible foreground',()=>{
 assert.equal(pick([{id:1,x:8,depth:60,radius:5},{id:2,x:16,depth:140,radius:3}]),1);
});
test('a non-overlapping foreground rock does not steal the target',()=>{
 assert.equal(pick([{id:1,x:20,depth:60,radius:3},{id:2,x:0,depth:140,radius:3}]),2);
 assert.equal(pick([]),null);
});
test('selection follows observer movement and ignores removed meshes',()=>{
 const rocks=[{id:1,x:2,depth:60,radius:5},{id:2,x:0,depth:140,radius:4}];
 assert.equal(pick(rocks,-12),2);
 assert.equal(pick([rocks[1]]),2);
});
