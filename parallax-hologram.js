import * as THREE from './vendor/three.module.min.js';

// An oblique holographic teaching model, deliberately separated from the
// actual world-space bearings. Distances/angles are enlarged for visibility.
export class ParallaxHologram extends THREE.Group {
  constructor() {
    super();
    this.content=new THREE.Group();this.add(this.content);
    this.content.rotation.set(.18,-.32,-.06);
    const line=(color,n=2)=>{
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
      const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));this.content.add(l);return l;
    };
    const triangle=color=>{
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));this.content.add(m);return m;
    };
    this.front=triangle(0x63f5c1);this.back=triangle(0xffbd69);
    this.sights=[line(0x91bcff,3),line(0xffce87,3)];this.baseline=line(0x91bcff);this.shift=line(0xffd58c);
    this.dots=[0x91bcff,0x87ffbc,0xffffff,0x91bcff,0xffce87].map((color,i)=>{
      const m=new THREE.Mesh(i===2?new THREE.IcosahedronGeometry(.55,0):new THREE.SphereGeometry(.22,10,8),new THREE.MeshBasicMaterial({color}));this.content.add(m);return m;
    });
    const vertices=[],indices=[];
    for(let i=0;i<=40;i++){
      const angle=-.7+i/40*1.4,x=20*Math.sin(angle),z=6-20*Math.cos(angle);
      vertices.push(x,-1,z,x,11,z);
      if(i<40){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);
    this.content.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x246b97,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false})));
    const stars=[];for(let i=0;i<28;i++){const a=-.65+(i*13%29)/29*1.3;stars.push(20*Math.sin(a),.3+(i*7%19)/19*10,6-20*Math.cos(a));}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
    this.content.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xb8dfff,size:.15,transparent:true,opacity:.85})));
    this.visible=false;
  }
  points(object,values){
    const a=object.geometry.attributes.position;values.forEach((p,i)=>a.setXYZ(i,...p));a.needsUpdate=true;object.geometry.computeBoundingSphere();
  }
  intersection(observer,rock){
    const d=rock.map((v,i)=>v-observer[i]);
    const a=d[0]**2+d[2]**2,b=2*(observer[0]*d[0]+(observer[2]-6)*d[2]),c=observer[0]**2+(observer[2]-6)**2-400;
    const t=(-b+Math.sqrt(b*b-4*a*c))/(2*a);
    return observer.map((v,i)=>v+t*d[i]);
  }
  update(scan,game,aspect){
    this.visible=!!scan?.result;if(!this.visible)return;
    const depth=scan.result.depth;
    const rock=[Math.max(-2,Math.min(2,(scan.result.x-scan.origin)*.3)),0,-3-(depth-55)/170*5];
    const a=[-5,-4,4],b=[5,-4,4],pa=this.intersection(a,rock),pb=this.intersection(b,rock);
    this.points(this.front,[a,b,rock]);this.points(this.back,[rock,pa,pb]);
    this.points(this.sights[0],[a,rock,pa]);this.points(this.sights[1],[b,rock,pb]);
    this.points(this.baseline,[a,b]);this.points(this.shift,[pa,pb]);
    [a,b,rock,pa,pb].forEach((p,i)=>this.dots[i].position.set(...p));
    const z=Math.max(45,20/Math.max(.3,aspect));
    this.position.set(game.x,z*.16,-z);
    this.scale.setScalar(Math.min(1,aspect*1.4));
  }
}
