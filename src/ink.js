import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { C } from './palette.js';

const lineMaterials = new Set();
const lineCache = new Map();
const toonCache = new Map();
const LIGHT = new THREE.Vector3(0.45, 0.85, 0.3).normalize();

export function setLineResolution(w, h) {
  lineMaterials.forEach((m) => m.resolution.set(w, h));
}

export function lineMaterial(color = C.ink, width = 1.3, extra = {}) {
  const m = new LineMaterial({ color, linewidth: width, fog: true, ...extra });
  m.resolution.set(window.innerWidth, window.innerHeight);
  lineMaterials.add(m);
  return m;
}

function sharedLine(color, width, opacity) {
  const key = `${color}-${width}-${opacity}`;
  if (!lineCache.has(key)) {
    lineCache.set(key, lineMaterial(color, width, opacity < 1 ? { transparent: true, opacity } : {}));
  }
  return lineCache.get(key);
}

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vN;
varying vec3 vCol;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  vN = normalize(mat3(modelMatrix) * n);
  vec4 mvPosition = modelViewMatrix * p;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vCol;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 base = uColor * vCol;
  float d = dot(normalize(vN), uLight);
  float band = d > 0.55 ? 1.0 : (d > 0.05 ? 0.84 : 0.7);
  gl_FragColor = vec4(mix(uShadow, base, band), uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function toon(color, { opacity = 1, side = THREE.FrontSide, cache = true } = {}) {
  const key = `${color}-${opacity}-${side}`;
  if (cache && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(color) },
        uShadow: { value: new THREE.Color(C.shadow) },
        uLight: { value: LIGHT.clone() },
        uOpacity: { value: opacity }
      }
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
    transparent: opacity < 1,
    side
  });
  if (cache) toonCache.set(key, m);
  return m;
}

export function outline(geometry, { angle = 28, color = C.ink, width = 1.3, opacity = 1 } = {}) {
  const edges = new THREE.EdgesGeometry(geometry, angle);
  const g = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  edges.dispose();
  return new LineSegments2(g, sharedLine(color, width, opacity));
}

export function solid(geometry, color, opts = {}) {
  const { line = true, angle, lineColor, width, lineOpacity, opacity, side } = opts;
  const mesh = new THREE.Mesh(geometry, toon(color, { opacity, side }));
  if (line) mesh.add(outline(geometry, { angle, color: lineColor, width, opacity: lineOpacity }));
  return mesh;
}

export function box(w, h, d, color, pos = [0, 0, 0], opts) {
  const m = solid(new THREE.BoxGeometry(w, h, d), color, opts);
  m.position.set(...pos);
  return m;
}

export function polyline(points, { color = C.ink, width = 1.3, opacity = 1, dashed = false, dash = 1, gap = 1 } = {}) {
  const g = new LineGeometry();
  g.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const extra = {};
  if (opacity < 1) Object.assign(extra, { transparent: true, opacity });
  if (dashed) Object.assign(extra, { dashed: true, dashSize: dash, gapSize: gap });
  const line = new Line2(g, lineMaterial(color, width, extra));
  if (dashed) line.computeLineDistances();
  return line;
}

export function segments(flat, { color = C.ink, width = 1, opacity = 1 } = {}) {
  const g = new LineSegmentsGeometry();
  g.setPositions(flat);
  return new LineSegments2(g, sharedLine(color, width, opacity));
}

export function writeLine(line, points) {
  const attr = line.geometry.attributes.instanceStart;
  const arr = attr.data.array;
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    const o = k * 6;
    arr[o] = a.x; arr[o + 1] = a.y; arr[o + 2] = a.z;
    arr[o + 3] = b.x; arr[o + 4] = b.y; arr[o + 5] = b.z;
  }
  attr.data.needsUpdate = true;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
