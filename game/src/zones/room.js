import * as THREE from 'three';
import { roomLayout } from '../data.js';
import { deeper } from '../tree.js';
import { canvasTexture } from '../engine/textures.js';

// Builds any room (hub or subset of humour) from the shared floor plan plus an era style.
// The style supplies the look: environment, exhibits, doors, thread signs, the room's sign.
export function buildRoom(kit, style) {
  const { room, tree } = kit;
  const group = new THREE.Group();
  const next = room.kind === 'hub' ? deeper(tree, room.id) : null;
  const doorTargets = [...room.children, ...(next ? [next] : [])];
  const layout = roomLayout({ memes: room.memes.length, doors: doorTargets.length });
  const env = style.env(kit, group, layout);

  const sign = style.sign?.(kit, room, layout);
  if (sign) group.add(sign);

  const updaters = [];
  const track = (obj) => { if (obj?.userData.update) updaters.push(obj.userData.update); return obj; };

  room.memes.forEach((meme, i) => {
    const slot = layout.exhibits[i];
    const obj = track((style.bespoke?.[meme.id] ?? style.exhibit)(kit, meme, slot, group));
    obj.position.x += slot.x; obj.position.z += slot.z;
    obj.rotation.y = slot.yaw;
    group.add(obj);
    kit.trigger({ x: slot.x * 0.5, z: slot.z, r: 5.5, once: true, enter: () => kit.caption(`${meme.name} · ${meme.year}`, 3200) });
    if (obj.userData.near) kit.trigger({ x: slot.x, z: slot.z, r: 0, near: obj.userData.near });

    // Threads: a column of light beside the exhibit for every meme this one crosses into.
    (tree.threads.get(meme.id) ?? []).forEach((thread, k) => {
      const target = tree.byId.get(thread.room);
      const targetMeme = target.memes.find((m) => m.id === thread.to);
      const pad = new THREE.Group();
      pad.position.set(slot.pad.x, 0, slot.pad.z + k * 2.6);
      pad.add(threadColumn(), track(style.threadSign(kit, { meme: targetMeme, room: target, why: thread.why })));
      pad.userData.update = (t) => { pad.children[0].material.opacity = 0.4 + Math.sin(t * 2 + k) * 0.15; };
      track(pad);
      group.add(pad);
      kit.trigger({ x: pad.position.x, z: pad.position.z, r: 0.9, enter: () => kit.go(target.id, { meme: targetMeme.id, thread: true }) });
    });
  });

  // Doors on the far wall: child rooms first, then the way deeper.
  const arrivals = new Map();
  doorTargets.forEach((target, i) => {
    const d = layout.doors[i];
    const kind = target === next ? 'deeper' : 'child';
    const door = track(style.door(kit, { target, kind }));
    door.position.set(d.x, 0, d.z);
    group.add(door);
    kit.trigger({ x: d.x, z: d.z + 0.4, r: 1.1, enter: () => { style.onTravel?.(kit, kind, target); kit.go(target.id, { from: room.id }); } });
    arrivals.set(target.id, d.arrive);
  });

  // The way back, behind where you arrive.
  if (room.parentNode) {
    const back = track(style.door(kit, { target: room.parentNode, kind: 'back' }));
    back.position.set(layout.back.x, 0, layout.back.z);
    back.rotation.y = Math.PI;
    group.add(back);
    kit.trigger({ x: layout.back.x, z: layout.back.z - 0.3, r: 1.1, enter: () => kit.go(room.parentNode.id, { from: room.id }) });
  }

  return {
    group,
    sky: env.sky, fog: env.fog,
    walk: layout.walk,
    obstacles: env.obstacles ?? [],
    // Where to stand on arrival: back from a child, through a thread, or at the entrance.
    arrive({ from, meme } = {}) {
      if (meme) { const i = room.memes.findIndex((m) => m.id === meme); if (i >= 0) return layout.exhibits[i].view; }
      if (from && arrivals.has(from)) return arrivals.get(from);
      return layout.spawn;
    },
    onEnter: env.onEnter, onLeave: env.onLeave,
    update(dt, t, player) { for (const u of updaters) u(t, dt, player); env.update?.(dt, t, player); },
  };
}

function threadColumn() {
  // Bright at the floor, fading upward: light rising out of the ground.
  const tex = canvasTexture(4, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, 'rgba(200,180,255,0.7)'); grad.addColorStop(0.35, 'rgba(160,130,255,0.18)'); grad.addColorStop(1, 'rgba(160,130,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 3.2, 24, 1, true), mat);
  col.position.y = 1.6;
  return col;
}
