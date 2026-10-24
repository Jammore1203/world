import * as THREE from 'three';
import { canvasTexture, autoTexture, redraw, panel, wrapText, roundRect, F } from '../engine/textures.js';
import { floor } from '../zones/common.js';
import { fakeCount, compact, rng } from '../data.js';

// The Algorithm Age (2020–): dark mode, frosted glass, Inter, neon cyan and red. Vertical
// feed posts stand in rows like a scroll you can walk through. Nothing here ends.
const CYAN = '#25f4ee';
const RED = '#fe2c55';

function feedPost(meme, beat = 0) {
  return (c, w, h) => {
    const r = rng(meme.id);
    const hue = Math.floor(r() * 360);
    const bg = c.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.4, h * 0.7);
    bg.addColorStop(0, `hsl(${hue},55%,${24 + beat * 6}%)`); bg.addColorStop(1, '#000');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = `600 26px ${F.inter}`; c.textAlign = 'center';
    c.fillText('Following   |   For You', w / 2, 52);
    c.fillStyle = '#fff'; c.fillRect(w / 2 + 40, 62, 104, 3);
    c.font = `800 72px ${F.inter}`;
    wrapText(c, meme.quote ?? meme.name, w / 2, h * 0.36, w - 140, 80);
    c.textAlign = 'left';
    // right rail
    const likes = fakeCount(meme.id, 2024);
    [['♥', compact(likes)], ['💬', compact(Math.floor(likes / 40))], ['↗', compact(Math.floor(likes / 90))]].forEach(([icon, n], i) => {
      const y = h * 0.55 + i * 110;
      c.fillStyle = i === 0 && beat > 0.5 ? RED : '#fff'; c.font = `48px ${F.inter}`; c.textAlign = 'center'; c.fillText(icon, w - 56, y);
      c.fillStyle = '#fff'; c.font = `600 20px ${F.inter}`; c.fillText(n, w - 56, y + 34);
    });
    c.textAlign = 'left';
    // frosted caption panel
    roundRect(c, 20, h - 280, w - 130, 250, 24);
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.font = `700 28px ${F.inter}`;
    c.fillText(`@${(meme.origin.creator ?? meme.id).toLowerCase().replace(/[^a-z0-9]+/g, '')}`, 44, h - 230);
    c.font = `24px ${F.inter}`; c.fillStyle = 'rgba(255,255,255,0.9)';
    wrapText(c, `${meme.summary} ${meme.tags.map((t) => `#${t}`).join(' ')} #fyp`, 44, h - 190, w - 190, 30);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = `22px ${F.inter}`;
    c.fillText(`♫ original sound · ${meme.origin.platform}`, 44, h - 46);
  };
}

function exhibit(kit, meme) {
  const g = new THREE.Group();
  const tex = canvasTexture(720, 1280, feedPost(meme));
  const p = panel(tex, 2.6, { side: THREE.DoubleSide });
  p.position.y = 0.4 + p.geometry.parameters.height / 2;
  // a faint glow behind each post, like a screen in a dark room
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${Math.floor(rng(meme.id)() * 360)},70%,30%)`), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(0, p.position.y, -0.05);
  g.add(glow, p);
  let beat = 0, acc = 0;
  g.userData.near = (d, dt) => {
    if (d > 7) return;
    acc += dt; beat = (Math.sin(kit.engine.t * 4) + 1) / 2;
    if (acc > 0.1) { acc = 0; redraw(tex, feedPost(meme, beat)); }
  };
  return g;
}

// 6 7: two numbers, weighing nothing against each other, forever.
function sixSeven(kit, meme) {
  const g = exhibit(kit, meme);
  const digit = (d) => panel(canvasTexture(256, 320, (c) => {
    c.font = `800 300px ${F.inter}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const grad = c.createLinearGradient(0, 0, 256, 320); grad.addColorStop(0, CYAN); grad.addColorStop(1, RED);
    c.fillStyle = grad; c.fillText(d, 128, 170);
  }), 1.6, { transparent: true, side: THREE.DoubleSide });
  const six = digit('6'), seven = digit('7');
  six.position.set(-1.1, 2.6, 2.4); seven.position.set(1.1, 2.6, 2.4);
  g.add(six, seven);
  let said = false;
  g.userData.update = (t) => {
    const k = Math.sin(t * 5);
    six.position.y = 2.6 + k * 0.45; seven.position.y = 2.6 - k * 0.45;
  };
  g.userData.near = ((base) => (d, dt) => {
    base(d, dt);
    if (d < 6 && !said) { said = true; kit.audio.speak('six seven', { rate: 0.8, pitch: 1.3 }); }
    if (d > 14) said = false;
  })(g.userData.near);
  return g;
}

