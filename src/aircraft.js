import * as THREE from 'three';
import { C } from './palette.js';
import { solid, toon } from './ink.js';

const L = 7.2;
const R = 0.46;

function fuselage() {
  const pts = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let r;
    if (t < 0.12) r = R * Math.sqrt(t / 0.12) * (0.9 + 0.1 * t / 0.12);
    else if (t < 0.7) r = R;
    else r = R - (R - 0.1) * Math.pow((t - 0.7) / 0.3, 1.3);
    pts.push(new THREE.Vector2(Math.max(r, 0.001), (1 - t) * L));
  }
  pts.reverse();
  const g = new THREE.LatheGeometry(pts, 24);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, -L / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const k = Math.min(1, Math.max(0, (-L / 2 + 2.3 - z) / 2.3));
    const tail = k * k * (3 - 2 * k);
    pos.setY(i, pos.getY(i) + tail * 0.42);
  }
  g.computeVertexNormals();
  return g;
}

function planform(span, root, tip, sweep, thickness) {
  const s = new THREE.Shape();
  s.moveTo(-span / 2, -sweep - tip / 2);
  s.lineTo(0, -root / 2);
  s.lineTo(span / 2, -sweep - tip / 2);
  s.lineTo(span / 2, -sweep + tip / 2);
  s.lineTo(0, root / 2);
  s.lineTo(-span / 2, -sweep + tip / 2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.4,
    bevelSize: thickness * 0.5,
    bevelSegments: 2
  });
  g.translate(0, 0, -thickness / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

function nacelle() {
  const pts = [
    [0.001, 0], [0.12, 0.08], [0.2, 0.3], [0.21, 0.9], [0.16, 1.35], [0.08, 1.55], [0.001, 1.6]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 16);
  g.rotateX(-Math.PI / 2);
  return g;
}

function propeller() {
  const g = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.11, 0.95, 0.03);
  bladeGeo.translate(0, 0.5, 0);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(bladeGeo, toon(C.slate));
    b.rotation.z = (i / 6) * Math.PI * 2;
    b.rotation.y = 0.35;
    g.add(b);
  }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshBasicMaterial({ color: C.slate, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, fog: true })
  );
  disc.userData.noCast = true;
  g.add(disc);
  const spinner = solid(new THREE.ConeGeometry(0.13, 0.32, 12), C.white, { line: false });
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.12;
  g.add(spinner);
  return g;
}

