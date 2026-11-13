import * as THREE from 'three';
import { C, hex } from '../palette.js';
import { box, solid, polyline, segments, writeLine, outline } from '../ink.js';
import { floatingIsland } from '../terrain.js';
import { canvasTexture, panel, sprite, setFont, roundRect } from '../label.js';

function codeCard(title, lines) {
  return canvasTexture(720, 360, (ctx, w, h) => {
    ctx.fillStyle = hex(C.slate);
    roundRect(ctx, 4, 4, w - 8, h - 8, 12);
    ctx.fill();
    ctx.fillStyle = hex(C.water);
    setFont(ctx, 30, 600);
    ctx.fillText(title, 32, 52);
    setFont(ctx, 32, 500, 'semi-condensed');
    lines.forEach(([text, color], i) => {
      ctx.fillStyle = color || '#e8edf0';
      ctx.fillText(text, 32, 112 + i * 46);
    });
  });
}

function chat(text, fromAgent) {
  return canvasTexture(560, 150, (ctx, w) => {
    setFont(ctx, 36, 600, 'normal');
    const tw = Math.min(w - 20, ctx.measureText(text).width + 56);
    const x = fromAgent ? 10 : w - 10 - tw;
    ctx.fillStyle = fromAgent ? hex(C.blue) : '#ffffff';
    ctx.strokeStyle = hex(C.blue);
    ctx.lineWidth = 5;
    roundRect(ctx, x, 12, tw, 96, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fromAgent ? '#ffffff' : hex(C.ink);
    ctx.fillText(text, x + 28, 72);
  });
}

export function aunnait() {
  const group = new THREE.Group();
  const island = floatingIsland(131);
  group.add(island);
  const top = island.userData.top;

  const racks = [];
  [[-8, -4], [-4.4, -6]].forEach(([x, z]) => {
    const rack = box(3, 7.5, 2.6, C.slate, [x, top + 3.75, z], { lineColor: C.ink });
    group.add(rack);
    const slots = [];
    for (let y = 0.7; y < 7.2; y += 0.55) slots.push(x - 1.3, top + y, z + 1.32, x + 1.3, top + y, z + 1.32);
    group.add(segments(slots, { color: C.steel, width: 0.9 }));
    for (let k = 0; k < 10; k++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.16, 0.05),
        new THREE.MeshBasicMaterial({ color: k % 3 ? C.water : C.magenta, fog: true })
      );
      led.position.set(x + 1.0 - (k % 2) * 0.35, top + 0.95 + Math.floor(k / 2) * 1.1, z + 1.34);
      led.userData.seed = Math.random() * 10;
      group.add(led);
      racks.push(led);
    }
  });

  const orbCenter = new THREE.Vector3(4, top + 7, -1);
  const core = solid(new THREE.IcosahedronGeometry(1.9, 1), C.blue, { lineColor: C.white, width: 1 });
  core.position.copy(orbCenter);
  group.add(core);
  const ringPts = 80;
  const rings = [];
  for (let i = 0; i < 14; i++) {
    const pts = Array.from({ length: ringPts + 1 }, () => new THREE.Vector3());
    const line = polyline(pts, { color: i % 4 === 0 ? C.blue : C.magenta, width: i % 4 === 0 ? 1.4 : 2 });
    line.frustumCulled = false;
    line.userData = { pts, lat: -1.25 + (i / 13) * 2.5 };
    group.add(line);
    rings.push(line);
  }

  const cables = [];
  [[-8, -4], [-4.4, -6]].forEach(([x, z], i) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x + 1.4, top + 6.5 - i, z + 1.2),
      new THREE.Vector3((x + orbCenter.x) / 2, top + 1.2, (z + orbCenter.z) / 2 + 1),
      orbCenter.clone().add(new THREE.Vector3(-1.4, -0.6, 0))
    ]);
    group.add(polyline(curve.getPoints(40), { color: C.ink, width: 2 }));
    for (let k = 0; k < 3; k++) {
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: C.magenta, fog: true }));
      pulse.userData = { curve, offset: k / 3 };
      group.add(pulse);
      cables.push(pulse);
    }
  });

  const bubbles = [
    ['Hola, ¿en qué te puedo ayudar?', true],
    ['Quiero pedir una cita', false],
    ['Tengo un hueco el martes a las 10', true],
    ['¿Me pasas con una persona?', false],
    ['Te transfiero con un agente', true]
  ].map(([text, agent], i) => {
    const s = sprite(chat(text, agent), 7);
    s.userData.a = (i / 5) * Math.PI * 2;
    group.add(s);
    return s;
  });

  const cards = [
    codeCard('extensions.conf', [
      ['[entrante]', hex(C.water)],
      ['exten => s,1,Answer()'],
      [' same => n,AGI(agente_ia.py)'],
      [' same => n,Queue(soporte)']
    ]),
    codeCard('agente.py', [
      ['@app.post("/llamada")', hex(C.water)],
      ['async def llamada(evento: Evento):'],
      ['    texto = await stt.transcribir(evento)'],
      ['    return await agente.responder(texto)']
    ])
  ].map((tex, i) => {
    const p = panel(tex, 8);
    p.position.set(i ? 15 : -17, top + (i ? 12 : 13), i ? -10 : -2);
    p.rotation.y = i ? -0.15 : 0.55;
    p.add(outline(p.geometry, { width: 1 }));
    group.add(p);
    return p;
  });

  const stage = new THREE.Group();
  stage.position.set(3, 0, 8);
  group.children.filter((c) => c !== island).forEach((c) => stage.add(c));
  group.add(stage);

  return {
    group,
    update(t) {
      const energy = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.7)) * Math.abs(Math.sin(t * 0.63 + 1));
      rings.forEach((line, i) => {
        const { pts, lat } = line.userData;
        const y = Math.sin(lat) * 4.2;
        const base = Math.cos(lat) * 4.2;
        for (let k = 0; k <= ringPts; k++) {
          const a = (k / ringPts) * Math.PI * 2;
          const wob = 1 + energy * 0.22 * Math.sin(a * 6 + t * 5 + i * 0.8) * Math.sin(t * 3 + i);
          pts[k].set(orbCenter.x + Math.cos(a) * base * wob, orbCenter.y + y, orbCenter.z + Math.sin(a) * base * wob);
        }
        writeLine(line, pts);
      });
      core.rotation.y = t * 0.6;
      core.scale.setScalar(0.9 + energy * 0.2);
      racks.forEach((led) => (led.visible = Math.sin(t * 6 + led.userData.seed * 3) > -0.3));
      cables.forEach((p) => p.userData.curve.getPoint((t * 0.5 + p.userData.offset) % 1, p.position));
      bubbles.forEach((b, i) => {
        const a = b.userData.a + t * 0.18;
        b.position.set(orbCenter.x + Math.cos(a) * 10, orbCenter.y + 2.5 + Math.sin(t * 0.7 + i) * 1.2 + (i - 2) * 0.9, orbCenter.z + Math.sin(a) * 7);
      });
      cards.forEach((c, i) => (c.position.y += Math.sin(t * 0.8 + i * 2) * 0.004));
    }
  };
}
