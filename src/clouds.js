import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from './palette.js';
import { perlin } from './relief.js';
import { rng } from './ink.js';
import { LIGHT_DIR } from './lighting.js';

const VARIANTS = 6;

function puff(radius, seed) {
  let g = new THREE.IcosahedronGeometry(radius, 3);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dir = v.clone().normalize();
    const n = perlin.noise(dir.x * 2.2 + seed, dir.y * 2.2, dir.z * 2.2) * 0.22;
    const fine = perlin.noise(dir.x * 6 + seed, dir.y * 6, dir.z * 6) * 0.06;
    v.multiplyScalar(1 + n + fine);
    if (v.y < 0) v.y *= 0.35;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function cloudGeometry(seed) {
  const r = rng(seed);
  const count = 5 + Math.floor(r() * 4);
  const length = 9 + r() * 5;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const center = 1 - Math.abs(t - 0.5) * 2;
    const rad = 1.6 + center * 1.9 + r() * 0.6;
    const g = puff(rad, seed + i * 7.3);
    g.translate((t - 0.5) * length, center * 1.1 + r() * 0.4, (r() - 0.5) * 2.4);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uTime;
varying vec3 vN;
varying vec3 vWorld;
void main() {
  vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = origin.x * 0.07 + origin.z * 0.05;
  vec3 p = position * (1.0 + 0.025 * sin(uTime * 0.35 + phase));
  vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  world.x += sin(uTime * 0.045 + phase) * 4.0;
  world.z += cos(uTime * 0.03 + phase) * 1.5;
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uHaze;
varying vec3 vN;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWorld);
  float d = dot(n, uLight);
  float lit = smoothstep(-0.35, 0.85, d);
  vec3 col = mix(uShade, uLit, lit);
  col *= mix(0.88, 1.0, smoothstep(-0.7, 0.3, n.y));
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.2);
  col = mix(col, uHaze, rim * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function cloudLayer(scene, placements) {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uLight: { value: LIGHT_DIR.clone() },
        uLit: { value: new THREE.Color(C.cloud) },
        uShade: { value: new THREE.Color(0xc4cfd8) },
        uHaze: { value: new THREE.Color(C.haze) }
      }
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true
  });

  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const P = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  for (let v = 0; v < VARIANTS; v++) {
    const items = placements.filter((_, i) => i % VARIANTS === v);
    if (!items.length) continue;
    const mesh = new THREE.InstancedMesh(cloudGeometry(300 + v * 41), material, items.length);
    items.forEach((it, i) => {
      Q.setFromAxisAngle(Y, it.rot);
      S.set(it.scale, it.scale * (0.8 + (i % 3) * 0.1), it.scale);
      P.set(it.x, it.y, it.z);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i, M);
    });
    mesh.frustumCulled = false;
    mesh.userData.noCast = true;
    scene.add(mesh);
  }

  return {
    update(t) {
      material.uniforms.uTime.value = t;
    }
  };
}