export function createAircraft() {
  const plane = new THREE.Group();
  const body = new THREE.Group();
  plane.add(body);

  body.add(solid(fuselage(), C.white, { angle: 35, width: 1.1 }));

  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.012, R * 1.012, L * 0.56, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76),
    toon(C.blue)
  );
  belly.rotation.x = Math.PI / 2;
  belly.position.z = 0.15;
  body.add(belly);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.98, 20, 10, -0.9, 1.8, 0.95, 0.42),
    new THREE.MeshBasicMaterial({ color: C.ink, fog: true })
  );
  cockpit.rotation.x = Math.PI / 2;
  cockpit.position.z = L / 2 - 0.62;
  cockpit.scale.set(1, 1.15, 1);
  body.add(cockpit);

  const windowGeo = new THREE.BoxGeometry(0.03, 0.13, 0.11);
  const windows = new THREE.InstancedMesh(windowGeo, new THREE.MeshBasicMaterial({ color: C.ink, fog: true }), 28);
  const M = new THREE.Matrix4();
  for (let i = 0; i < 14; i++) {
    const z = L / 2 - 1.35 - i * 0.28;
    M.makeTranslation(R * 0.985, 0.1, z);
    windows.setMatrixAt(i * 2, M);
    M.makeTranslation(-R * 0.985, 0.1, z);
    windows.setMatrixAt(i * 2 + 1, M);
  }
  windows.userData.noCast = true;
  body.add(windows);

  const wing = solid(planform(7.6, 0.95, 0.5, 0.12, 0.1), C.white, { angle: 30, width: 1 });
  wing.position.set(0, R * 0.92, 0.55);
  body.add(wing);

  const props = [];
  [-1.35, 1.35].forEach((x) => {
    const n = solid(nacelle(), C.white, { angle: 40, width: 1 });
    n.position.set(x, R * 0.62, 1.55);
    body.add(n);
    const p = propeller();
    p.position.set(x, R * 0.62, 1.6);
    body.add(p);
    props.push(p);
  });

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.5, 0);
  finShape.lineTo(1.45, 1.75);
  finShape.lineTo(0.95, 1.75);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  finGeo.translate(0, 0, -0.04);
  finGeo.rotateY(Math.PI / 2);
  const fin = solid(finGeo, C.blue, { angle: 30, width: 1 });
  fin.position.set(0, R * 0.55 + 0.42, -L / 2 + 1.55);
  body.add(fin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 1.0), toon(C.magenta));
  stripe.position.set(0, R * 0.55 + 0.42 + 0.9, -L / 2 + 0.98);
  stripe.rotation.x = -0.5;
  body.add(stripe);

  const stab = solid(planform(2.8, 0.6, 0.35, 0.18, 0.07), C.blue, { angle: 30, width: 1 });
  stab.position.set(0, R * 0.55 + 0.42 + 1.78, -L / 2 + 0.45);
  body.add(stab);

  let roll = 0;
  return {
    object: plane,
    update(dt, turn, t) {
      props.forEach((p, i) => (p.rotation.z = t * (i ? 38 : -38)));
      const target = THREE.MathUtils.clamp(-turn * 9, -0.55, 0.55);
      roll += (target - roll) * Math.min(1, dt * 2.5);
      body.rotation.z = roll + Math.sin(t * 0.9) * 0.03;
    }
  };
}

export function airportModel(heading) {
  const g = new THREE.Group();
  const runway = solid(new THREE.BoxGeometry(2.6, 0.12, 26), C.slate, { angle: 30, width: 1 });
  runway.position.y = 0.06;
  g.add(runway);
  const marks = new THREE.Group();
  const dash = new THREE.BoxGeometry(0.14, 0.02, 1.2);
  const white = new THREE.MeshBasicMaterial({ color: C.white, fog: true });
  for (let z = -10.5; z <= 10.5; z += 2.4) {
    const d = new THREE.Mesh(dash, white);
    d.position.set(0, 0.13, z);
    marks.add(d);
  }
  const bar = new THREE.BoxGeometry(0.16, 0.02, 1.4);
  [-12, 12].forEach((z) => {
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      const b = new THREE.Mesh(bar, white);
      b.position.set(k * 0.32, 0.13, z);
      marks.add(b);
    }
  });
  marks.traverse((o) => (o.userData.noCast = true));
  g.add(marks);

  const apron = solid(new THREE.BoxGeometry(5, 0.08, 9), C.steel, { angle: 30, width: 0.9 });
  apron.position.set(4.2, 0.04, 2);
  g.add(apron);
  const terminal = solid(new THREE.BoxGeometry(2.4, 1.3, 6.5), C.peak, { width: 1 });
  terminal.position.set(7.4, 0.65, 2);
  g.add(terminal);
  const roof = solid(new THREE.BoxGeometry(2.8, 0.18, 6.9), C.blue, { width: 1 });
  roof.position.set(7.4, 1.38, 2);
  g.add(roof);
  const towerShaft = solid(new THREE.CylinderGeometry(0.32, 0.4, 3.6, 12), C.peak, { angle: 40, width: 1 });
  towerShaft.position.set(7.2, 1.8, -3.2);
  g.add(towerShaft);
  const cab = solid(new THREE.CylinderGeometry(0.85, 0.6, 0.8, 8), C.slate, { angle: 30, width: 1 });
  cab.position.set(7.2, 3.95, -3.2);
  g.add(cab);
  const cap = solid(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 8), C.white, { angle: 30, width: 1 });
  cap.position.set(7.2, 4.42, -3.2);
  g.add(cap);

  g.rotation.y = Math.atan2(heading.x, heading.z);
  return g;
}
