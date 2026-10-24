import * as THREE from 'three';
import { canvasTexture, autoTexture, redraw, panel, wrapText, roundRect, F } from '../engine/textures.js';
import { floor, gradientSky } from '../zones/common.js';
import { figure, pose } from '../engine/figures.js';
import { fakeCount, rng } from '../data.js';

// Broadcast Yourself (2005–2009): Web 2.0. Glossy white, wet-floor reflections, rounded
// corners, gradients with a highlight across the top half, tag clouds, "beta" everywhere.
const BLUE = '#0033cc';

// The Web 2.0 signature: everything stands on a mirror that fades into the floor.
function withReflection(mesh) {
  const g = new THREE.Group();
  g.add(mesh);
  const mat = mesh.material.clone();
  mat.transparent = true; mat.opacity = 0.18; mat.depthWrite = false;
  const r = new THREE.Mesh(mesh.geometry, mat);
  r.position.copy(mesh.position); r.position.y = -mesh.position.y;
  r.scale.y = -1;
  g.add(r);
  return g;
}

function glossy(c, x, y, w, h, r, top, bottom) {
  roundRect(c, x, y, w, h, r);
  const grad = c.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, top); grad.addColorStop(1, bottom);
  c.fillStyle = grad; c.fill();
  c.save(); roundRect(c, x, y, w, h, r); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y, w, h / 2); // the highlight
  c.restore();
}

function macro(c, top, bottom, x, y, w, h, seed) {
  const r = rng(seed);
  const hue = Math.floor(r() * 360);
  const grad = c.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `hsl(${hue},25%,45%)`); grad.addColorStop(1, `hsl(${hue},30%,18%)`);
  c.fillStyle = grad; c.fillRect(x, y, w, h);
  c.textAlign = 'center'; c.lineJoin = 'round';
  const fit = (text, yy) => {
    let size = 54;
    c.font = `${size}px ${F.impact}`;
    while (c.measureText(text.toUpperCase()).width > w - 30 && size > 22) { size -= 2; c.font = `${size}px ${F.impact}`; }
    c.lineWidth = Math.max(4, size / 8); c.strokeStyle = '#000'; c.strokeText(text.toUpperCase(), x + w / 2, yy);
    c.fillStyle = '#fff'; c.fillText(text.toUpperCase(), x + w / 2, yy);
  };
  if (top) fit(top, y + 64);
  if (bottom) fit(bottom, y + h - 22);
  c.textAlign = 'left';
}

function videoCard(meme, { title = meme.name, playing = 0, top = meme.quote ?? meme.name, bottom = '' } = {}) {
  return (c, w, h) => {
    c.clearRect(0, 0, w, h);
    roundRect(c, 4, 4, w - 8, h - 8, 18); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#cccccc'; c.lineWidth = 2; c.stroke();
    c.fillStyle = BLUE; c.font = `bold 30px ${F.arial}`;
    let y = wrapText(c, title, 28, 52, w - 56, 34);
    const vx = 28, vy = y - 8, vw = w - 56, vh = Math.round(vw * 3 / 4);
    macro(c, top, bottom, vx, vy, vw, vh, meme.id);
    // player chrome
    const cy = vy + vh;
    const bar = c.createLinearGradient(0, cy, 0, cy + 30);
    bar.addColorStop(0, '#5a5a5a'); bar.addColorStop(0.5, '#2b2b2b'); bar.addColorStop(0.51, '#1a1a1a'); bar.addColorStop(1, '#333');
    c.fillStyle = bar; c.fillRect(vx, cy, vw, 30);
    c.fillStyle = '#ddd'; c.font = `14px ${F.arial}`; c.fillText('▶', vx + 10, cy + 20);
    c.fillStyle = '#555'; c.fillRect(vx + 34, cy + 12, vw - 130, 6);
    c.fillStyle = '#e00'; c.fillRect(vx + 34, cy + 12, (vw - 130) * playing, 6);
    c.fillStyle = '#ddd'; c.fillText(`0:${String(Math.floor(playing * 59)).padStart(2, '0')} / 0:59`, vx + vw - 86, cy + 20);
    y = cy + 64;
    c.fillStyle = '#ff9900'; c.font = `26px ${F.arial}`; c.fillText('★★★★★', 28, y);
    c.fillStyle = '#666'; c.font = `18px ${F.arial}`;
    c.fillText(`${fakeCount(meme.id, meme.year).toLocaleString()} views`, 190, y - 2);
    y += 34;
    c.fillStyle = '#333'; c.font = `19px ${F.arial}`;
    y = wrapText(c, meme.summary, 28, y, w - 56, 24) + 4;
    c.fillStyle = '#666'; c.font = `16px ${F.arial}`;
    y = wrapText(c, `From: ${meme.origin.creator ?? meme.origin.platform}  ·  Added: ${meme.year}`, 28, y, w - 56, 20);
    return Math.min(h, y + 18);
  };
}

