import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from './palette.js';
import { perlin, fbm } from './relief.js';
import { rng, toon } from './ink.js';
import { shadowVertexPars, shadowVertex, shadowFragmentPars, lightUniforms, LIGHT_DIR } from './lighting.js';

const LIGHT = LIGHT_DIR;

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#ifndef OUTLINE
${shadowVertexPars}
#endif
uniform float uTime;
uniform float uSway;
uniform float uGrow;
uniform vec2 uRange;
varying vec3 vN;
varying vec3 vCol;
varying float vTone;
void main() {
  vec3 p = position;
  vec3 n = normal;
  #ifdef OUTLINE
    p += normal * uGrow;
  #endif
  vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float lift = max(position.y, 0.0);
  float phase = origin.x * 0.17 + origin.z * 0.13;
  vec2 wind = vec2(sin(uTime * 1.3 + phase), cos(uTime * 1.05 + phase * 1.3)) * 0.035 * uSway * lift;
  world.xz += wind;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  vTone = smoothstep(uRange.x, uRange.y, position.y);
  vec4 worldPosition = world;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #ifndef OUTLINE
    vec3 transformedNormal = (viewMatrix * vec4(vN, 0.0)).xyz;
    ${shadowVertex}
  #endif
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uLight;
varying vec3 vN;
varying vec3 vCol;
varying float vTone;
#include <common>
#include <fog_pars_fragment>
#ifndef OUTLINE
${shadowFragmentPars}
#endif
void main() {
  #ifdef OUTLINE
    vec3 col = uColor;
  #else
    vec3 base = uColor * vCol;
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float d = dot(n, uLight);
    float lit = smoothstep(-0.35, 0.9, d);
    vec3 col = mix(mix(base, uShadow, 0.5), base * 1.06, lit);
    col *= mix(0.74, 1.0, vTone);
    col = shade(sky(col, n), uShadow, 0.9);
  #endif
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function foliageMaterial({ color = C.white, sway = 1, range = [0, 1], side = THREE.FrontSide, outline = false, grow = 0.09 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      outline ? {} : lightUniforms(),
      {
        uColor: { value: new THREE.Color(outline ? C.ink : color) },
        uShadow: { value: new THREE.Color(C.shadow) },
        uLight: { value: LIGHT.clone() },
        uSway: { value: sway },
        uGrow: { value: grow },
        uRange: { value: new THREE.Vector2(...range) }
      }
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: outline ? { OUTLINE: '' } : {},
    side: outline ? THREE.BackSide : side,
    fog: true,
    lights: !outline
  });
}

function lobe(radius, seed, squash = 1) {
  let g = new THREE.IcosahedronGeometry(radius, 2);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const n = fbm(dir.x * 1.8 + seed, dir.z * 1.8 + dir.y * 1.3, 3, seed);
    const bump = 0.08 * perlin.noise(dir.x * 6 + seed, dir.y * 6, dir.z * 6);
    v.multiplyScalar(1 + 0.32 * n + bump);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function canopy(seed, lobes) {
  const r = rng(seed * 997);
  const parts = lobes.map(([x, y, z, rad, squash]) => {
    const g = lobe(rad * (0.9 + r() * 0.2), seed + x * 3.1 + z, squash);
    g.translate(x, y, z);
    return g;
  });
  return mergeGeometries(parts);
}

function roundCanopy(seed) {
  const r = rng(seed);
  const lobes = [[0, 3.7, 0, 1.55, 0.9]];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    lobes.push([Math.cos(a) * 1.05, 3.3 + r() * 0.8, Math.sin(a) * 1.05, 1.0 + r() * 0.3, 0.85]);
  }
  return canopy(seed, lobes);
}

function ceibaCanopy(seed) {
  const r = rng(seed);
  const lobes = [[0, 5.6, 0, 1.9, 0.5]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.4;
    const d = 2.2 + r() * 0.8;
    lobes.push([Math.cos(a) * d, 5.1 + r() * 0.5, Math.sin(a) * d, 1.3 + r() * 0.4, 0.5]);
  }
  return canopy(seed, lobes);
}

function highlandCanopy(seed) {
  const r = rng(seed);
  const lobes = [];
  for (let i = 0; i < 4; i++) {
    lobes.push([(r() - 0.5) * 0.4, 2.2 + i * 1.15, (r() - 0.5) * 0.4, 1.25 - i * 0.22, 1.05]);
  }
  return canopy(seed, lobes);
}

function shrubCanopy(seed) {
  const r = rng(seed);
  const lobes = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    lobes.push([Math.cos(a) * 0.45, 0.45 + r() * 0.2, Math.sin(a) * 0.45, 0.6 + r() * 0.2, 0.8]);
  }
  return canopy(seed, lobes);
}

function trunk(height, base, topRadius, flare = 1) {
  const pts = [
    new THREE.Vector2(base * flare, 0),
    new THREE.Vector2(base * (flare > 1 ? 1.15 : 1), height * 0.08),
    new THREE.Vector2(base * 0.92, height * 0.3),
    new THREE.Vector2(topRadius, height)
  ];
  return new THREE.LatheGeometry(pts, 9);
}

