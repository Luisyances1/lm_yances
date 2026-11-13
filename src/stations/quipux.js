import * as THREE from 'three';
import { C, hex } from '../palette.js';
import { box, solid, segments, polyline, rng } from '../ink.js';
import { canvasTexture, sprite, roundRect } from '../label.js';
import { vehicle, TAXI } from '../vehicles.js';

function windows(w, h, d, cx, cy, cz) {
  const flat = [];
  const z = cz + d / 2 + 0.02;
  const x = cx + w / 2 + 0.02;
  for (let y = cy - h / 2 + 1.2; y < cy + h / 2 - 0.4; y += 1.2) {
    flat.push(cx - w / 2, y, z, cx + w / 2, y, z);
    flat.push(x, y, cz - d / 2, x, y, cz + d / 2);
  }
  for (let k = cx - w / 2 + 1; k < cx + w / 2; k += 1) flat.push(k, cy - h / 2, z, k, cy + h / 2, z);
  for (let k = cz - d / 2 + 1; k < cz + d / 2; k += 1) flat.push(x, cy - h / 2, k, x, cy + h / 2, k);
  return segments(flat, { color: C.blue, width: 0.9, opacity: 0.75 });
}

const bubbleTexture = () =>
  canvasTexture(256, 200, (ctx) => {
    ctx.fillStyle = hex(C.blue);
    roundRect(ctx, 8, 8, 240, 140, 36);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(60, 140);
    ctx.lineTo(48, 192);
    ctx.lineTo(110, 140);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    [80, 128, 176].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 78, 14, 0, Math.PI * 2);
      ctx.fill();
    });
  });

export const PAD = { r: 27, top: 7, seed: 2.7 };

export function quipux() {
  const group = new THREE.Group();
  const top = PAD.top;

  group.add(box(17, 2, 9, C.steel, [-1, top + 1, -4]));
  group.add(box(5.5, 18, 5.5, C.peak, [-5, top + 11, -4]));
  group.add(windows(5.5, 18, 5.5, -5, top + 11, -4));
  group.add(box(5.5, 13, 5.5, C.peak, [3, top + 8.5, -5]));
  group.add(windows(5.5, 13, 5.5, 3, top + 8.5, -5));
  group.add(box(6, 0.4, 6, C.steel, [-5, top + 20.2, -4]));
  group.add(box(6, 0.4, 6, C.steel, [3, top + 15.2, -5]));

  const ellipse = (a, s = 1) => new THREE.Vector3(Math.cos(a) * 15 * s, top + 0.08, Math.sin(a) * 10 * s + 1);
  const road = new THREE.RingGeometry(13.6, 16.4, 72, 1);
  road.rotateX(-Math.PI / 2);
  road.scale(1, 1, 10 / 15);
  const roadMesh = solid(road, C.steel, { angle: 60, width: 1, side: THREE.DoubleSide });
  roadMesh.position.set(0, top + 0.05, 1);
  group.add(roadMesh);
  const mid = [];
  for (let i = 0; i <= 96; i++) mid.push(ellipse((i / 96) * Math.PI * 2));
  group.add(polyline(mid, { color: C.white, width: 1.6, dashed: true, dash: 1.2, gap: 1 }));

  const r = rng(5);
  const cars = [];
  const fleet = [
    ['sedan', TAXI, true], ['suv', C.white], ['sedan', C.blue], ['hatch', C.magenta],
    ['sedan', TAXI, true], ['suv', C.slate], ['hatch', C.white]
  ];
  for (let i = 0; i < fleet.length; i++) {
    const [kind, color, taxi] = fleet[i];
    const c = vehicle(kind, color, { taxi });
    c.userData.phase = (i / 7) * Math.PI * 2 + r() * 0.3;
    c.userData.speed = 0.16 + r() * 0.05;
    group.add(c);
    cars.push(c);
  }

  const rings = cars.map(() => {
    const geo = new THREE.RingGeometry(0.9, 1.1, 40);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.magenta, transparent: true, opacity: 0, fog: true, side: THREE.DoubleSide }));
    group.add(m);
    return m;
  });

  const tex = bubbleTexture();
  const bubbles = [];
  for (let i = 0; i < 6; i++) {
    const s = sprite(tex, 2.2);
    s.userData = { phase: i / 6, car: i % cars.length, from: new THREE.Vector3(i % 2 ? 3 : -5, top + (i % 2 ? 15.6 : 20.6), i % 2 ? -5 : -4) };
    group.add(s);
    bubbles.push(s);
  }

  const P0 = new THREE.Vector3();
  const P1 = new THREE.Vector3();
  const P2 = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(P0, P1, P2);

  return {
    group,
    update(t) {
      cars.forEach((c) => {
        const a = c.userData.phase + t * c.userData.speed;
        const p = ellipse(a, 1.02);
        const q = ellipse(a + 0.02, 1.02);
        c.position.copy(p);
        c.position.y = top + 0.1;
        c.lookAt(q.x, top + 0.1, q.z);
        c.rotateY(-Math.PI / 2);
        c.userData.wheels.forEach((w) => (w.rotation.z = -a * 40));
      });
      rings.forEach((ring) => (ring.material.opacity *= 0.94));
      bubbles.forEach((b) => {
        const cycle = (t * 0.32 + b.userData.phase) % 1;
        if (cycle < b.userData.last) {
          b.userData.car = (b.userData.car + 3) % cars.length;
        }
        b.userData.last = cycle;
        const target = cars[b.userData.car].position;
        P0.copy(b.userData.from);
        P2.set(target.x, target.y + 1.8, target.z);
        P1.addVectors(P0, P2).multiplyScalar(0.5);
        P1.y += 8;
        curve.getPoint(Math.min(cycle / 0.85, 1), b.position);
        const vis = cycle < 0.85 ? Math.min(1, cycle * 8) : 0;
        b.material.opacity = vis;
        if (cycle > 0.85 && cycle < 0.9) {
          const ring = rings[b.userData.car];
          ring.position.set(target.x, top + 0.2, target.z);
          ring.material.opacity = 0.9;
          ring.scale.setScalar(1);
        }
      });
      rings.forEach((ring) => ring.scale.setScalar(Math.min(ring.scale.x * 1.025, 5)));
    }
  };
}