function cardPanel(meme, draw) {
  const tex = autoTexture(620, 1100, draw);
  const height = tex.userData.canvas.height;
  // autoTexture cropped the canvas; redraws must use that height too.
  tex.userData.draw = (c, w) => draw(c, w, height);
  const p = panel(tex, 3.1, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 0.5 + p.geometry.parameters.height / 2;
  return { tex, mesh: p };
}

function exhibit(kit, meme) {
  const g = new THREE.Group();
  let playing = 0;
  const { tex, mesh } = cardPanel(meme, videoCard(meme));
  g.add(withReflection(mesh));
  if (meme.year % 3 === 0) {
    const b = badge(meme.year % 2 ? 'beta' : 'NEW!');
    b.position.set(1.45, mesh.position.y + mesh.geometry.parameters.height / 2 - 0.1, 0.03);
    g.add(b);
  }
  let acc = 0;
  g.userData.near = (d, dt) => {
    if (d > 7 || playing >= 1) return;
    playing = Math.min(1, playing + dt / 20);
    acc += dt;
    if (acc > 0.25) { acc = 0; redraw(tex, (c, w) => videoCard(meme, { playing, bottom: playing > 0.4 ? meme.name : '' })(c, w, tex.userData.canvas.height)); }
  };
  return g;
}

// A starburst badge, slightly rotated, stuck to the corner.
function badge(text) {
  const tex = canvasTexture(160, 160, (c) => {
    c.translate(80, 80); c.rotate(-0.25);
    c.beginPath();
    for (let i = 0; i < 32; i++) { const r = i % 2 ? 62 : 76; const a = (i / 32) * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath();
    const grad = c.createLinearGradient(0, -76, 0, 76);
    grad.addColorStop(0, '#ffcc33'); grad.addColorStop(1, '#ff6600');
    c.fillStyle = grad; c.fill();
    c.fillStyle = '#fff'; c.font = `bold 34px ${F.arial}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 0, 2);
  });
  return panel(tex, 0.8, { transparent: true, side: THREE.DoubleSide });
}

// Rickrolling: the bait is a leaked trailer. Get close enough and the video is not what it said.
function rickroll(kit, meme) {
  const g = new THREE.Group();
  const bait = videoCard(meme, { title: 'LEAKED: GTA IV TRAILER!!! (real)', top: 'EXCLUSIVE', bottom: 'click to watch' });
  const { tex, mesh } = cardPanel(meme, bait);
  g.add(withReflection(mesh));
  const dancer = figure(new THREE.MeshPhysicalMaterial({ color: 0x2a2a35, roughness: 0.25, clearcoat: 1 }), { height: 1.8 });
  dancer.position.set(0, 0, 1.6);
  dancer.visible = false;
  g.add(dancer);
  let rolled = false, stop = null;
  const bass = [40, 40, 47, 47, 45, 45, 42, 42];
  g.userData.near = (d) => {
    if (d < 5.5 && !rolled) {
      rolled = true; dancer.visible = true;
      redraw(tex, (c, w) => videoCard(meme, { title: 'Rickrolling', top: 'NEVER GONNA', bottom: 'YOU JUST GOT RICKROLLED', playing: 0.5 })(c, w, tex.userData.canvas.height));
      kit.caption('You clicked. You should not have clicked.', 3500);
      // An original 80s pop groove: drum machine, octave bass, bright stabs.
      stop = kit.sound.start(kit.audio.loop(113, 4, 32, (i, at) => {
        if (i % 8 === 0) kit.audio.tone(60, 0.25, { type: 'sine', gain: 0.25, at, slideTo: 40 });
        if (i % 8 === 4) kit.audio.noise(0.15, { gain: 0.15, at, filter: 1800 });
        if (i % 2 === 0) kit.audio.noise(0.03, { gain: 0.05, at, filter: 7000, type: 'highpass' });
        const b = bass[Math.floor(i / 4) % bass.length];
        if (i % 2 === 0) kit.audio.note(b + (i % 4 === 2 ? 12 : 0), 0.18, { type: 'sawtooth', gain: 0.05, at });
        if (i % 8 === 6) [b + 24, b + 28, b + 31].forEach((n) => kit.audio.note(n, 0.15, { type: 'square', gain: 0.02, at }));
      }));
    }
    if (d > 16 && rolled) {
      rolled = false; dancer.visible = false; stop?.(); stop = null;
      redraw(tex, (c, w) => bait(c, w, tex.userData.canvas.height));
    }
  };
  g.userData.update = (t) => { if (dancer.visible) pose(dancer, t, 'dance'); };
  return g;
}

// Leeroy Jenkins: the raid group plans. Then one of them doesn't.
function leeroy(kit, meme) {
  const g = new THREE.Group();
  const { mesh } = cardPanel(meme, videoCard(meme));
  mesh.position.x = -1.5;
  g.add(withReflection(mesh));
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x4b5a7a, roughness: 0.3, clearcoat: 0.8 });
  const leeroyMat = new THREE.MeshPhysicalMaterial({ color: 0x9a3a2a, roughness: 0.3, clearcoat: 0.8 });
  const party = Array.from({ length: 6 }, (_, i) => {
    const f = figure(i === 5 ? leeroyMat : mat);
    const a = (i / 6) * Math.PI * 2;
    f.userData.home = new THREE.Vector3(2.2 + Math.cos(a) * 1.5, 0, 2.5 + Math.sin(a) * 1.5);
    f.position.copy(f.userData.home);
    f.lookAt(2.2, 0, 2.5);
    g.add(f);
    return f;
  });
  const leeroyFig = party[5];
  leeroyFig.position.set(2.2, 0, -1.5); // standing apart, away from keyboard
  const chat = canvasTexture(700, 120, (c) => drawChat(c));
  let lines = [];
  function drawChat(c) {
    c.clearRect(0, 0, 700, 120);
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, 700, 120);
    c.font = `20px ${F.arial}`;
    lines.slice(-4).forEach((l, i) => { c.fillStyle = l.color; c.fillText(l.text, 10, 26 + i * 27); });
  }
  const chatPanel = panel(chat, 3.5, { transparent: true, side: THREE.DoubleSide });
  chatPanel.position.set(2.2, 3.4, 2.5);
  g.add(chatPanel);
  let stage = 0, timer = 0;
  const say = (who, text, color = '#aaaaff') => { lines.push({ text: `[Party] [${who}]: ${text}`, color }); redraw(chat, drawChat); };
  g.userData.near = (d, dt) => {
    timer += dt;
    if (stage === 0 && d < 12) { stage = 1; timer = 0; say('Officer', 'Alright, everyone. Here is the plan.'); }
    else if (stage === 1 && timer > 2.5) { stage = 2; timer = 0; say('Officer', 'We have a 32.33, repeating of course, percentage of survival.'); }
    else if (stage === 2 && timer > 3) { stage = 3; timer = 0; say('Leeroy', 'ok im back. lets do this', '#ff9966'); }
    else if (stage === 3 && timer > 1.4) {
      stage = 4; timer = 0;
      say('Leeroy', 'LEEEEROY JENKINS!', '#ff5533');
      kit.audio.speak('Leeeeeroy Jenkins!', { pitch: 0.8, rate: 0.9 });
      kit.engine.player.shake = 0.4;
    } else if (stage === 4 && timer > 1.6) { stage = 5; timer = 0; say('Officer', 'Oh my God, he just ran in.'); }
    else if (stage === 5 && d > 18) { stage = 0; lines = []; redraw(chat, drawChat); leeroyFig.position.set(2.2, 0, -1.5); }
  };
  g.userData.update = (t, dt) => {
    party.forEach((f, i) => { if (i < 5) pose(f, t, stage >= 1 && stage <= 2 && i === 0 ? 'talk' : 'idle'); });
    if (stage >= 4) {
      leeroyFig.position.z += dt * 7; leeroyFig.position.x += dt * 1.2;
      leeroyFig.rotation.y = Math.atan2(1.2, 7);
      pose(leeroyFig, t, 'run');
      leeroyFig.visible = leeroyFig.position.z < 40;
    } else { leeroyFig.visible = true; pose(leeroyFig, t, 'idle'); }
  };
  return g;
}

function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const label = kind === 'back' ? '◂ Back' : kind === 'deeper' ? 'Next ▸' : 'Watch ▸';
  const tex = autoTexture(560, 360, (c, w) => {
    c.textAlign = 'center';
    c.fillStyle = '#333'; c.font = `bold 36px ${F.lucida}`;
    let y = wrapText(c, target.title, w / 2, 46, w - 20, 40);
    if (kind === 'deeper') { c.fillStyle = '#888'; c.font = `20px ${F.lucida}`; c.fillText('the next stratum', w / 2, y); y += 26; }
    glossy(c, w / 2 - 130, y + 6, 260, 64, 32, kind === 'back' ? '#cfd6de' : '#62c5ff', kind === 'back' ? '#8c99a6' : '#1a7fd1');
    c.fillStyle = '#fff'; c.font = `bold 28px ${F.lucida}`; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetY = 1;
    c.fillText(label, w / 2, y + 48);
    return y + 82;
  });
  const p = panel(tex, 2.9, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 1.2 + p.geometry.parameters.height / 2;
  g.add(withReflection(p));
  return g;
}

function threadSign(kit, { meme, why }) {
  const tex = autoTexture(420, 300, (c, w) => {
    roundRect(c, 2, 2, w - 4, 296, 14); c.fillStyle = '#f3f7fc'; c.fill(); c.strokeStyle = '#c6d4f0'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#666'; c.font = `bold 16px ${F.arial}`; c.fillText('RELATED VIDEOS', 16, 30);
    glossy(c, 16, 44, 96, 72, 6, '#999', '#444');
    c.fillStyle = BLUE; c.font = `bold 20px ${F.arial}`;
    let y = wrapText(c, meme.name, 124, 64, w - 140, 23);
    c.fillStyle = '#666'; c.font = `15px ${F.arial}`; c.fillText(`${meme.year}`, 124, y + 2);
    c.fillStyle = '#333'; c.font = `16px ${F.arial}`;
    y = wrapText(c, why, 16, Math.max(y + 30, 140), w - 32, 20);
    return y + 6;
  });
  const p = panel(tex, 1.6, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 1.6;
  const g = new THREE.Group(); g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.6, player.pos.z); };
  return g;
}

function sign(kit, room) {
  const tex = autoTexture(1400, 300, (c, w) => {
    c.textAlign = 'center';
    c.font = `bold 100px ${F.lucida}`;
    const grad = c.createLinearGradient(0, 20, 0, 110);
    grad.addColorStop(0, '#666'); grad.addColorStop(1, '#222');
    c.fillStyle = grad; c.fillText(room.title, w / 2, 104);
    c.fillStyle = '#888'; c.font = `34px ${F.lucida}`;
    return wrapText(c, room.blurb ?? '', w / 2, 170, w - 80, 40) + 10;
  });
  const p = panel(tex, 9, { transparent: true, side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  const g = new THREE.Group();
  const b = badge('beta');
  b.position.set(4.4, 6.5, -8.95);
  g.add(p, b);
  return g;
}

// A tag cloud hanging in the air: the most Web 2.0 object there is.
function tagCloud(kit) {
  const tags = [...new Set(kit.tree.byId.get(kit.room.path[1]).children.flatMap((r) => r.memes.flatMap((m) => m.tags)).concat(['web2.0', 'ajax', 'mashup', 'folksonomy', 'beta', 'social', 'rss', 'blog', 'podcast', 'viral']))];
  return autoTexture(1400, 500, (c, w) => {
    let x = 20, y = 70;
    tags.forEach((t, i) => {
      const size = 26 + ((i * 37) % 5) * 12;
      c.font = `${size > 60 ? 'bold ' : ''}${size}px ${F.arial}`;
      const tw = c.measureText(t).width;
      if (x + tw > w - 20) { x = 20; y += 74; }
      c.fillStyle = i % 4 === 0 ? '#ff0084' : BLUE;
      c.fillText(t, x, y);
      x += tw + 26;
    });
    return y + 30;
  });
}

function env(kit, group, layout) {
  group.add(gradientSky([[0, '#ffffff'], [0.45, '#eaf3fb'], [0.5, '#ffffff'], [1, '#ffffff']]));
  // Glossy white floor; slightly see-through so the reflections show.
  const f = floor(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 }));
  f.position.y = 0.001;
  group.add(f);
  const cloud = panel(tagCloud(kit), 14, { transparent: true, side: THREE.DoubleSide, opacity: 0.55 });
  cloud.position.set(0, 15, layout.end / 2 - 6);
  cloud.rotation.x = 0.35;
  group.add(cloud);
  // Diagonal pinstripe banners along both sides.
  const stripes = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#f4f9ff'; c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#e1edf9'; c.lineWidth = 10;
    for (let i = -64; i < 128; i += 22) { c.beginPath(); c.moveTo(i, 64); c.lineTo(i + 64, 0); c.stroke(); }
  }, { repeat: [60, 2] });
  for (const side of [-1, 1]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(-layout.end + 20, 2), new THREE.MeshBasicMaterial({ map: stripes, side: THREE.DoubleSide }));
    band.position.set(side * (layout.width + 2), 7.5, layout.end / 2);
    band.rotation.y = Math.PI / 2;
    group.add(band);
  }
  return { sky: new THREE.Color(0xffffff), fog: new THREE.Fog(0xf4f8fc, 20, 95) };
}

export default {
  env, sign, door, threadSign, exhibit,
  bespoke: { rickroll, 'leeroy-jenkins': leeroy },
};
