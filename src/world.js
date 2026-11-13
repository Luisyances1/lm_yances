import * as THREE from 'three';
import { C } from './palette.js';
import { solid, polyline, segments, rng, smooth } from './ink.js';
import { river } from './terrain.js';
import { cloudLayer } from './clouds.js';
import { heightField, relief, fbm } from './relief.js';
import { vegetation, scatter, slopeAt } from './vegetation.js';
import { airportTexture, panel } from './label.js';
import { FLIGHTS } from './path.js';
import { campus, PAD as campusPad } from './stations/campus.js';
import { quipux, PAD as quipuxPad } from './stations/quipux.js';
import { gomedical, PAD as gomedicalPad } from './stations/gomedical.js';
import { metagroup, PAD as metagroupPad } from './stations/metagroup.js';
import { ascent } from './stations/ascent.js';
import { aunnait } from './stations/aunnait.js';

const MOUNTAINS = [
  [-38, -62, 20, 9], [54, -84, 24, 11], [-36, -118, 18, 10], [50, -150, 22, 12], [-46, -178, 20, 9],
  [58, -205, 18, 8], [-36, -236, 22, 9], [62, -252, 16, 7],
  [60, -356, 22, 10], [-38, -386, 20, 11], [56, -444, 24, 12], [-48, -458, 22, 10], [-40, -505, 20, 9], [40, -490, 18, 9]
];

const RIVERS = [
  [[-60, 90], [-34, 50], [-26, 20], [-34, -20], [-20, -60], [-30, -90]],
  [[50, -240], [34, -270], [28, -310], [36, -350], [24, -380]]
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

function stationPlantings(field) {
  const list = [];
  const r = rng(808);
  const add = (kind, x, z, scale = 1) =>
    list.push({ kind, x, z, y: field(x, z), rot: r() * Math.PI * 2, scale: scale * (0.85 + r() * 0.3), tone: Math.floor(r() * 8) });

  [[-18, 9], [16, -12]].forEach(([x, z]) => add('ceiba', x, z, 1.1));
  [[-17, -4], [18, -2], [-16, 14], [11, -15], [-11, -14], [-21, -8], [21, -14]].forEach(([x, z]) => add('palm', x, z, 0.8));
  [[-19, -12], [-13, 18], [3, -14], [-3, -15], [-20, 3], [8, -18]].forEach(([x, z]) => add('round', x, z));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    add('shrub', Math.cos(a) * 8.2, 6 + Math.sin(a) * 8.2, 0.9);
  }

  [[22, -312], [-6, -290], [-8, -306], [20, -318], [-12, -296]].forEach(([x, z]) => add('palm', x, z, 0.85));
  [[-7, -318], [24, -306], [-14, -312]].forEach(([x, z]) => add('round', x, z));
  [[-4, -312], [-2, -287]].forEach(([x, z]) => add('shrub', x, z));

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    add(i % 3 ? 'round' : 'highland', -10 + Math.cos(a) * 21, -149 + Math.sin(a) * 15);
    add(i % 3 ? 'round' : 'highland', -8 + Math.cos(a + 0.2) * 21, -450 + Math.sin(a + 0.2) * 20);
  }
  return list;
}

export function buildWorld(scene, path) {
  const riverLines = RIVERS.map((pts) =>
    new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(80)
  );
  const mr = rng(19);
  const mountains = MOUNTAINS.map(([x, z, r, levels], i) => {
    const a = mr() * Math.PI;
    return { x, z, r: r * 1.05, h: levels * 2.2, aspect: 1 + mr() * 0.8, cos: Math.cos(a), sin: Math.sin(a), seed: 10 + i * 1.7 };
  });
  const pads = [
    { ...campusPad, x: 0, z: 0 },
    { ...quipuxPad, x: -10, z: -150 },
    { ...gomedicalPad, x: 8, z: -300 },
    { ...metagroupPad, x: -8, z: -450 }
  ];
  const flats = AIRPORTS.map(([, , x, z]) => ({ x, z, r: 9 }));
  const field = heightField({ mountains, pads, rivers: riverLines, flats });
  relief(scene, field);
  const waters = RIVERS.map((pts) => river(scene, pts));

  const plantings = [...stationPlantings(field), ...scatter({
    field,
    seed: 42,
    count: matchMedia('(max-width: 760px)').matches ? 700 : 1500,
    area: [-200, 200, 110, -620],
    accept: (x, z, y, r) => {
      for (const p of pads) if (Math.hypot(x - p.x, z - p.z) < p.r * 1.4) return null;
      for (const f of flats) if (Math.hypot(x - f.x, z - f.z) < 30) return null;
      if (Math.hypot(x + 8, z + 488) < 16) return null;
      for (const k of path.keys) if (Math.hypot(x - k.cam[0], z - k.cam[2]) < 16) return null;
      if (y < 0.15 || slopeAt(field, x, z) > 0.95) return null;
      const m = fbm(x * 0.02, z * 0.02, 3, 9.1);
      const density = y > 3 ? 0.5 + m : 0.22 + m * 0.9;
      if (r() > density) return null;
      const k = r();
      if (y > 10) return k < 0.85 ? 'highland' : 'round';
      if (y > 3) return k < 0.5 ? 'highland' : k < 0.85 ? 'round' : 'shrub';
      const caribe = z > -70 || (z < -240 && z > -350);
      if (caribe) return k < 0.3 ? 'palm' : k < 0.38 ? 'ceiba' : k < 0.78 ? 'round' : 'shrub';
      return k < 0.6 ? 'round' : 'shrub';
    }
  })];
  const flora = vegetation(scene, plantings);

  const r = rng(77);
  const legs = AIRPORTS.slice(0, 3).map((a, i) => legCurve(a, AIRPORTS[i + 1]));
  const skyPlacements = [];
  const nearStation = (x, z) => pads.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 12);
  legs.forEach((curve) => {
    let placed = 0;
    let guard = 0;
    while (placed < 9 && guard++ < 60) {
      const p = curve.getPoint(0.15 + r() * 0.7);
      const side = r() > 0.5 ? 1 : -1;
      const x = p.x + side * (14 + r() * 30);
      const z = p.z + (r() - 0.5) * 34;
      if (nearStation(x, z)) continue;
      skyPlacements.push({ x, y: 24 + r() * 16, z, scale: 0.6 + r() * 0.6, rot: r() * Math.PI });
      placed++;
    }
  });
  for (let i = 0; i < 95; i++) {
    const a = r() * Math.PI * 2;
    const d = 20 + Math.sqrt(r()) * 80;
    skyPlacements.push({
      x: -8 + Math.cos(a) * d,
      y: 60 + r() * 8,
      z: -500 + Math.sin(a) * d * 1.2,
      scale: 1.2 + r() * 1.1,
      rot: r() * Math.PI
    });
  }
  const sky = cloudLayer(scene, skyPlacements);

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
      flora.update(t);
      sky.update(t);
      waters.forEach((w) => w.update(t));
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
