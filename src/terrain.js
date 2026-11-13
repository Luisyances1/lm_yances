import * as THREE from 'three';
import { C } from './palette.js';
import { polyline, outline, toon } from './ink.js';
import { fbm, perlin, smoothstep, reliefMaterial } from './relief.js';

const waterVertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const waterFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uWater;
uniform vec3 uDeep;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
void main() {
  float across = abs(vUv.y - 0.5) * 2.0;
  vec3 col = mix(uDeep, uWater, smoothstep(0.0, 0.95, across));
  float s = vUv.x * 0.32 - uTime * 0.55;
  float wave = sin(s * 6.2831 + sin(vUv.y * 9.0 + vUv.x * 0.6) * 1.4);
  float streak = smoothstep(0.9, 1.0, wave) * (1.0 - across);
  col = mix(col, vec3(1.0), streak * 0.5);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function river(scene, points, width = 3) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0.04, p[1])));
  const samples = curve.getSpacedPoints(160);
  const left = [];
  const right = [];
  const dist = [0];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const q = samples[Math.min(i + 1, samples.length - 1)];
    const o = samples[Math.max(i - 1, 0)];
    const dir = q.clone().sub(o).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    left.push(p.clone().add(side));
    right.push(p.clone().sub(side));
    if (i > 0) dist.push(dist[i - 1] + p.distanceTo(samples[i - 1]));
  }
  const pos = [];
  const uv = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = left[i], b = right[i], c = left[i + 1], d = right[i + 1];
    const s0 = dist[i] / width;
    const s1 = dist[i + 1] / width;
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, c.x, c.y, c.z, b.x, b.y, b.z, d.x, d.y, d.z);
    uv.push(s0, 0, s0, 1, s1, 0, s1, 0, s0, 1, s1, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uWater: { value: new THREE.Color(C.water) }, uDeep: { value: new THREE.Color(0x7fa9cf) } }
    ]),
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    fog: true,
    side: THREE.DoubleSide
  });
  scene.add(new THREE.Mesh(geo, material));
  scene.add(polyline(left, { color: C.blue, width: 1.1 }));
  scene.add(polyline(right, { color: C.blue, width: 1.1 }));
  return { update: (t) => (material.uniforms.uTime.value = t) };
}

export function floatingIsland(seed) {
  const group = new THREE.Group();
  const R = 18;
  const rim = (a) => R * (1 + 0.1 * perlin.noise(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, 0.2) + 0.04 * Math.sin(a * 5 + seed));

  const top = new THREE.RingGeometry(0.01, R, 128, 28);
  top.rotateX(-Math.PI / 2);
  const tp = top.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const r = Math.hypot(x, z) / R;
    const a = Math.atan2(z, x);
    const k = rim(a) / R;
    const y = 2 + 0.25 * fbm(x * 0.12, z * 0.12, 3, seed) - 1.7 * Math.pow(smoothstep(0.78, 1.0, r), 1.5);
    tp.setXYZ(i, x * k, y, z * k);
  }
  top.computeVertexNormals();
  group.add(new THREE.Mesh(top, reliefMaterial({ base: 70, grid: false })));

  const profile = [
    [1.0, 0.3], [0.97, -0.6], [0.86, -3.5], [0.7, -8], [0.5, -13], [0.3, -18], [0.12, -22.5], [0.0, -24.5]
  ].reverse().map(([r, y]) => new THREE.Vector2(r * R, y));
  const under = new THREE.LatheGeometry(profile, 128);
  const up = under.attributes.position;
  for (let i = 0; i < up.count; i++) {
    const x = up.getX(i);
    const y = up.getY(i);
    const z = up.getZ(i);
    const a = Math.atan2(z, x);
    const depth = Math.min(1, Math.max(0, -y / 24));
    const k = (rim(a) / R) * (1 + depth * 0.22 * perlin.noise(Math.cos(a) * 2.2, y * 0.18, seed));
    up.setXYZ(i, x * k, y, z * k);
  }
  under.computeVertexNormals();
  group.add(new THREE.Mesh(under, toon(C.umber, { cache: false })));

  const edge = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const r = rim(a) + 0.02;
    edge.push(new THREE.Vector3(Math.cos(a) * r, 0.32, Math.sin(a) * r));
  }
  group.add(polyline(edge, { color: C.contour, width: 1.6 }));
  group.userData.top = 2;
  return group;
}

export { outline, toon };
