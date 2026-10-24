import * as THREE from 'three';
import { canvasTexture, autoTexture, redraw, panel, wrapText, roundRect, F } from '../engine/textures.js';
import { floor, gradientSky } from '../zones/common.js';
import { figure, pose } from '../engine/figures.js';
import { fakeCount, rng } from '../data.js';

// Six Seconds & Up (2015–2019): Material Design paper and ink, Roboto, floating action
// buttons; vertical video with Snapchat's caption bar and story progress, Vine's loop count.
const MATERIAL = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#009688', '#4caf50', '#ff9800', '#ff5722'];

// A 9:16 vertical clip. `t` animates the story bar; the caption sits where Snapchat put it.
function story(meme, t = 0) {
  return (c, w, h) => {
    const r = rng(meme.id);
    const a = MATERIAL[Math.floor(r() * MATERIAL.length)], b = MATERIAL[Math.floor(r() * MATERIAL.length)];
    const grad = c.createLinearGradient(0, 0, w * 0.4, h);
    grad.addColorStop(0, a); grad.addColorStop(1, b);
    c.fillStyle = grad; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, w, h);
    // story progress segments
    for (let i = 0; i < 3; i++) {
      const sw = (w - 40 - 16) / 3, x = 20 + i * (sw + 8);
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x, 18, sw, 5);
      const fill = Math.max(0, Math.min(1, t * 3 - i));
      c.fillStyle = '#fff'; c.fillRect(x, 18, sw * fill, 5);
    }
    c.fillStyle = '#fff'; c.font = `500 26px ${F.roboto}`; c.fillText(meme.origin.creator ?? meme.origin.platform, 24, 62);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = `22px ${F.roboto}`; c.fillText(String(meme.year), 24, 92);
    // big quiet title in the middle
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = `bold 64px ${F.roboto}`; c.textAlign = 'center';
    wrapText(c, meme.name, w / 2, h * 0.32, w - 60, 70);
    // the caption bar
    if (meme.quote) {
      c.font = `500 30px ${F.helvetica}`;
      const lines = []; let line = '';
      for (const word of meme.quote.split(' ')) { const test = line ? `${line} ${word}` : word; if (c.measureText(test).width > w - 60 && line) { lines.push(line); line = word; } else line = test; }
      lines.push(line);
      const barH = 22 + lines.length * 36;
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, h * 0.62, w, barH);
      c.fillStyle = '#fff'; lines.forEach((l, i) => c.fillText(l, w / 2, h * 0.62 + 40 + i * 36));
    }
    c.textAlign = 'left';
  };
}

function card(meme, loops) {
  return (c, w, h) => {
    roundRect(c, 0, 0, w, h, 8); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = '#212121'; c.font = `500 30px ${F.roboto}`;
    let y = wrapText(c, meme.name, 24, 46, w - 48, 34);
    c.fillStyle = '#00bf8f'; c.font = `bold 20px ${F.roboto}`; c.fillText(`${loops.toLocaleString()} LOOPS`, 24, y + 2); y += 34;
    c.fillStyle = '#616161'; c.font = `21px ${F.roboto}`;
    y = wrapText(c, meme.summary, 24, y, w - 48, 27) + 4;
    y = wrapText(c, meme.origin.story, 24, y, w - 48, 27) + 10;
    c.fillStyle = '#009688'; c.font = `500 20px ${F.roboto}`; c.fillText('SHARE        REVINE', 24, y + 8);
    return y + 30;
  };
}

