import { ROCK_HEIGHT } from './game.mjs';
import * as THREE from './vendor/three.module.min.js';

// World-space survey guides. Gates share the observer's x coordinates and
// are projected ahead according to aspect ratio to keep both destinations visible.
export class ScanOverlay extends THREE.Group {
  constructor() {
    super();
    this.gates = [-1, 1].map(side => {
      const group = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({color:0xff6767,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.6,4.6),material);
      group.add(pane);
      const rim = new THREE.LineSegments(new THREE.EdgesGeometry(pane.geometry),new THREE.LineBasicMaterial({color:0xff6767,transparent:true,opacity:.8})); group.add(rim);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.5,.57,32),new THREE.MeshBasicMaterial({color:0xff6767,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));group.add(ring);
      const check = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.6,0,.05),new THREE.Vector3(-.15,-.4,.05),new THREE.Vector3(.7,.5,.05)]),new THREE.LineBasicMaterial({color:0x87ffbc}));group.add(check);
      this.add(group);return {side,group,pane,rim,ring,check};
    });
    this.arrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),4,0xffcc94,1,.65);this.add(this.arrow);
    const line = color => {const obj=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.55}));this.add(obj);return obj;};
    this.rays=[line(0x8caeff),line(0x87ffbc)];this.shift=line(0xffcc94);
    this.marks=[0x8caeff,0x87ffbc].map(color=>{const m=new THREE.Mesh(new THREE.RingGeometry(25,32,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,depthTest:false}));this.add(m);return m;});
    this.center = new THREE.Group();
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.05,1.15,48),new THREE.MeshBasicMaterial({color:0x87edda,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
    const centerDot = new THREE.Mesh(new THREE.CircleGeometry(.16,16),new THREE.MeshBasicMaterial({color:0x87edda}));
    this.center.add(centerRing,centerDot);this.add(this.center);
    this.visible=false;
  }
  segment(line,a,b) {
    const attr=line.geometry.attributes.position;attr.setXYZ(0,...a);attr.setXYZ(1,...b);attr.needsUpdate=true;line.geometry.computeBoundingSphere();
  }
  update(scan,game,aspect=1) {
    const rock=scan && game.rocks.find(r=>r.id===scan.id);
    this.visible=!!rock;if(!rock)return;
    const side=scan.side || Math.sign(game.x-scan.origin);
    const progress=scan.progress(game.x);
    const guideDepth=Math.max(32,24/(Math.tan(29*Math.PI/180)*aspect));
    this.center.position.set(scan.origin,-guideDepth*.09,-guideDepth);
    this.center.scale.setScalar(guideDepth/42);
    for(const gate of this.gates) {
      const done=!!scan.result || (!!scan.a && gate.side===scan.side);
      const active=!done && (scan.a ? gate.side===-scan.side : (!side || gate.side===side));
      const color=done?0x63f5a6:0xff6767;
      gate.group.position.set(scan.origin+gate.side*8,-guideDepth*.09,-guideDepth);
      gate.group.scale.setScalar(guideDepth/42);
      gate.pane.material.color.setHex(color);gate.pane.material.opacity=done?.06:active?.12:.025;
      gate.rim.material.color.setHex(color);gate.rim.material.opacity=done||active?.8:.2;
      gate.ring.material.color.setHex(color);gate.ring.visible=!done && active;
      gate.ring.scale.setScalar(.6+progress.fraction*.8);gate.check.visible=!!done;
    }
    this.arrow.visible=!scan.result && !!side;
    this.arrow.position.set(game.x,-guideDepth*.22,-guideDepth);
    this.arrow.setLength(guideDepth*.12,guideDepth*.025,guideDepth*.016);
    this.arrow.setDirection(new THREE.Vector3(scan.a?-scan.side:side,0,0));
    // Sight lines continue through the stationary target to a distant
    // reference plane. Their intersections show apparent background motion.
    const observations=[scan.a,scan.b || (scan.a?{x:game.x,angle:Math.atan2(rock.x-game.x,rock.depth)}:null)];
    const points=[];
    observations.forEach((obs,i)=>{
      this.rays[i].visible=this.marks[i].visible=!!obs;
      if(!obs)return;
      const x=obs.x+Math.tan(obs.angle)*6000;
      const y=ROCK_HEIGHT / rock.depth * 6000;
      this.segment(this.rays[i],[obs.x,0,0],[x,y,-6000]);
      this.marks[i].position.set(x,y,-6000);points.push([x,y,-6000]);
    });
    this.shift.visible=points.length===2;
    if(this.shift.visible)this.segment(this.shift,points[0],points[1]);
  }
}
