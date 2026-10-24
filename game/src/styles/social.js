import * as THREE from 'three';
import { canvasTexture, autoTexture, panel, wrapText, roundRect, F } from '../engine/textures.js';
import { floor } from '../zones/common.js';
import { fakeCount, rng } from '../data.js';

// The Social Boom (2010–2014): Facebook blue, timeline posts in Lucida Grande, square
// photos with Instagram's warm filters and vignettes, notifications in red bubbles.
const FB = '#3b5998';
const LINE = '#dddfe2';
const FILTERS = [ // [top, bottom, overlay] in the spirit of 2010-era phone filters
  ['#f3d9a4', '#c86b4e', 'rgba(255,200,120,0.18)'],
  ['#e8e1c4', '#5e7c84', 'rgba(255,240,200,0.2)'],
  ['#f6c9b8', '#8a5d7a', 'rgba(255,180,160,0.15)'],
  ['#d8e7c9', '#4e6b52', 'rgba(255,255,210,0.15)'],
];

function photo(c, meme, x, y, size) {
  const r = rng(meme.id);
  const [top, bottom, wash] = FILTERS[Math.floor(r() * FILTERS.length)];
  const grad = c.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, top); grad.addColorStop(1, bottom);
  c.fillStyle = grad; c.fillRect(x, y, size, size);
  // Soft light leaks and grain, then the vignette.
  for (let i = 0; i < 3; i++) {
    const lx = x + r() * size, ly = y + r() * size;
    const leak = c.createRadialGradient(lx, ly, 0, lx, ly, size * 0.5);
    leak.addColorStop(0, 'rgba(255,255,230,0.35)'); leak.addColorStop(1, 'rgba(255,255,230,0)');
    c.fillStyle = leak; c.fillRect(x, y, size, size);
  }
  c.fillStyle = wash; c.fillRect(x, y, size, size);
  const v = c.createRadialGradient(x + size / 2, y + size / 2, size * 0.3, x + size / 2, y + size / 2, size * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(x, y, size, size);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `bold 40px ${F.helvetica}`;
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 6;
  wrapText(c, meme.quote ?? meme.name, x + size / 2, y + size / 2 - 10, size - 60, 46);
  c.shadowColor = 'transparent'; c.shadowBlur = 0; c.textAlign = 'left';
}

// A 2011 timeline post.
function post(meme) {
  return (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = LINE; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
    const r = rng(meme.id + 'avatar');
    const av = c.createLinearGradient(20, 20, 80, 80);
    av.addColorStop(0, `hsl(${r() * 360},35%,60%)`); av.addColorStop(1, `hsl(${r() * 360},35%,35%)`);
    c.fillStyle = av; c.fillRect(20, 20, 60, 60);
    c.fillStyle = FB; c.font = `bold 24px ${F.lucida}`;
    c.fillText(meme.origin.creator ?? meme.name, 96, 44);
    c.fillStyle = '#90949c'; c.font = `18px ${F.lucida}`;
    c.fillText(`${meme.year} · via ${meme.origin.platform}`, 96, 72);
    c.fillStyle = '#1d2129'; c.font = `21px ${F.lucida}`;
    let y = wrapText(c, meme.summary, 20, 118, w - 40, 27) + 6;
    photo(c, meme, 20, y, w - 40);
    y += w - 40 + 34;
    c.fillStyle = '#1d2129'; c.font = `19px ${F.lucida}`;
    y = wrapText(c, meme.origin.story, 20, y, w - 40, 25) + 8;
    c.fillStyle = LINE; c.fillRect(20, y, w - 40, 2); y += 34;
    c.fillStyle = FB; c.font = `20px ${F.lucida}`;
    c.fillText('Like  ·  Comment  ·  Share', 20, y); y += 22;
    c.fillStyle = '#edeff4'; c.fillRect(20, y, w - 40, 44);
    c.fillStyle = '#1d2129'; c.font = `18px ${F.lucida}`;
    c.fillText(`${fakeCount(meme.id, meme.year, 'likes').toLocaleString()} people like this.`, 34, y + 29);
    return y + 64;
  };
}

