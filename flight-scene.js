import { ScanOverlay } from './scan-overlay.js';
import * as THREE from './vendor/three.module.min.js';
import { BLAST_RADIUS, ROCK_HEIGHT } from './game.mjs';

const random = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export class FlightScene {
  constructor(container) {
    this.container = container; this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#030813');
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    container.prepend(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xaac6e0, 0x171726, 2.5));
    const sun = new THREE.DirectionalLight(0xffe3c2, 4); sun.position.set(-40, 30, 10); this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x4cd2dd, 3); rim.position.set(60, -5, -150); this.scene.add(rim);
    this.addBackground();
    this.scanOverlay = new ScanOverlay(); this.scene.add(this.scanOverlay);
    this.rockMeshes = new Map(); this.effects = [];
    this.bomb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffdfaa }));
    this.bomb.visible = false; this.scene.add(this.bomb);
    this.bombHalo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa34e, transparent: true, opacity: 0.28 }));
    this.bomb.add(this.bombHalo);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); container.dispatchEvent(new Event('scene-failed')); });
  }
  addBackground() {
    const rng = random(94), positions = [], colors = [];
    for (let i = 0; i < 4800; i++) {
      positions.push((rng() - 0.5) * 19000, (rng() - 0.5) * 11000, -3500 - rng() * 3500);
      const b = 0.35 + rng() * 0.65; colors.push(b * 0.75, b * 0.86, b);
    }
    const stars = new THREE.BufferGeometry();
    stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    stars.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ size: 5, vertexColors: true })));
    const planet = new THREE.Mesh(new THREE.SphereGeometry(280, 48, 32), new THREE.MeshStandardMaterial({ color: 0x183d58, roughness: 1 }));
    planet.position.set(-1300, 650, -3200); this.scene.add(planet);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(285, 48, 32), new THREE.MeshBasicMaterial({ color: 0x5ab9cd, side: THREE.BackSide, transparent: true, opacity: 0.2 }));
    atmosphere.position.copy(planet.position); this.scene.add(atmosphere);
    // A very distant dust band gives a stable visual reference for sideways parallax.
    const dust = [], dustColors = [];
    for (let i = 0; i < 2200; i++) {
      const x = (rng() - 0.5) * 14000, y = x * 0.17 + (rng() - 0.5) * 700;
      dust.push(x, y, -6800); dustColors.push(0.15, 0.26 + rng() * 0.1, 0.4);
    }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3)); dustGeometry.setAttribute('color', new THREE.Float32BufferAttribute(dustColors, 3));
    this.scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ size: 12, transparent: true, opacity: 0.22, vertexColors: true })));
  }
  makeRock(rock) {
    const geometry = new THREE.IcosahedronGeometry(rock.radius, 2), vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), f = 3 / rock.radius;
      const s = 1 + 0.17 * Math.sin(x * f + rock.id) * Math.cos(y * f) * Math.sin(z * f + 2);
      vertices.setXYZ(i, x * s, y * s * (0.8 + (rock.id % 6) * 0.035), z * s);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: [0x9a9185, 0x798c99, 0x91858b, 0x888273, 0x7d9196, 0x9d8572][rock.id % 6], roughness: 0.93, flatShading: true }));
    this.scene.add(mesh); return mesh;
  }
  pickTarget(rocks, observerX) {
    if (!rocks.length) return null;
    const candidate = [...rocks].sort((a, b) =>
      Math.abs(Math.atan2(a.x - observerX, a.depth)) - Math.abs(Math.atan2(b.x - observerX, b.depth)) || a.depth - b.depth)[0];
    const meshes = [];
    for (const rock of rocks) {
      const mesh = this.rockMeshes.get(rock.id);
      if (!mesh) continue;
      mesh.userData.rockId = rock.id;
      mesh.position.set(rock.x, ROCK_HEIGHT, -rock.depth);
      mesh.updateMatrixWorld(true);
      meshes.push(mesh);
    }
    this.targetRay ??= new THREE.Raycaster();
    const origin = new THREE.Vector3(observerX, ROCK_HEIGHT, 0);
    const firstHit = direction => {
      this.targetRay.set(origin, direction.normalize());
      const hit = this.targetRay.intersectObjects(meshes, false)[0];
      return hit ? rocks.find(rock => rock.id === hit.object.userData.rockId) : null;
    };
    // Prefer the first visible rock under the crosshair, not its center angle.
    // When aiming between rocks, also check occlusion toward the nearest center.
    return firstHit(new THREE.Vector3(0, 0, -1)) ||
      firstHit(new THREE.Vector3(candidate.x - observerX, 0, -candidate.depth)) || candidate;
  }
  reset() {
    for (const mesh of this.rockMeshes.values()) this.dispose(mesh);
    this.rockMeshes.clear();
    for (const effect of this.effects) this.dispose(effect.mesh);
    this.effects = []; this.bomb.visible = false;
  }
  dispose(mesh) { this.scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
  explode(event) {
    const material = new THREE.MeshBasicMaterial({ color: event.kind === 'hit' ? 0x80ffda : 0xffad65, wireframe: true, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(BLAST_RADIUS, 2), material);
    mesh.position.set(event.x, ROCK_HEIGHT, -event.depth); this.scene.add(mesh);
    this.effects.push({ mesh, age: 0 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BLAST_RADIUS, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color: event.kind === 'hit' ? 0xaaffdf : 0xffd098, transparent: true, opacity: 1 }));
    ring.position.copy(mesh.position); this.scene.add(ring); this.effects.push({ mesh: ring, age: 0 });
  }
  project(x, depth, y = ROCK_HEIGHT) {
    const v = new THREE.Vector3(x, y, -depth).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (0.5 - v.y * 0.5) * this.height };
  }
  render(game, dt, measurement = null) {
    this.scanOverlay.update(measurement, game, this.camera.aspect);
    this.camera.position.x = game.x; this.camera.updateMatrixWorld();
    const ids = new Set(game.rocks.map(rock => rock.id));
    for (const [id, mesh] of this.rockMeshes) if (!ids.has(id)) { this.dispose(mesh); this.rockMeshes.delete(id); }
    for (const rock of game.rocks) {
      let mesh = this.rockMeshes.get(rock.id);
      if (!mesh) { mesh = this.makeRock(rock); this.rockMeshes.set(rock.id, mesh); }
      mesh.position.set(rock.x, ROCK_HEIGHT, -rock.depth);
    }
    this.bomb.visible = !!game.bomb;
    if (game.bomb) {
      this.bomb.position.set(game.bomb.x, -0.5 + (ROCK_HEIGHT + 0.5) * Math.min(1, game.bomb.depth / game.bomb.range), -Math.max(1, game.bomb.depth));
      this.bombHalo.scale.setScalar(1 + Math.sin(game.elapsed * 25) * 0.15);
    }
    for (const effect of this.effects) {
      effect.age += dt; effect.mesh.scale.setScalar(0.15 + Math.min(1, effect.age * 3.5));
      effect.mesh.material.opacity = Math.max(0, 1 - effect.age / 1.3);
    }
    this.effects = this.effects.filter(effect => { if (effect.age >= 1.3) { this.dispose(effect.mesh); return false; } return true; });
    this.renderer.render(this.scene, this.camera);
  }
  resize() {
    this.width = this.container.clientWidth; this.height = this.container.clientHeight;
    this.camera.aspect = this.width / Math.max(1, this.height); this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }
}
