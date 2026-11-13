import * as THREE from 'three';

export const KEYS = [
  { cam: [0, 36, 74], look: [0, 4, -30], p: 0, hold: 0.05 },
  { cam: [16, 13, 30], look: [-1, 6, -1], p: 0.09, hold: 0.05 },
  { cam: [6, 22, -28], look: [-2, 26, -80], p: 0.145 },
  { cam: [-4, 30, -88], look: [-9, 18, -150], p: 0.195 },
  { cam: [16, 25, -112], look: [-8, 13, -150], p: 0.26, hold: 0.05 },
  { cam: [-2, 30, -188], look: [4, 26, -240], p: 0.315 },
  { cam: [9, 25, -240], look: [8, 5, -300], p: 0.36 },
  { cam: [27, 17, -266], look: [3, 7, -300], p: 0.42, hold: 0.05 },
  { cam: [6, 28, -335], look: [-4, 28, -390], p: 0.475 },
  { cam: [-6, 30, -397], look: [-8, 14, -450], p: 0.52 },
  { cam: [14, 23, -416], look: [-8, 12, -450], p: 0.585, hold: 0.05 },
  { cam: [-1, 25, -462], look: [-8, 28, -490], p: 0.615 },
  { cam: [-8, 15, -483], look: [-8, 32, -495], p: 0.66 },
  { cam: [-8, 44, -487], look: [-8, 70, -497], p: 0.72, hold: 0.02 },
  { cam: [-6, 90, -488], look: [-8, 85, -520], p: 0.775 },
  { cam: [15, 97, -486], look: [-6, 86, -526], p: 0.85, hold: 0.05 },
  { cam: [34, 108, -470], look: [-8, 82, -524], p: 1, hold: 0.03 }
];

export const FLIGHTS = [
  [1.15, 3.85],
  [4.15, 6.85],
  [7.15, 9.85]
];

export function createPath() {
  const n = KEYS.length;
  const camCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.cam)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');
  const P = new THREE.Vector3();
  const L = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  function progressToU(p) {
    for (let i = 0; i < n - 1; i++) {
      const a = KEYS[i];
      const b = KEYS[i + 1];
      const aEnd = a.p + (a.hold || 0) / 2;
      const bStart = b.p - (b.hold || 0) / 2;
      if (p <= aEnd) return i;
      if (p < bStart) {
        const s = (p - aEnd) / (bStart - aEnd);
        let e = s;
        if (a.hold && b.hold) e = s * s * (3 - 2 * s);
        else if (a.hold) e = 1 - Math.cos((s * Math.PI) / 2);
        else if (b.hold) e = Math.sin((s * Math.PI) / 2);
        return i + e;
      }
    }
    return n - 1;
  }

  const clampT = (u) => Math.min(1, Math.max(0, u / (n - 1)));

  function apply(camera, u, px = 0, py = 0) {
    const t = clampT(u);
    camCurve.getPoint(t, P);
    lookCurve.getPoint(t, L);
    fwd.subVectors(L, P).normalize();
    right.crossVectors(fwd, Y);
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    right.normalize();
    up.crossVectors(right, fwd).normalize();
    const k = camera.aspect >= 1 ? 1 : 1 + (1 - camera.aspect) * 0.9;
    camera.position.copy(L).addScaledVector(P.sub(L), k).addScaledVector(right, px * 1.4).addScaledVector(up, py * 0.9);
    camera.lookAt(L);
    return L;
  }

  const pointAt = (u, target = new THREE.Vector3()) => camCurve.getPoint(clampT(u), target);

  return { n, camCurve, lookCurve, progressToU, apply, pointAt, keys: KEYS };
}