function exhibit(kit, meme) {
  const g = new THREE.Group();
  const tex = autoTexture(640, 1500, post(meme));
  const p = panel(tex, 3.1, { side: THREE.DoubleSide });
  p.position.y = 0.3 + p.geometry.parameters.height / 2;
  g.add(p);
  // A notification bubble that appears as you approach.
  const bubble = notification(Math.floor(rng(meme.id)() * 9) + 1);
  bubble.position.set(1.5, p.position.y + p.geometry.parameters.height / 2, 0.05);
  bubble.scale.setScalar(0.001);
  g.add(bubble);
  g.userData.near = (d, dt) => {
    const target = d < 8 ? 1 : 0.001;
    bubble.scale.setScalar(THREE.MathUtils.lerp(bubble.scale.x, target, Math.min(1, dt * 8)));
  };
  return g;
}

function notification(n) {
  const tex = canvasTexture(96, 96, (c) => {
    c.fillStyle = '#fa3e3e'; c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#fff'; c.font = `bold 46px ${F.helvetica}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), 48, 51);
  });
  return panel(tex, 0.5, { transparent: true, side: THREE.DoubleSide });
}

// Nyan Cat flies laps over the room, trailing a pixel rainbow.
function nyanCat(kit, meme) {
  const g = exhibit(kit, meme);
  const cat = canvasTexture(34, 21, (c) => {
    c.fillStyle = '#000'; c.fillRect(8, 0, 21, 18);
    c.fillStyle = '#ffcc99'; c.fillRect(9, 1, 19, 16);
    c.fillStyle = '#ff99ff'; c.fillRect(11, 3, 15, 12);
    [[13, 5], [19, 4], [16, 8], [22, 10], [14, 12], [24, 6]].forEach(([x, y]) => { c.fillStyle = '#ff3399'; c.fillRect(x, y, 1, 1); });
    c.fillStyle = '#000'; c.fillRect(21, 7, 13, 11);
    c.fillStyle = '#999'; c.fillRect(22, 8, 11, 9); c.fillRect(22, 6, 2, 2); c.fillRect(31, 6, 2, 2);
    c.fillStyle = '#000'; c.fillRect(24, 11, 1, 1); c.fillRect(30, 11, 1, 1); c.fillRect(26, 14, 4, 1);
    c.fillStyle = '#ff9999'; c.fillRect(23, 13, 1, 1); c.fillRect(31, 13, 1, 1);
    c.fillStyle = '#999'; c.fillRect(4, 10, 5, 3); c.fillRect(10, 18, 3, 3); c.fillRect(16, 18, 3, 3); c.fillRect(22, 18, 3, 3); c.fillRect(27, 18, 3, 3);
  }, { pixel: true });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: cat, transparent: true, side: THREE.DoubleSide }));
  const bands = ['#ff0000', '#ff9900', '#ffff00', '#33ff00', '#0099ff', '#6633ff'];
  const trail = [];
  const segGeo = new THREE.PlaneGeometry(0.5, 1.2);
  const rainbow = canvasTexture(2, 6, (c) => bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i, 2, 1); }), { pixel: true });
  const segMat = new THREE.MeshBasicMaterial({ map: rainbow, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(segGeo, segMat); trail.push(s); g.add(s); }
  g.add(sprite);
  let stop = null;
  const tune = [78, 80, 75, 76, 74, 73, 71, 0, 71, 73, 74, 74, 73, 71, 73, 75];
  g.userData.near = ((base) => (d, dt) => {
    base(d, dt);
    if (d < 12 && !stop) stop = kit.sound.start(kit.audio.loop(140, 2, 16, (i, at) => {
      if (tune[i]) kit.audio.note(tune[i], 0.16, { type: 'square', gain: 0.03, at });
      if (i % 2 === 0) kit.audio.note(i % 4 ? 50 : 43, 0.14, { type: 'triangle', gain: 0.08, at });
    }));
    if (d > 18 && stop) { stop(); stop = null; }
  })(g.userData.near);
  // Everything billboards toward you; the cat flips to face the way it's flying.
  const cam = kit.engine.camera;
  const world = new THREE.Vector3(), ahead = new THREE.Vector3(), right = new THREE.Vector3();
  const pos = (k) => { const a = k * 0.6; return new THREE.Vector3(Math.cos(a) * 7, 7 + Math.sin(k * 1.7) * 0.6, Math.sin(a) * 7); };
  g.userData.update = (t) => {
    sprite.position.copy(pos(t));
    sprite.lookAt(cam.position);
    sprite.localToWorld(world.set(0, 0, 0));
    g.localToWorld(ahead.copy(pos(t + 0.05)));
    right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    sprite.scale.x = ahead.sub(world).dot(right) < 0 ? -1 : 1;
    trail.forEach((s, i) => {
      s.position.copy(pos(t - (i + 1) * 0.045));
      s.position.y += (Math.floor(t * 8 + i) % 2) * 0.08; // the stepped wiggle
      s.lookAt(cam.position);
    });
  };
  return g;
}

