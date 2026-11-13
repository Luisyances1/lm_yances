import '@fontsource-variable/archivo/wdth.css';
import './style.css';
import * as THREE from 'three';
import { C } from './palette.js';
import { setLineResolution } from './ink.js';
import { createPath } from './path.js';
import { buildWorld } from './world.js';
import { mountUI } from './ui.js';
import { createSun, assignShadows } from './lighting.js';

async function start() {
  await Promise.all([
    document.fonts.load("700 40px 'Archivo Variable'"),
    document.fonts.load("500 40px 'Archivo Variable'")
  ]).catch(() => {});

  const canvas = document.querySelector('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const mobile = matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.haze);
  scene.fog = new THREE.Fog(C.haze, 50, 240);

  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 50, 1, 0.5, 700);
  const path = createPath();
  const sun = createSun(scene, { mobile });
  const world = buildWorld(scene, path);
  assignShadows(scene);
  let snap = false;
  const ui = mountUI(path, { onSnap: () => (snap = true) });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    setLineResolution(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  let target = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  let u = path.progressToU(target);
  const timer = new THREE.Timer();
  timer.connect(document);
  const params = new URLSearchParams(location.search);
  const fixed = params.has('u') ? Number(params.get('u')) : null;
  const fixedTime = params.has('t') ? Number(params.get('t')) : null;

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const t = fixedTime ?? timer.getElapsed();
    if (snap) {
      readScroll();
      u = path.progressToU(target);
      snap = false;
    }
    const goal = fixed ?? path.progressToU(target);
    u += (goal - u) * (reduce || fixed !== null ? 1 : 1 - Math.exp(-dt * 3));
    px += (tx - px) * Math.min(1, dt * 2);
    py += (ty - py) * Math.min(1, dt * 2);
    const look = path.apply(camera, u, px, py);
    world.update(t, dt, u, camera, look);
    sun.follow(camera);
    ui.update(u);
    renderer.render(scene, camera);
  });
}

start();