function palmTrunk(seed) {
  const r = rng(seed);
  const lean = new THREE.Vector3((r() - 0.5) * 1.4, 0, (r() - 0.5) * 1.4);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean.x * 0.2, 2.2, lean.z * 0.2),
    new THREE.Vector3(lean.x * 0.6, 4.4, lean.z * 0.6),
    new THREE.Vector3(lean.x, 6.2, lean.z)
  ]);
  const g = new THREE.TubeGeometry(curve, 10, 0.2, 7, false);
  return { geometry: g, crown: curve.getPoint(1) };
}

function frond(length, seed) {
  const r = rng(seed);
  const segs = 12;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * length;
    const y = 0.55 * t * length * 0.35 - 1.5 * t * t * (length / 3);
    const w = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7) + 0.02;
    const fold = -0.12 * w;
    pos.push(x, y + fold, -w, x, y + 0.05, 0, x, y + fold, w);
    if (i < segs) {
      const a = i * 3;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.rotateX((r() - 0.5) * 0.3);
  g.computeVertexNormals();
  return g;
}

function palmCrown(seed, crown) {
  const r = rng(seed);
  const fronds = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const f = frond(2.8 + r() * 0.9, seed + i);
    f.rotateZ(0.15 + r() * 0.35);
    f.rotateY((i / count) * Math.PI * 2 + r() * 0.3);
    f.translate(crown.x, crown.y, crown.z);
    fronds.push(f);
  }
  return mergeGeometries(fronds);
}

const SPECIES = {
  round: { variants: 3, sway: 1, colors: [0x8fa878, 0x7f9b6a, 0x9aae74, 0x86a06e] },
  ceiba: { variants: 2, sway: 0.6, colors: [0x86a06e, 0x95ab76] },
  palm: { variants: 3, sway: 1.6, colors: [0x8aa565, 0x9bb06c, 0x7d9a5d] },
  highland: { variants: 3, sway: 0.8, colors: [0x6f8f63, 0x7a9868, 0x67855d] },
  shrub: { variants: 3, sway: 0.5, colors: [0x8fa878, 0x9db27c, 0x7f9b6a] }
};

function buildVariant(kind, seed) {
  if (kind === 'round') return { leaves: roundCanopy(seed), wood: trunk(3.2, 0.24, 0.14), range: [2, 5.2] };
  if (kind === 'ceiba') return { leaves: ceibaCanopy(seed), wood: trunk(5.4, 0.5, 0.26, 1.9), range: [4.2, 6.6] };
  if (kind === 'highland') return { leaves: highlandCanopy(seed), wood: trunk(2.4, 0.2, 0.12), range: [1.5, 6] };
  if (kind === 'shrub') return { leaves: shrubCanopy(seed), wood: null, range: [0, 1.2] };
  const t = palmTrunk(seed);
  return { leaves: palmCrown(seed, t.crown), wood: t.geometry, range: [4.5, 6.6], palm: true };
}

export function vegetation(scene, plantings) {
  const groups = {};
  plantings.forEach((p) => (groups[p.kind] ||= []).push(p));
  const meshes = [];
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const P = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();

  Object.entries(groups).forEach(([kind, list]) => {
    const spec = SPECIES[kind];
    for (let v = 0; v < spec.variants; v++) {
      const items = list.filter((_, i) => i % spec.variants === v);
      if (!items.length) continue;
      const parts = buildVariant(kind, 17 + v * 31 + kind.length);
      const leafMat = foliageMaterial({ sway: spec.sway, range: parts.range, side: parts.palm ? THREE.DoubleSide : THREE.FrontSide });
      const leaves = new THREE.InstancedMesh(parts.leaves, leafMat, items.length);
      const hull = parts.palm ? null : new THREE.InstancedMesh(parts.leaves, foliageMaterial({ sway: spec.sway, outline: true, grow: kind === 'shrub' ? 0.04 : 0.065 }), items.length);
      const wood = parts.wood ? new THREE.InstancedMesh(parts.wood, toon(kind === 'palm' ? 0xa08766 : 0x8a6d4b), items.length) : null;
      items.forEach((it, i) => {
        Q.setFromAxisAngle(Y, it.rot);
        S.setScalar(it.scale);
        P.set(it.x, it.y - 0.15, it.z);
        M.compose(P, Q, S);
        leaves.setMatrixAt(i, M);
        if (hull) hull.setMatrixAt(i, M);
        if (wood) wood.setMatrixAt(i, M);
        color.set(spec.colors[it.tone % spec.colors.length]);
        leaves.setColorAt(i, color);
      });
      [leaves, hull, wood].filter(Boolean).forEach((m) => {
        m.computeBoundingSphere();
        scene.add(m);
        meshes.push(m);
      });
    }
  });

  return {
    update(t) {
      meshes.forEach((m) => {
        if (m.material.uniforms?.uTime) m.material.uniforms.uTime.value = t;
      });
    }
  };
}

export function scatter({ field, count, seed, area, accept }) {
  const r = rng(seed);
  const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 30) {
    tries++;
    const x = area[0] + r() * (area[1] - area[0]);
    const z = area[2] + r() * (area[3] - area[2]);
    const y = field(x, z);
    const kind = accept(x, z, y, r);
    if (!kind) continue;
    out.push({ kind, x, y, z, rot: r() * Math.PI * 2, scale: 0.75 + r() * 0.55, tone: Math.floor(r() * 8) });
  }
  return out;
}

export function slopeAt(field, x, z) {
  const e = 1.2;
  const dx = field(x + e, z) - field(x - e, z);
  const dz = field(x, z + e) - field(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}