// The Ice Bucket Challenge: step into the circle. You have been nominated.
function iceBucket(kit, meme) {
  const g = exhibit(kit, meme);
  const ring = canvasTexture(256, 256, (c) => {
    c.strokeStyle = FB; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 110, 0, Math.PI * 2); c.stroke();
    c.fillStyle = FB; c.font = `bold 22px ${F.lucida}`; c.textAlign = 'center';
    c.fillText('#ALSIceBucketChallenge', 128, 120); c.font = `18px ${F.lucida}`; c.fillText('stand here', 128, 150);
  });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: ring, transparent: true }));
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0, 0.02, 3.6);
  g.add(mark);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.45, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xc8cdd2, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }));
  bucket.position.set(0, 3.4, 3.6);
  g.add(bucket, new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
  // The splash is a sheet of cold light right in front of your eyes.
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0, depthTest: false }));
  splash.renderOrder = 999;
  kit.engine.camera.add(splash);
  splash.position.set(0, 0, -0.3);
  let tip = 0, armed = true;
  g.userData.dunk = () => {
    if (!armed) return;
    armed = false; tip = 0.0001;
    kit.audio.noise(1.4, { gain: 0.35, filter: 3000 });
    kit.audio.speak('I nominate you.', { rate: 1.05 });
    kit.engine.player.shake = 0.6;
    setTimeout(() => kit.caption('You have been nominated. You have 24 hours.', 3500), 900);
  };
  g.userData.update = (t, dt) => {
    if (tip > 0) {
      tip += dt;
      bucket.rotation.z = Math.min(Math.PI * 0.8, tip * 6);
      splash.material.opacity = tip < 0.3 ? 0 : Math.max(0, 0.95 - (tip - 0.3) * 0.8);
      if (tip > 4) { tip = 0; bucket.rotation.z = 0; splash.material.opacity = 0; }
    }
  };
  g.userData.near = ((base) => (d, dt) => { base(d, dt); if (d > 6) armed = true; })(g.userData.near);
  g.userData.markOffset = 3.6;
  return g;
}

function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const label = kind === 'back' ? '« Back' : kind === 'deeper' ? 'Older Posts' : 'Visit Page';
  const tex = autoTexture(560, 360, (c, w) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, 360);
    c.fillStyle = FB; c.fillRect(0, 0, w, 56);
    c.fillStyle = '#fff'; c.font = `bold 28px ${F.lucida}`; c.fillText(kind === 'deeper' ? 'The Archive' : 'Page', 18, 38);
    c.fillStyle = '#1d2129'; c.font = `bold 30px ${F.lucida}`;
    let y = wrapText(c, target.title, 18, 100, w - 36, 34);
    c.fillStyle = '#90949c'; c.font = `19px ${F.lucida}`;
    y = wrapText(c, target.blurb ?? '', 18, y, w - 36, 24) + 8;
    const blue = kind !== 'back';
    c.fillStyle = blue ? '#4267b2' : '#f5f6f7'; c.fillRect(18, y, 200, 46);
    c.strokeStyle = blue ? '#4267b2' : '#ccd0d5'; c.strokeRect(18.5, y + 0.5, 199, 45);
    c.fillStyle = blue ? '#fff' : '#4b4f56'; c.font = `bold 21px ${F.lucida}`; c.textAlign = 'center';
    c.fillText(label, 118, y + 30);
    return y + 64;
  });
  const p = panel(tex, 2.9, { side: THREE.DoubleSide });
  p.position.y = 1 + p.geometry.parameters.height / 2;
  g.add(p);
  return g;
}

