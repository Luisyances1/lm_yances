import * as THREE from 'three';
import { C } from './palette.js';
import { solid, toon } from './ink.js';

const PROFILES = {
  sedan: {
    body: [[-2.1, 0.3], [2.05, 0.3], [2.2, 0.55], [2.15, 0.8], [1.25, 0.95], [0.5, 1.42], [-0.8, 1.45], [-1.65, 1.02], [-2.15, 0.92], [-2.2, 0.55]],
    glass: [[1.12, 0.98], [0.5, 1.36], [-0.78, 1.38], [-1.45, 1.02]],
    width: 1.62,
    wheels: [1.28, -1.32],
    roof: 1.45
  },
  suv: {
    body: [[-2.15, 0.36], [2.05, 0.36], [2.2, 0.62], [2.12, 0.95], [1.45, 1.08], [0.85, 1.7], [-1.95, 1.72], [-2.2, 1.4], [-2.22, 0.62]],
    glass: [[1.3, 1.12], [0.82, 1.62], [-1.9, 1.64], [-2.05, 1.14]],
    width: 1.72,
    wheels: [1.35, -1.35],
    roof: 1.72
  },
  hatch: {
    body: [[-1.75, 0.3], [1.85, 0.3], [1.98, 0.55], [1.92, 0.78], [1.1, 0.92], [0.4, 1.38], [-1.35, 1.42], [-1.72, 1.08], [-1.8, 0.55]],
    glass: [[0.98, 0.95], [0.4, 1.32], [-1.3, 1.35], [-1.6, 1.0]],
    width: 1.58,
    wheels: [1.15, -1.15],
    roof: 1.42
  }
};

function smoothShape(points, round = 0.35) {
  const shape = new THREE.Shape();
  const n = points.length;
  const p = (i) => new THREE.Vector2(...points[(i + n) % n]);
  for (let i = 0; i < n; i++) {
    const prev = p(i - 1);
    const cur = p(i);
    const next = p(i + 1);
    const a = cur.clone().lerp(prev, round * 0.5);
    const b = cur.clone().lerp(next, round * 0.5);
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  shape.closePath();
  return shape;
}

function extrudeSide(points, width, round, bevel) {
  const g = new THREE.ExtrudeGeometry(smoothShape(points, round), {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 6
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  return g;
}

function wheel() {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), toon(C.ink));
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12), toon(C.steel));
  hub.rotation.x = Math.PI / 2;
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.3), toon(C.slate));
  g.add(tire, hub, spoke);
  return g;
}

export function vehicle(kind = 'sedan', color = C.blue, { taxi = false } = {}) {
  const spec = PROFILES[kind];
  const car = new THREE.Group();
  const body = solid(extrudeSide(spec.body, spec.width, 0.55, 0.14), color, { angle: 32, width: 0.9 });
  car.add(body);
  const glass = new THREE.Mesh(extrudeSide(spec.glass, spec.width + 0.04, 0.3, 0.05), toon(C.slate));
  car.add(glass);

  const lights = new THREE.Group();
  const front = Math.max(...spec.body.map(([x]) => x));
  const rear = Math.min(...spec.body.map(([x]) => x));
  [-1, 1].forEach((side) => {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: true }));
    head.position.set(front + 0.02, 0.68, side * (spec.width / 2 - 0.3));
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: C.magenta, fog: true }));
    tail.position.set(rear - 0.02, 0.72, side * (spec.width / 2 - 0.3));
    lights.add(head, tail);
  });
  lights.traverse((o) => (o.userData.noCast = true));
  car.add(lights);

  if (taxi) {
    const sign = solid(new THREE.BoxGeometry(0.55, 0.22, 0.7), C.white, { width: 0.8 });
    sign.position.set(-0.15, spec.roof + 0.11, 0);
    car.add(sign);
  }

  const wheels = [];
  spec.wheels.forEach((x) => {
    [-1, 1].forEach((side) => {
      const w = wheel();
      w.position.set(x, 0.36, side * (spec.width / 2 - 0.06));
      car.add(w);
      wheels.push(w);
    });
  });

  car.scale.setScalar(0.62);
  car.userData.wheels = wheels;
  return car;
}

export const TAXI = 0xe9b72c;
