import * as THREE from 'three';

export const LIGHT_DIR = new THREE.Vector3(0.5, 0.74, 0.42).normalize();

export const shadowVertexPars = /* glsl */ `
#include <shadowmap_pars_vertex>
`;

export const shadowVertex = /* glsl */ `
#include <shadowmap_vertex>
`;

export const shadowFragmentPars = /* glsl */ `
#include <packing>
uniform bool receiveShadow;
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
vec3 sky(vec3 col, vec3 n) {
  vec3 ground = vec3(0.94, 0.9, 0.84);
  vec3 above = vec3(1.0, 1.015, 1.04);
  return col * mix(ground, above, n.y * 0.5 + 0.5);
}
vec3 shade(vec3 col, vec3 shadowTint, float strength) {
  float s = getShadowMask();
  vec3 dark = mix(col, shadowTint, 0.42) * 0.9;
  return mix(col, dark, (1.0 - s) * strength);
}
`;

export const lightUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.lights);

export function createSun(scene, { mobile }) {
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const size = mobile ? 55 : 75;
  const cam = sun.shadow.camera;
  cam.left = -size;
  cam.right = size;
  cam.top = size;
  cam.bottom = -size;
  cam.near = 1;
  cam.far = 320;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.35;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const texel = (size * 2) / sun.shadow.mapSize.x;
  const center = new THREE.Vector3();
  const fwd = new THREE.Vector3();

  return {
    follow(camera) {
      camera.getWorldDirection(fwd);
      fwd.setY(0);
      if (fwd.lengthSq() > 1e-4) fwd.normalize();
      center.copy(camera.position).addScaledVector(fwd, size * 0.55);
      center.y = camera.position.y - 12;
      center.x = Math.round(center.x / texel) * texel;
      center.z = Math.round(center.z / texel) * texel;
      sun.target.position.copy(center);
      sun.position.copy(center).addScaledVector(LIGHT_DIR, 160);
      sun.target.updateMatrixWorld();
      sun.updateMatrixWorld();
    }
  };
}

export function assignShadows(root) {
  root.traverse((o) => {
    if (!o.isMesh || o.isSprite) return;
    const m = o.material;
    if (!m || m.isLineMaterial) return;
    o.receiveShadow = Boolean(m.lights);
    if (o.userData.noCast || m.transparent || m.defines?.OUTLINE !== undefined || m.isMeshBasicMaterial) return;
    if (m.userData?.terrain) return;
    o.castShadow = true;
  });
}