// Material paper casts a soft shadow onto the floor beneath it.
function shadow(w, d) {
  const tex = canvasTexture(128, 128, (c) => {
    const grad = c.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.28)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad; c.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.01;
  return m;
}

function exhibit(kit, meme) {
  const g = new THREE.Group();
  let t = 0, acc = 0;
  let loops = fakeCount(meme.id, meme.year, 'loops');
  const clip = canvasTexture(540, 960, story(meme, 0));
  const v = panel(clip, 2.1, { side: THREE.DoubleSide });
  v.position.set(-0.75, 0.5 + 3.73 / 2, 0);
  const info = autoTexture(520, 900, card(meme, loops));
  const infoH = info.userData.canvas.height;
  const ip = panel(info, 1.6, { side: THREE.DoubleSide });
  ip.position.set(1.25, 0.6 + ip.geometry.parameters.height / 2, 0.15);
  g.add(v, ip, shadow(4, 1.4));
  g.userData.near = (d, dt) => {
    if (d > 12) return;
    t += dt / 6; acc += dt;
    if (t >= 1) { t = 0; loops += 1; redraw(info, (c, w) => card(meme, loops)(c, w, infoH)); } // a loop is six seconds
    if (acc > 1 / 12) { acc = 0; redraw(clip, story(meme, t)); }
  };
  return g;
}

// The Dress: walk around it. From one side it's blue and black; from the other, white and gold.
function theDress(kit, meme) {
  const g = exhibit(kit, meme);
  const pts = [[0, 0], [0.62, 0.02], [0.5, 0.5], [0.36, 1.0], [0.26, 1.3], [0.22, 1.42], [0.27, 1.62], [0.25, 1.8], [0, 1.82]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 48);
  const stripes = canvasTexture(8, 64, (c) => {
    // horizontal bands of lace across the dress
    c.fillStyle = '#fff'; c.fillRect(0, 0, 8, 64);
    c.fillStyle = '#000'; [[34, 4], [42, 4], [50, 4], [24, 3], [12, 3]].forEach(([y, h]) => c.fillRect(0, y, 8, h));
  });
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
  // Two palettes mixed by viewing angle: the base color and the "lace" color both shift.
  const blue = new THREE.Color('#2f4f9e'), black = new THREE.Color('#1a1a1a');
  const white = new THREE.Color('#e9e6dc'), gold = new THREE.Color('#9c8445');
  const dress = new THREE.Mesh(geo, mat);
  const laceGeo = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x * 1.01, p.y)), 48);
  const laceMesh = new THREE.Mesh(laceGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, color: 0x000000, alphaMap: stripes, transparent: true }));
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 }));
  const holder = new THREE.Group();
  holder.add(stand, dress, laceMesh);
  dress.position.y = laceMesh.position.y = 0.3;
  stand.position.y = 0.15;
  holder.position.set(0, 0, 3.4);
  holder.scale.setScalar(1.15);
  g.add(holder, new THREE.HemisphereLight(0xffffff, 0x999999, 1.6), shadow(2, 2));
  g.children.at(-1).position.set(0, 0.01, 3.4);
  const cam = kit.engine.camera;
  const world = new THREE.Vector3(), toCam = new THREE.Vector3(), facing = new THREE.Vector3();
  let said = false;
  g.userData.update = () => {
    holder.getWorldPosition(world);
    toCam.subVectors(cam.position, world).setY(0).normalize();
    facing.set(1, 0, 0).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    const k = THREE.MathUtils.smoothstep(toCam.dot(facing), -0.35, 0.35); // 0 = one side, 1 = the other
    mat.color.copy(blue).lerp(white, k);
    laceMesh.material.color.copy(black).lerp(gold, k);
  };
  g.userData.near = ((base) => (d, dt) => {
    base(d, dt);
    if (d < 6 && !said) { said = true; kit.caption('Walk around it. What colour is it now?', 3500); }
  })(g.userData.near);
  return g;
}

// Storm Area 51: a crowd Naruto-runs past the fence. They can't stop all of us.
function area51(kit, meme) {
  const g = exhibit(kit, meme);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(9, 16), new THREE.MeshBasicMaterial({ color: 0xd8b98a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-1, 0.012, 0);
  g.add(sand);
  const fenceTex = canvasTexture(64, 64, (c) => {
    c.strokeStyle = '#9aa0a6'; c.lineWidth = 2;
    for (let i = -64; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); }
  }, { repeat: [10, 2] });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide }));
  fence.position.set(-2.6, 1.1, 0); fence.rotation.y = Math.PI / 2;
  const warn = autoTexture(420, 200, (c, w) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, 200); c.strokeStyle = '#c62828'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, 192);
    c.fillStyle = '#c62828'; c.font = `bold 40px ${F.arial}`; c.textAlign = 'center'; c.fillText('WARNING', w / 2, 56);
    c.fillStyle = '#000'; c.font = `bold 22px ${F.arial}`; c.fillText('RESTRICTED AREA', w / 2, 96);
    c.font = `18px ${F.arial}`; c.fillText('Use of deadly force authorized', w / 2, 130);
    return 160;
  });
  const sign = panel(warn, 1.6, { side: THREE.DoubleSide });
  sign.position.set(-2.55, 1.6, 2.5); sign.rotation.y = Math.PI / 2;
  g.add(fence, sign, new THREE.HemisphereLight(0xffffff, 0x886644, 1.4));
  const mats = MATERIAL.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const crowd = Array.from({ length: 26 }, (_, i) => {
    const f = figure(mats[i % mats.length]);
    f.userData.lane = -0.5 + (i % 5) * 1.0 + Math.random() * 0.4;
    f.userData.offset = (i / 26) * 30 + Math.random() * 2;
    f.visible = false;
    g.add(f);
    return f;
  });
  let running = 0, said = false;
  g.userData.near = ((base) => (d, dt) => {
    base(d, dt);
    if (d < 9) running = Math.min(1, running + dt);
    if (d < 9 && !said) { said = true; kit.caption('They can\'t stop all of us.', 3000); }
    if (d > 20) { running = 0; said = false; }
  })(g.userData.near);
  g.userData.update = (t) => {
    crowd.forEach((f) => {
      f.visible = running > 0;
      if (!f.visible) return;
      const z = ((t * 5.5 + f.userData.offset) % 30) - 15;
      f.position.set(f.userData.lane, 0, -z);
      f.rotation.y = Math.PI;
      pose(f, t, 'naruto');
    });
  };
  return g;
}

