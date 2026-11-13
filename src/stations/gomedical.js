import * as THREE from 'three';
import { C, hex } from '../palette.js';
import { box, solid, segments, outline } from '../ink.js';
import { canvasTexture, panel, setFont } from '../label.js';

function sliceTexture(k, framed) {
  return canvasTexture(320, 320, (ctx, w, h) => {
    ctx.fillStyle = '#12181c';
    if (framed) ctx.fillRect(0, 0, w, h);
    else {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const cx = w / 2;
    const cy = h / 2 + 6;
    const s = 0.75 + 0.25 * Math.sin((k / 9) * Math.PI);
    ctx.fillStyle = '#e9ecee';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 96 * s, 118 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b959c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 84 * s, 106 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d777e';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(i * 2.1) * 40 * s, cy + Math.cos(i * 1.7) * 60 * s, 18 * s, 9 * s, i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2b3338';
    const v = 10 + 14 * Math.sin((k / 9) * Math.PI);
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 8, v * 0.6, v * 1.8, 0.25, 0, Math.PI * 2);
    ctx.ellipse(cx + 16, cy - 8, v * 0.6, v * 1.8, -0.25, 0, Math.PI * 2);
    ctx.fill();
    if (framed) {
      ctx.strokeStyle = hex(C.water);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, h - 20);
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.stroke();
      ctx.fillStyle = hex(C.water);
      setFont(ctx, 22, 600);
      ctx.fillText(`Axial ${12 + k * 4}/64`, 16, 30);
      ctx.fillText('W 80  L 40', 16, h - 16);
      ctx.textAlign = 'right';
      ctx.fillText('RIS/PACS', w - 16, 30);
    }
  });
}

export const PAD = { r: 22, top: 2, seed: 4.1 };

export function gomedical() {
  const group = new THREE.Group();
  const top = PAD.top;

  group.add(box(16, 5, 7, C.peak, [-4, top + 2.5, -9]));
  group.add(box(16.4, 0.8, 7.4, C.blue, [-4, top + 3.4, -9], { width: 1 }));
  group.add(box(17, 0.4, 8, C.steel, [-4, top + 5.2, -9]));
  const win = [];
  for (let x = -11; x <= 3; x += 2) win.push(x, top + 1.2, -5.48, x, top + 2.8, -5.48);
  group.add(segments(win, { color: C.ink, width: 1 }));

  const gantryGeo = new THREE.TorusGeometry(3.4, 1.15, 14, 48);
  const gantry = solid(gantryGeo, C.white, { angle: 50 });
  gantry.rotation.y = Math.PI / 2;
  gantry.position.set(2, top + 4.6, 5);
  group.add(gantry);
  const bore = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 6, 48), new THREE.MeshBasicMaterial({ color: C.magenta, fog: true }));
  bore.rotation.y = Math.PI / 2;
  bore.position.copy(gantry.position).add(new THREE.Vector3(1.2, 0, 0));
  group.add(bore);
  group.add(box(2.6, 1.6, 7.4, C.steel, [2, top + 0.8, 5]));
  group.add(box(13, 0.45, 1.7, C.peak, [-1, top + 3.3, 5]));
  group.add(box(1.2, 2.9, 1.2, C.steel, [-5.5, top + 1.45, 5]));

  const slices = [];
  for (let k = 0; k < 10; k++) {
    const disc = panel(sliceTexture(k, false), 3.6);
    disc.material.depthWrite = false;
    disc.rotation.y = Math.PI / 2;
    disc.userData.k = k;
    group.add(disc);
    slices.push(disc);
  }
  const stackPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2, top + 4.6, 5),
    new THREE.Vector3(5, top + 7, 5),
    new THREE.Vector3(8, top + 11, 2),
    new THREE.Vector3(10, top + 13, -4)
  ]);

  const screens = [];
  [
    [-13, top + 9.5, 6, 0.55],
    [-7, top + 12.5, 3, 0.4],
    [-1, top + 14.5, 0, 0.3]
  ].forEach(([x, y, z, ry], i) => {
    const s = panel(sliceTexture(i * 3 + 1, true), 6);
    s.position.set(x, y, z);
    s.rotation.y = ry;
    s.add(outline(s.geometry, { color: C.ink, width: 1.6 }));
    group.add(s);
    screens.push(s);
  });

  return {
    group,
    update(t) {
      slices.forEach((d) => {
        const c = (t * 0.12 + d.userData.k / 10) % 1;
        stackPath.getPoint(c, d.position);
        d.material.opacity = Math.min(1, c * 6) * Math.min(1, (1 - c) * 5);
        d.rotation.y = Math.PI / 2 - c * 1.1;
      });
      screens.forEach((s, i) => (s.position.y += Math.sin(t * 0.9 + i * 1.7) * 0.004));
      bore.material.color.setHSL(0.89, 0.66, 0.42 + 0.12 * Math.sin(t * 3));
    }
  };
}