function threadSign(kit, { meme, why }) {
  const tex = autoTexture(420, 320, (c, w) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, 320); c.strokeStyle = LINE; c.strokeRect(1, 1, w - 2, 318);
    c.fillStyle = '#90949c'; c.font = `bold 16px ${F.lucida}`; c.fillText('SUGGESTED POST', 16, 30);
    c.fillStyle = FB; c.font = `bold 22px ${F.lucida}`;
    let y = wrapText(c, meme.name, 16, 62, w - 32, 26);
    c.fillStyle = '#1d2129'; c.font = `17px ${F.lucida}`;
    y = wrapText(c, why, 16, y + 4, w - 32, 22);
    c.fillStyle = '#f5f6f7'; c.fillRect(16, y + 4, 120, 34); c.strokeStyle = '#ccd0d5'; c.strokeRect(16.5, y + 4.5, 119, 33);
    c.fillStyle = '#4b4f56'; c.font = `bold 17px ${F.lucida}`; c.fillText('+ Follow', 38, y + 27);
    return y + 50;
  });
  const p = panel(tex, 1.6, { side: THREE.DoubleSide });
  p.position.y = 1.6;
  const g = new THREE.Group(); g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.6, player.pos.z); };
  return g;
}

function sign(kit, room) {
  const tex = autoTexture(1400, 300, (c, w) => {
    c.fillStyle = FB; c.fillRect(0, 0, w, 130);
    c.fillStyle = '#fff'; c.font = `bold 84px ${F.lucida}`; c.fillText(room.title, 40, 96);
    c.fillStyle = '#fff'; c.fillRect(0, 130, w, 170);
    c.fillStyle = '#4b4f56'; c.font = `34px ${F.lucida}`;
    return wrapText(c, room.blurb ?? '', 40, 190, w - 80, 40) + 20;
  });
  const p = panel(tex, 9, { side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  return p;
}

function env(kit, group, layout) {
  const tile = canvasTexture(64, 64, (c) => { c.fillStyle = '#e9ebee'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#dfe1e5'; c.fillRect(0, 63, 64, 1); c.fillRect(63, 0, 1, 64); }, { repeat: [120, 120] });
  group.add(floor(new THREE.MeshBasicMaterial({ map: tile })));
  // The blue top bar, stretched into the walls of the room.
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(-layout.end + 20, 1.4), new THREE.MeshBasicMaterial({ color: FB, side: THREE.DoubleSide }));
    bar.position.set(side * (layout.width + 2), 8, layout.end / 2);
    bar.rotation.y = Math.PI / 2;
    group.add(bar);
  }
  return { sky: new THREE.Color(0xe9ebee), fog: new THREE.Fog(0xe9ebee, 20, 90) };
}

// The ice bucket circle sits in front of its post; wire its trigger once the room places it.
function iceBucketPlaced(kit, meme, slot, group) {
  const g = iceBucket(kit, meme);
  const x = slot.x - slot.side * g.userData.markOffset;
  kit.trigger({ x, z: slot.z, r: 1.1, enter: () => g.userData.dunk() });
  return g;
}

export default {
  env, sign, door, threadSign, exhibit,
  bespoke: { 'nyan-cat': nyanCat, 'ice-bucket-challenge': iceBucketPlaced },
};
