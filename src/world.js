import * as THREE from 'three';
import { C } from './palette.js';
import { solid, polyline, segments, rng, smooth } from './ink.js';
import { ground, river, contourStack, cloud } from './terrain.js';
import { airportTexture, panel } from './label.js';
import { FLIGHTS } from './path.js';
import { campus } from './stations/campus.js';
import { quipux } from './stations/quipux.js';
import { gomedical } from './stations/gomedical.js';
import { metagroup } from './stations/metagroup.js';
import { ascent } from './stations/ascent.js';
import { aunnait } from './stations/aunnait.js';

const MOUNTAINS = [
  [-38, -62, 20, 9], [54, -84, 24, 11], [-36, -118, 18, 10], [50, -150, 22, 12], [-46, -178, 20, 9],
  [58, -205, 18, 8], [-36, -236, 22, 9], [62, -252, 16, 7],
  [60, -356, 22, 10], [-38, -386, 20, 11], [56, -444, 24, 12], [-48, -458, 22, 10], [-40, -505, 20, 9], [40, -490, 18, 9]
];

const AIRPORTS = [
  ['SKMR', 'Montería', 22, 16],
  ['SKRG', 'Medellín', 14, -114],
  ['SKMR', 'Montería', 30, -282],
  ['SKRG', 'Medellín', 16, -416]
];

function legCurve(a, b) {
  const A = new THREE.Vector3(a[2], 0.9, a[3]);
  const B = new THREE.Vector3(b[2], 0.9, b[3]);
  const dir = B.clone().sub(A).setY(0).normalize();
  const mid = A.clone().lerp(B, 0.5).setY(26);
  return new THREE.CatmullRomCurve3([
    A,
    A.clone().addScaledVector(dir, 10).setY(2.5),
    A.clone().addScaledVector(dir, 34).setY(12),
    mid,
    B.clone().addScaledVector(dir, -34).setY(12),
    B.clone().addScaledVector(dir, -10).setY(2.5),
    B
  ]);
}

function airplane() {
  const g = new THREE.Group();
  const body = new THREE.CylinderGeometry(0.42, 0.62, 5.2, 10);
  body.rotateX(Math.PI / 2);
  g.add(solid(body, C.white, { angle: 40 }));
  const nose = new THREE.ConeGeometry(0.42, 1.2, 10);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, 0, 3.2);
  g.add(solid(nose, C.white, { angle: 40 }));
  const wing = new THREE.BoxGeometry(7.4, 0.14, 1.4);
  wing.translate(0, -0.15, 0.3);
  g.add(solid(wing, C.blue));
  const stab = new THREE.BoxGeometry(2.8, 0.1, 0.8);
  stab.translate(0, 0.1, -2.3);
  g.add(solid(stab, C.blue));
  const fin = new THREE.BoxGeometry(0.12, 1.5, 1);
  fin.translate(0, 0.85, -2.3);
  g.add(solid(fin, C.magenta));
  return g;
}

export function buildWorld(scene, path) {
  ground(scene);
  river(scene, [[-60, 90], [-34, 50], [-26, 20], [-34, -20], [-20, -60], [-30, -90]]);
  river(scene, [[50, -240], [34, -270], [28, -310], [36, -350], [24, -380]]);

  MOUNTAINS.forEach(([x, z, r0, levels], i) => {
    const m = contourStack({ r0, levels, step: 2, peak: true, seed: 300 + i, noise: 0.2 });
    m.position.set(x, 0, z);
    scene.add(m);
  });

  const r = rng(77);
  const legs = AIRPORTS.slice(0, 3).map((a, i) => legCurve(a, AIRPORTS[i + 1]));
  legs.forEach((curve) => {
    for (let i = 0; i < 8; i++) {
      const p = curve.getPoint(0.2 + r() * 0.6);
      const c = cloud(500 + Math.floor(r() * 1000), 0.5 + r() * 0.6);
      const side = r() > 0.5 ? 1 : -1;
      c.position.set(p.x + side * (16 + r() * 26), 22 + r() * 14, p.z + (r() - 0.5) * 30);
      scene.add(c);
    }
  });
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = 22 + r() * 62;
    const x = -8 + Math.cos(a) * d;
    const z = -500 + Math.sin(a) * d * 1.2;
    const c = cloud(900 + i, 1 + r() * 1.4);
    c.position.set(x, 62 + r() * 6, z);
    scene.add(c);
  }

  AIRPORTS.forEach(([code, name, x, z]) => {
    const p = panel(airportTexture(code, name), 12);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.08, z);
    scene.add(p);
  });

  const ticks = [];
  legs.forEach((curve) => {
    const pts = curve.getSpacedPoints(160);
    scene.add(polyline(pts, { color: C.magenta, width: 3 }));
    for (let i = 3; i < pts.length - 1; i += 5) {
      const a = pts[i];
      const d = pts[i + 1].clone().sub(a);
      const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(0.8);
      ticks.push(a.x - side.x, a.y, a.z - side.z, a.x + side.x, a.y, a.z + side.z);
    }
  });
  scene.add(segments(ticks, { color: C.magenta, width: 2 }));

  const plane = airplane();
  scene.add(plane);

  const stations = [
    { s: campus(), pos: [0, 0, 0], kf: 1 },
    { s: quipux(), pos: [-10, 0, -150], kf: 4 },
    { s: gomedical(), pos: [8, 0, -300], kf: 7 },
    { s: metagroup(), pos: [-8, 0, -450], kf: 10 },
    { s: ascent(), pos: [-8, 0, -488], kf: 13, reach: 3.5 },
    { s: aunnait(), pos: [-8, 80, -524], kf: 15 }
  ];
  stations.forEach(({ s, pos }) => {
    s.group.position.set(...pos);
    scene.add(s.group);
  });

  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const chasePos = new THREE.Vector3();
  const chaseLook = new THREE.Vector3();
  const lookNow = new THREE.Vector3();

  return {
    update(t, dt, u, camera, look) {
      stations.forEach(({ s, kf, reach = 1.6 }) => {
        const d = Math.abs(u - kf);
        s.group.visible = d < 5.5;
        if (!s.group.visible) return;
        const focus = 1 - smooth(reach * 0.5, reach * 1.6, d);
        s.update(t, dt, focus);
      });

      const index = FLIGHTS.findIndex(([a, b]) => u > a && u < b);
      plane.visible = index >= 0;
      if (index < 0) return;
      const [a, b] = FLIGHTS[index];
      const curve = legs[index];
      const s = smooth(a, b, u);
      curve.getPoint(s, A);
      curve.getPoint(Math.min(1, s + 0.01), B);
      plane.position.copy(A);
      plane.lookAt(B);
      plane.rotateZ(Math.sin(t * 0.9) * 0.06);

      dir.subVectors(B, A).normalize();
      chasePos.copy(A).addScaledVector(dir, -24);
      chasePos.y = Math.max(chasePos.y, A.y) + 8;
      chasePos.x += 5;
      chaseLook.copy(A).addScaledVector(dir, 22);
      chaseLook.y = A.y - 2;
      const w = smooth(a, a + 0.55, u) * (1 - smooth(b - 0.55, b, u));
      camera.position.lerp(chasePos, w);
      lookNow.copy(look).lerp(chaseLook, w);
      camera.lookAt(lookNow);
    }
  };
}
