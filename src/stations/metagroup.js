import * as THREE from 'three';
import { C, hex } from '../palette.js';
import { solid, polyline, segments, outline, toon, smooth } from '../ink.js';
import { contourStack } from '../terrain.js';
import { canvasTexture, panel, setFont, roundRect } from '../label.js';

function daxCard(title, lines) {
  return canvasTexture(640, 300, (ctx, w, h) => {
    ctx.fillStyle = '#fbfaf5';
    roundRect(ctx, 4, 4, w - 8, h - 8, 10);
    ctx.fill();
    ctx.strokeStyle = hex(C.ink);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = hex(C.blue);
    ctx.fillRect(4, 4, 14, h - 8);
    ctx.fillStyle = hex(C.ink);
    setFont(ctx, 46, 700);
    ctx.fillText(title, 44, 72);
    setFont(ctx, 34, 500, 'semi-condensed');
    ctx.fillStyle = hex(C.slate);
    lines.forEach((l, i) => ctx.fillText(l, 44, 140 + i * 50));
  });
}

function sector(r0, r1, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

export function metagroup() {
  const group = new THREE.Group();
  const plateau = contourStack({
    r0: 30, levels: 7, step: 1, taper: 0.045, seed: 67,
    colors: [C.lowland, C.meadow, C.meadow, C.ochre, C.ochre, C.sand, C.ochre]
  });
  group.add(plateau);
  const top = plateau.userData.top;

  const floor = solid(new THREE.CylinderGeometry(17, 17, 0.2, 64), C.peak, { angle: 30, width: 1 });
  floor.position.y = top + 0.1;
  group.add(floor);

  const grid = [];
  for (let x = -15; x <= -1; x += 2) grid.push(x, top + 0.22, -10, x, top + 0.22, 2);
  for (let z = -10; z <= 2; z += 2) grid.push(-15, top + 0.22, z, -1, top + 0.22, z);
  group.add(segments(grid, { color: C.blue, width: 0.8, opacity: 0.5 }));

  const series = [C.blue, C.forest, C.sand, C.steel];
  const bars = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const h = 2 + Math.abs(Math.sin(col * 1.3 + row * 0.7)) * 7 + col * 0.6;
      const geo = new THREE.BoxGeometry(1.3, 1, 1.3);
      geo.translate(0, 0.5, 0);
      const bar = solid(geo, series[row], { width: 1.1 });
      bar.position.set(-14 + col * 2.4, top + 0.2, -8.5 + row * 2.8);
      bar.userData.h = h;
      bar.scale.y = 0.01;
      group.add(bar);
      bars.push(bar);
    }
  }

  const donut = new THREE.Group();
  const parts = [0.38, 0.27, 0.2, 0.15];
  let a = 0;
  parts.forEach((p, i) => {
    const geo = new THREE.ExtrudeGeometry(sector(2.4, 4.6, a, a + p * Math.PI * 2 - 0.04), { depth: 0.9, bevelEnabled: false, curveSegments: 24 });
    donut.add(solid(geo, series[i], { angle: 40 }));
    a += p * Math.PI * 2;
  });
  donut.position.set(9, top + 7, -2);
  donut.rotation.x = -1.0;
  group.add(donut);

  const pts = [];
  for (let i = 0; i <= 10; i++) {
    pts.push(new THREE.Vector3(2 + i * 1.3, top + 2 + 2.2 * Math.sin(i * 0.7) + i * 0.45, -11));
  }
  const area = new THREE.Shape();
  area.moveTo(pts[0].x, top + 0.2);
  pts.forEach((p) => area.lineTo(p.x, p.y));
  area.lineTo(pts[pts.length - 1].x, top + 0.2);
  area.closePath();
  const areaMesh = new THREE.Mesh(new THREE.ShapeGeometry(area), toon(C.water, { opacity: 0.75, side: THREE.DoubleSide }));
  areaMesh.position.z = -11;
  group.add(areaMesh);
  group.add(polyline(pts, { color: C.blue, width: 3 }));
  pts.forEach((p) => {
    const dot = solid(new THREE.SphereGeometry(0.28, 10, 8), C.white, { line: false });
    dot.position.copy(p);
    group.add(dot);
  });

  const cards = [
    daxCard('Margen %', ['DIVIDE ( [Utilidad],', '   [Ventas] )']),
    daxCard('Ventas YTD', ['TOTALYTD ( SUM ( Ventas[Valor] ),', '   Calendario[Fecha] )'])
  ].map((tex, i) => {
    const p = panel(tex, 8);
    p.position.set(i ? 6 : -8, top + (i ? 14 : 15.5), i ? 4 : -1);
    p.rotation.y = i ? 0.35 : 0.2;
    p.add(outline(p.geometry, { width: 1 }));
    group.add(p);
    return p;
  });

  let grown = 0;
  return {
    group,
    update(t, dt, focus) {
      grown += ((focus > 0.2 ? 1 : 0) - grown) * Math.min(1, dt * 1.6);
      bars.forEach((b, i) => {
        const delay = smooth(i * 0.025, i * 0.025 + 0.5, grown);
        b.scale.y = Math.max(0.01, b.userData.h * delay * (1 + 0.04 * Math.sin(t * 1.5 + i)));
      });
      donut.rotation.z = t * 0.25;
      cards.forEach((c, i) => (c.position.y += Math.sin(t + i * 2) * 0.005));
    }
  };
}
