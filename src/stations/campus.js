import * as THREE from 'three';
import { C } from '../palette.js';
import { box, solid, polyline, rng } from '../ink.js';
import { contourStack } from '../terrain.js';

function tree(r, x, z, y) {
  const g = new THREE.Group();
  const h = 2.4 + r() * 1.8;
  const trunk = box(0.35, 1.2, 0.35, C.umber, [0, 0.6, 0], { width: 1 });
  const crown = solid(new THREE.ConeGeometry(1 + r() * 0.5, h, 7), C.forest, { angle: 30, width: 1.1 });
  crown.position.y = 1.2 + h / 2;
  g.add(trunk, crown);
  g.position.set(x, y, z);
  return g;
}

export function campus() {
  const group = new THREE.Group();
  const island = contourStack({ r0: 24, levels: 2, step: 1, taper: 0.1, seed: 11, colors: [C.meadow, C.ochre] });
  group.add(island);
  const top = island.userData.top;

  const plaza = solid(new THREE.CylinderGeometry(7, 7, 0.12, 48), C.peak, { angle: 30, width: 1 });
  plaza.position.set(0, top + 0.06, 6);
  group.add(plaza);

  group.add(box(18, 4.4, 6, C.peak, [0, top + 2.2, -3]));
  group.add(box(19.4, 0.5, 7.6, C.steel, [0, top + 4.65, -2.4]));
  for (let i = 0; i < 9; i++) {
    const col = solid(new THREE.CylinderGeometry(0.32, 0.32, 4.2, 10), C.white, { angle: 40, width: 1 });
    col.position.set(-8 + i * 2, top + 2.1, 0.9);
    group.add(col);
  }
  group.add(box(19.4, 0.4, 2.2, C.sand, [0, top + 0.2, 1.4]));

  const pediment = new THREE.Shape();
  pediment.moveTo(-6, 0);
  pediment.lineTo(6, 0);
  pediment.lineTo(0, 2.2);
  pediment.closePath();
  const ped = solid(new THREE.ExtrudeGeometry(pediment, { depth: 1, bevelEnabled: false }), C.peak);
  ped.position.set(0, top + 4.9, 0.6);
  group.add(ped);

  const tower = box(3.2, 11, 3.2, C.peak, [-12.5, top + 5.5, -2]);
  group.add(tower);
  group.add(box(3.8, 0.5, 3.8, C.steel, [-12.5, top + 11.2, -2]));
  const face = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    face.push(new THREE.Vector3(-12.5 + Math.cos(a) * 1.1, top + 8.6 + Math.sin(a) * 1.1, -0.36));
  }
  group.add(polyline(face, { color: C.ink, width: 1.4 }));
  group.add(
    polyline([new THREE.Vector3(-12.5, top + 8.6, -0.35), new THREE.Vector3(-12.5, top + 9.4, -0.35)], { width: 1.6 }),
    polyline([new THREE.Vector3(-12.5, top + 8.6, -0.35), new THREE.Vector3(-11.9, top + 8.6, -0.35)], { width: 1.6 })
  );

  const r = rng(7);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = 12 + r() * 8;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d * 0.8;
    if (z > -6 && z < 10 && Math.abs(x) < 13) continue;
    group.add(tree(r, x, z, top));
  }

  const cap = new THREE.Group();
  const board = box(5, 0.28, 5, C.slate, [0, 0, 0], { lineColor: C.ink });
  board.rotation.y = Math.PI / 4;
  const skull = solid(new THREE.CylinderGeometry(1.7, 1.9, 1.4, 20), C.slate, { angle: 40 });
  skull.position.y = -0.8;
  const button = solid(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), C.magenta, { line: false });
  button.position.y = 0.24;
  const corner = new THREE.Vector3(0, 0.2, 3.5);
  const tassel = polyline(
    [new THREE.Vector3(0, 0.25, 0), corner, corner.clone().add(new THREE.Vector3(0, -2.4, 0.2))],
    { color: C.magenta, width: 3 }
  );
  cap.add(board, skull, button, tassel);
  cap.position.set(-2, top + 12, -3);
  group.add(cap);

  return {
    group,
    update(t) {
      cap.rotation.y = t * 0.45;
      cap.position.y = top + 12 + Math.sin(t * 1.2) * 0.4;
      cap.rotation.z = Math.sin(t * 0.8) * 0.06;
    }
  };
}