function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const tex = autoTexture(560, 420, (c, w) => {
    roundRect(c, 2, 2, w - 4, 410, 36);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = `600 20px ${F.inter}`;
    c.fillText(kind === 'back' ? 'GO BACK' : kind === 'deeper' ? 'KEEP SCROLLING' : 'NEW FOR YOU', 34, 56);
    c.fillStyle = '#fff'; c.font = `800 40px ${F.inter}`;
    let y = wrapText(c, kind === 'deeper' && target.kind === 'end' ? "You're all caught up" : target.title, 34, 104, w - 68, 46);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `22px ${F.inter}`;
    y = wrapText(c, kind === 'deeper' && target.kind === 'end' ? 'There is nothing left below. Probably.' : target.blurb ?? '', 34, y + 4, w - 68, 28);
    const grad = c.createLinearGradient(34, 0, 260, 0); grad.addColorStop(0, CYAN); grad.addColorStop(1, RED);
    roundRect(c, 34, y + 12, 200, 50, 25); c.fillStyle = grad; c.fill();
    c.fillStyle = '#000'; c.font = `800 22px ${F.inter}`; c.textAlign = 'center';
    c.fillText(kind === 'back' ? '← back' : 'enter →', 134, y + 45);
    return y + 84;
  });
  const p = panel(tex, 2.8, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 1 + p.geometry.parameters.height / 2;
  g.add(p);
  return g;
}

function threadSign(kit, { meme, why }) {
  const tex = autoTexture(420, 300, (c, w) => {
    roundRect(c, 2, 2, w - 4, 290, 26);
    c.fillStyle = 'rgba(20,20,24,0.85)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = CYAN; c.font = `800 18px ${F.inter}`; c.fillText('STITCH WITH', 22, 38);
    c.fillStyle = '#fff'; c.font = `800 26px ${F.inter}`;
    let y = wrapText(c, meme.name, 22, 74, w - 44, 30);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = `18px ${F.inter}`;
    y = wrapText(c, why, 22, y + 2, w - 44, 23);
    return y + 14;
  });
  const p = panel(tex, 1.6, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 1.6;
  const g = new THREE.Group(); g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.6, player.pos.z); };
  return g;
}

function sign(kit, room) {
  const tex = autoTexture(1400, 320, (c, w) => {
    c.textAlign = 'center';
    const grad = c.createLinearGradient(200, 0, w - 200, 0); grad.addColorStop(0, CYAN); grad.addColorStop(0.5, '#fff'); grad.addColorStop(1, RED);
    c.fillStyle = grad; c.font = `800 104px ${F.inter}`; c.fillText(room.title, w / 2, 110);
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = `34px ${F.inter}`;
    return wrapText(c, room.blurb ?? '', w / 2, 180, w - 120, 42) + 20;
  });
  const p = panel(tex, 9, { transparent: true, side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  return p;
}

function env(kit, group, layout) {
  // A dark, faintly reflective floor with a grid of light, like a phone screen face-down on glass.
  const grid = canvasTexture(128, 128, (c) => {
    c.fillStyle = '#050507'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 0, 128, 1); c.fillRect(0, 0, 1, 128);
  }, { repeat: [100, 100] });
  group.add(floor(new THREE.MeshBasicMaterial({ map: grid })));
  // Phone-shaped slabs of light drifting upward forever in the dark beyond the walls.
  const slabs = [];
  const slabGeo = new THREE.PlaneGeometry(1.2, 2.13);
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${(i * 47) % 360},60%,${12 + (i % 5) * 4}%)`), side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (layout.width + 6 + (i * 13) % 30), (i * 7) % 40, 6 - ((i * 23) % (-layout.end + 20)));
    m.rotation.y = side * -0.4;
    m.userData.speed = 0.6 + (i % 5) * 0.25;
    slabs.push(m); group.add(m);
  }
  return {
    sky: new THREE.Color(0x000000),
    fog: new THREE.Fog(0x000000, 14, 70),
    update(dt) { for (const s of slabs) { s.position.y += dt * s.userData.speed; if (s.position.y > 40) s.position.y = -6; } },
  };
}

export default {
  env, sign, door, threadSign, exhibit,
  bespoke: { 'six-seven': sixSeven },
};
