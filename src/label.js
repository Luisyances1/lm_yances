import * as THREE from 'three';
import { C, hex } from './palette.js';

export const FONT = "'Archivo Variable', 'Archivo', sans-serif";

export function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function setFont(ctx, size, weight = 600, stretch = 'condensed') {
  if ('fontStretch' in ctx) ctx.fontStretch = stretch;
  ctx.font = `${weight} ${size}px ${FONT}`;
}

export function panel(texture, width, opts = {}) {
  const img = texture.image;
  const height = width * (img.height / img.width);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
    depthWrite: opts.depthWrite ?? true
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

export function sprite(texture, width) {
  const img = texture.image;
  const mat = new THREE.SpriteMaterial({ map: texture, fog: true, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(width, width * (img.height / img.width), 1);
  return s;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function airportTexture(code, name) {
  return canvasTexture(512, 512, (ctx, w) => {
    const cx = w / 2;
    const cy = 200;
    ctx.strokeStyle = hex(C.blue);
    ctx.fillStyle = hex(C.blue);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35);
    ctx.fillRect(-18, -95, 36, 190);
    ctx.restore();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
      ctx.rotate(a);
      ctx.fillRect(-6, -10, 26, 20);
      ctx.restore();
    }
    setFont(ctx, 92, 800);
    ctx.textAlign = 'center';
    ctx.fillText(code, cx, 430);
    setFont(ctx, 40, 500, 'normal');
    ctx.fillText(name, cx, 486);
  });
}
