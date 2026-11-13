import * as THREE from 'three';
import { C, HYPSO } from './palette.js';
import { solid, rng, polyline, outline, toon } from './ink.js';

export function blob(r, phases, noise, jitter = 0) {
  const shape = new THREE.Shape();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    let k = 0;
    phases.forEach(([f, ph, amp]) => (k += Math.sin(a * f + ph + jitter) * amp));
    const rr = r * (1 + noise * k);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

export function contourStack({
  r0 = 10,
  levels = 3,
  step = 1,
  taper = 0.12,
  peak = false,
  seed = 1,
  noise = 0.16,
  colors = HYPSO,
  lineColor = C.contour,
  width = 1.2,
  freqs = [2, 3, 5]
} = {}) {
  const r = rng(seed);
  const phases = freqs.map((f) => [f, r() * Math.PI * 2, 0.35 + r() * 0.65]);
  const group = new THREE.Group();
  for (let i = 0; i < levels; i++) {
    const ratio = peak ? 1 - (i / levels) * 0.9 : 1 - i * taper;
    const shape = blob(r0 * ratio, phases, noise, i * 0.25);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: step, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const colorIndex = peak ? Math.min(colors.length - 1, Math.floor((i / levels) * colors.length)) : Math.min(colors.length - 1, i);
    const mesh = solid(geo, colors[colorIndex], { angle: 40, lineColor, width });
    mesh.position.y = i * step;
    group.add(mesh);
  }
  group.userData.top = levels * step;
  return group;
}

export function cloud(seed, scale = 1) {
  const g = contourStack({
    r0: 5 * scale,
    levels: 3,
    step: 1.1 * scale,
    taper: 0.22,
    seed,
    noise: 0.22,
    freqs: [3, 5, 7],
    colors: [C.cloud, C.cloud, C.cloud],
    lineColor: C.shadow,
    width: 1
  });
  return g;
}

export function ground(scene) {
  const geo = new THREE.PlaneGeometry(700, 1000);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: C.lowland, fog: true });
  const plane = new THREE.Mesh(geo, mat);
  plane.position.set(0, -0.05, -280);
  scene.add(plane);

  const flat = [];
  for (let x = -225; x <= 225; x += 25) flat.push(x, 0.02, 120, x, 0.02, -700);
  for (let z = 100; z >= -700; z -= 25) flat.push(-240, 0.02, z, 240, 0.02, z);
  const geoL = new THREE.BufferGeometry();
  geoL.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
  const grat = new THREE.LineSegments(
    geoL,
    new THREE.LineBasicMaterial({ color: C.blue, transparent: true, opacity: 0.28, fog: true })
  );
  scene.add(grat);
}

export function river(scene, points, width = 3) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0.04, p[1])));
  const samples = curve.getSpacedPoints(120);
  const left = [];
  const right = [];
  const pos = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const q = samples[Math.min(i + 1, samples.length - 1)];
    const o = samples[Math.max(i - 1, 0)];
    const dir = q.clone().sub(o).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    left.push(p.clone().add(side));
    right.push(p.clone().sub(side));
  }
  for (let i = 0; i < samples.length - 1; i++) {
    const a = left[i], b = right[i], c = left[i + 1], d = right[i + 1];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, c.x, c.y, c.z, b.x, b.y, b.z, d.x, d.y, d.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.water, side: THREE.DoubleSide, fog: true }));
  scene.add(mesh);
  scene.add(polyline(left, { color: C.blue, width: 1.1 }));
  scene.add(polyline(right, { color: C.blue, width: 1.1 }));
}

export function floatingIsland(seed) {
  const g = contourStack({ r0: 18, levels: 3, step: 1, taper: 0.1, seed, colors: [C.sand, C.ochre, C.peak] });
  const under = new THREE.ConeGeometry(16, 22, 9, 1);
  under.rotateX(Math.PI);
  const rock = solid(under, C.umber, { angle: 30, lineColor: C.contour });
  rock.position.y = -11;
  g.add(rock);
  return g;
}

export { outline, toon };
