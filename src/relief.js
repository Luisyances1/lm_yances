import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { C } from './palette.js';
import { shadowVertexPars, shadowVertex, shadowFragmentPars, lightUniforms, LIGHT_DIR } from './lighting.js';

const perlin = new ImprovedNoise();

function fbm(x, z, octaves = 4, seed = 0.37) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin.noise(x * freq, z * freq, seed + i * 3.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function segmentDistance(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}

export function heightField({ mountains, pads, rivers, flats }) {
  return (x, z) => {
    let h = 0.25 + 0.7 * fbm(x * 0.025, z * 0.025, 3);

    for (const m of mountains) {
      const dx = x - m.x;
      const dz = z - m.z;
      const rx = dx * m.cos + dz * m.sin;
      const rz = -dx * m.sin + dz * m.cos;
      const d2 = (rx / (m.r * m.aspect)) ** 2 + (rz / m.r) ** 2;
      if (d2 > 4) continue;
      const shape = Math.exp(-d2 * 2.1);
      const ridge = 1 - Math.abs(perlin.noise(x * 0.055, z * 0.055, m.seed));
      const gully = 1 - Math.abs(perlin.noise(x * 0.16, z * 0.16, m.seed + 5));
      const detail = 0.55 + 0.45 * fbm(x * 0.07, z * 0.07, 5, m.seed) + 0.4 * ridge * ridge + 0.12 * gully;
      h += m.h * shape * detail;
    }

    let riverDist = Infinity;
    for (const pts of rivers) {
      for (let i = 0; i < pts.length - 1; i++) {
        const d = segmentDistance(x, z, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
        if (d < riverDist) riverDist = d;
      }
    }
    const bank = smoothstep(1.6, 8, riverDist);
    h = h * bank - 0.35 * (1 - bank);

    for (const p of pads) {
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > p.r * 1.8) continue;
      const a = Math.atan2(dz, dx);
      const wobble = 1 + 0.16 * perlin.noise(Math.cos(a) * 1.4 + p.seed, Math.sin(a) * 1.4, 0.5);
      const rr = p.r * wobble;
      const t = smoothstep(rr * 0.9, rr * 1.4, d);
      const slope = p.top + fbm(x * 0.12, z * 0.12, 2, p.seed) * 0.6 * t;
      h = slope * (1 - t) + h * t;
    }

    for (const f of flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      const t = smoothstep(f.r, f.r * 1.9, d);
      h = h * t;
    }
    return h;
  };
}

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
${shadowVertexPars}
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorld = worldPosition.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * worldPosition;
  vec3 transformedNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * mvPosition;
  ${shadowVertex}
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uMeadow;
uniform vec3 uOchre;
uniform vec3 uSand;
uniform vec3 uTan;
uniform vec3 uUmber;
uniform vec3 uPeak;
uniform vec3 uShadow;
uniform vec3 uContour;
uniform vec3 uGrid;
uniform vec3 uLight;
uniform float uBase;
varying vec3 vWorld;
varying vec3 vN;
#include <common>
#include <fog_pars_fragment>
${shadowFragmentPars}

vec3 hypso(float h) {
  vec3 c = uLow;
  c = mix(c, uMeadow, smoothstep(0.8, 2.6, h));
  c = mix(c, uOchre, smoothstep(3.5, 7.5, h));
  c = mix(c, uSand, smoothstep(8.0, 12.5, h));
  c = mix(c, uTan, smoothstep(12.5, 17.0, h));
  c = mix(c, uUmber, smoothstep(17.0, 22.0, h));
  c = mix(c, uPeak, smoothstep(23.0, 28.0, h));
  return c;
}

float isoline(float value, float spacing, float width) {
  float f = value / spacing;
  float w = fwidth(f);
  float g = abs(fract(f - 0.5) - 0.5) / max(w, 1e-4);
  return (1.0 - smoothstep(0.0, width, g)) * (1.0 - smoothstep(0.35, 0.8, w));
}

void main() {
  float h = vWorld.y - uBase;
  vec3 n = normalize(vN);
  vec3 col = hypso(h);

  float d = dot(n, uLight);
  float lit = smoothstep(-0.25, 0.95, d);
  col = mix(mix(col, uShadow, 0.48), col * 1.05, lit);

  float minor = isoline(h, 1.5, 1.1) * 0.38;
  float major = isoline(h, 7.5, 1.8) * 0.7;
  float onLand = smoothstep(0.9, 1.6, h);
  col = mix(col, uContour, max(minor, major) * onLand);

  float gx = isoline(vWorld.x, 25.0, 1.0);
  float gz = isoline(vWorld.z, 25.0, 1.0);
  col = mix(col, uGrid, max(gx, gz) * 0.22);
  col = shade(sky(col, n), uShadow, 0.85);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function reliefMaterial({ base = 0, grid = true } = {}) {
  const color = (c) => ({ value: new THREE.Color(c) });
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      lightUniforms(),
      {
        uLow: color(C.lowland),
        uMeadow: color(C.meadow),
        uOchre: color(C.ochre),
        uSand: color(C.sand),
        uTan: color(C.tan),
        uUmber: color(C.umber),
        uPeak: color(C.peak),
        uShadow: color(C.shadow),
        uContour: color(C.contour),
        uGrid: color(grid ? C.blue : C.contour),
        uLight: { value: LIGHT_DIR.clone() },
        uBase: { value: base }
      }
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    lights: true
  });
}

export function relief(scene, field, { x0 = -260, x1 = 260, z0 = 140, z1 = -720, step = 2 } = {}) {
  const w = x1 - x0;
  const d = z0 - z1;
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w / step), Math.round(d / step));
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, field(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const mat = reliefMaterial();
  mat.userData.terrain = true;
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

export { fbm, perlin, smoothstep };
