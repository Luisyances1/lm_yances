import * as THREE from 'three';
import { C } from '../palette.js';
import { toon, smooth, rng } from '../ink.js';

const RINGS = 18;
const BARS = 40;

export function ascent() {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.55, 1, 0.55);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, toon(C.white, { cache: false }), RINGS * BARS);
  mesh.frustumCulled = false;
  group.add(mesh);

  const r = rng(91);
  const data = [];
  const series = [C.blue, C.forest, C.sand, C.steel].map((c) => new THREE.Color(c));
  const voice = new THREE.Color(C.magenta);
  const col = new THREE.Color();
  for (let i = 0; i < RINGS; i++) {
    const m = smooth(0.3, 0.72, i / (RINGS - 1));
    for (let j = 0; j < BARS; j++) {
      const idx = i * BARS + j;
      data.push({ v: 0.5 + r() * 3.2, m });
      col.copy(series[(j >> 2) % 4]).lerp(voice, m);
      mesh.setColorAt(idx, col);
    }
  }
  mesh.instanceColor.needsUpdate = true;

  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const P = new THREE.Vector3();
  const axis = new THREE.Vector3();

  function layout(t) {
    for (let i = 0; i < RINGS; i++) {
      const y = 10 + i * 3.6;
      for (let j = 0; j < BARS; j++) {
        const idx = i * BARS + j;
        const { v, m } = data[idx];
        const th = (j / BARS) * Math.PI * 2;
        const wave = 0.5 + 2.8 * Math.abs(Math.sin(th * 3 + t * 2.6 + i * 0.55)) * (0.55 + 0.45 * Math.sin(t * 4.5 + j * 0.7 + i));
        const L = THREE.MathUtils.lerp(v * (1 + 0.05 * Math.sin(t + j)), wave, m);
        const rad = THREE.MathUtils.lerp(7.5, 5.6, m);
        axis.set(Math.sin(th), 0, -Math.cos(th));
        Q.setFromAxisAngle(axis, (m * Math.PI) / 2);
        P.set(Math.cos(th) * rad, y, Math.sin(th) * rad);
        S.set(1, L, 1);
        M.compose(P, Q, S);
        mesh.setMatrixAt(idx, M);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  layout(0);

  return {
    group,
    update(t) {
      layout(t);
    }
  };
}