function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const color = kind === 'back' ? '#757575' : kind === 'deeper' ? '#e91e63' : MATERIAL[Math.abs(target.id.length * 7) % MATERIAL.length];
  const tex = autoTexture(520, 420, (c, w) => {
    roundRect(c, 0, 0, w, 420, 8); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = color; c.fillRect(0, 0, w, 14);
    c.fillStyle = '#212121'; c.font = `500 34px ${F.roboto}`;
    let y = wrapText(c, target.title, 28, 68, w - 140, 38);
    c.fillStyle = '#757575'; c.font = `20px ${F.roboto}`;
    y = wrapText(c, kind === 'deeper' ? 'Swipe up for more' : target.blurb ?? '', 28, y + 4, w - 140, 26);
    // the floating action button
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(w - 64, 72, 40, 0, Math.PI * 2); c.fill();
    c.fillStyle = color; c.beginPath(); c.arc(w - 66, 68, 40, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath();
    if (kind === 'back') { c.moveTo(w - 56, 52); c.lineTo(w - 76, 68); c.lineTo(w - 56, 84); }
    else if (kind === 'deeper') { c.moveTo(w - 82, 76); c.lineTo(w - 66, 58); c.lineTo(w - 50, 76); }
    else { c.moveTo(w - 74, 52); c.lineTo(w - 54, 68); c.lineTo(w - 74, 84); }
    c.stroke();
    return Math.max(y + 16, 150);
  });
  const p = panel(tex, 2.7, { side: THREE.DoubleSide });
  p.position.y = 1.2 + p.geometry.parameters.height / 2;
  g.add(p, shadow(3, 1));
  return g;
}

function threadSign(kit, { meme, why }) {
  const tex = autoTexture(420, 300, (c, w) => {
    roundRect(c, 0, 0, w, 300, 30); c.fillStyle = '#212121'; c.fill();
    c.fillStyle = '#00bf8f'; c.font = `bold 18px ${F.roboto}`; c.fillText('⟲ REVINE', 22, 36);
    c.fillStyle = '#fff'; c.font = `500 24px ${F.roboto}`;
    let y = wrapText(c, meme.name, 22, 70, w - 44, 28);
    c.fillStyle = '#bdbdbd'; c.font = `18px ${F.roboto}`;
    y = wrapText(c, why, 22, y + 2, w - 44, 23);
    return y + 12;
  });
  const p = panel(tex, 1.6, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 1.6;
  const g = new THREE.Group(); g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.6, player.pos.z); };
  return g;
}

function sign(kit, room) {
  const tex = autoTexture(1400, 320, (c, w) => {
    c.fillStyle = '#3f51b5'; c.fillRect(0, 0, w, 140);
    c.fillStyle = '#303f9f'; c.fillRect(0, 0, w, 24);
    c.fillStyle = '#fff'; c.font = `500 72px ${F.roboto}`; c.fillText(room.title, 40, 108);
    c.fillStyle = '#fafafa'; c.fillRect(0, 140, w, 180);
    c.fillStyle = '#616161'; c.font = `32px ${F.roboto}`;
    return wrapText(c, room.blurb ?? '', 40, 196, w - 80, 40) + 20;
  });
  const p = panel(tex, 9, { side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  return p;
}

function env(kit, group, layout) {
  group.add(gradientSky([[0, '#fafafa'], [0.5, '#eceff1'], [1, '#eceff1']]));
  group.add(floor(new THREE.MeshBasicMaterial({ color: 0xf5f5f5 })));
  // Big sheets of colored paper hang above, casting no sound.
  for (let i = 0, z = 0; z > layout.end - 6; i++, z -= 9) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: MATERIAL[(i * 4) % MATERIAL.length], side: THREE.DoubleSide }));
    const side = i % 2 ? 1 : -1;
    sheet.position.set(side * (layout.width + 3), 9 + (i % 3), z);
    sheet.rotation.set(-0.2, side * 0.5, side * 0.1);
    group.add(sheet);
  }
  return { sky: new THREE.Color(0xfafafa), fog: new THREE.Fog(0xf5f5f5, 22, 95) };
}

export default {
  env, sign, door, threadSign, exhibit,
  bespoke: { 'the-dress': theDress, 'storm-area-51': area51 },
};
