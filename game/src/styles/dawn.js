import * as THREE from 'three';
import { canvasTexture, autoTexture, panel, wrapText, F } from '../engine/textures.js';
import { figure, pose } from '../engine/figures.js';
import { floor } from '../zones/common.js';

// The Dawn (to 1997): you are inside an early web page. Mosaic gray, Times New Roman,
// link blue, grooved rules. Pages hang in the fog like documents on a server no one has
// rebooted since.
const GRAY = '#c0c0c0';
const LINK = '#0000ee';
const VISITED = '#551a8b';

function hr(g, x, y, w) {
  g.fillStyle = '#808080'; g.fillRect(x, y, w, 2);
  g.fillStyle = '#ffffff'; g.fillRect(x, y + 2, w, 2);
}

function link(g, text, x, y, color = LINK) {
  g.fillStyle = color;
  g.fillText(text, x, y);
  const w = g.measureText(text).width;
  g.fillRect(x, y + 4, w, 2);
  return w;
}

// A page exactly as a 1994 browser would render plain HTML.
function documentTexture(meme) {
  return autoTexture(640, 1100, (g, w, h) => {
    g.fillStyle = GRAY; g.fillRect(0, 0, w, h);
    g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
    g.font = `bold 40px ${F.times}`;
    let y = wrapText(g, meme.name, 24, 62, w - 48, 44) + 6;
    g.font = `22px ${F.times}`;
    y = wrapText(g, meme.summary, 24, y, w - 48, 27);
    hr(g, 24, y, w - 48); y += 34;
    g.font = `bold 22px ${F.times}`; g.fillText('Origin:', 24, y);
    g.font = `22px ${F.times}`; g.fillText(`${meme.origin.platform}, ${meme.year}`, 104, y); y += 28;
    if (meme.origin.creator) { g.font = `bold 22px ${F.times}`; g.fillText('By:', 24, y); g.font = `22px ${F.times}`; g.fillText(meme.origin.creator, 64, y); y += 28; }
    y += 10;
    y = wrapText(g, meme.origin.story, 24, y, w - 48, 27) + 8;
    if (meme.quote) {
      g.font = `21px ${F.courier}`;
      y = wrapText(g, meme.quote, 56, y, w - 100, 25) + 10;
    }
    hr(g, 24, y, w - 48); y += 36;
    g.font = `22px ${F.times}`;
    const src = meme.sources[0];
    if (src) { g.fillStyle = '#000'; g.fillText('See also: ', 24, y); link(g, new URL(src.url).hostname, 112, y, meme.id.length % 2 ? VISITED : LINK); y += 34; }
    g.font = `italic 20px ${F.times}`; g.fillStyle = '#000';
    g.fillText(`Last modified: ${meme.year}. This page is no longer maintained.`, 24, y + 6);
    return y + 30;
  });
}

function documentPage(meme, width = 3.2) {
  const page = panel(documentTexture(meme), width, { side: THREE.DoubleSide });
  page.position.y = 2.6;
  return page;
}

function genericDocument(kit, meme) {
  const g = new THREE.Group();
  const page = documentPage(meme);
  g.add(page);
  g.userData.update = (t) => { page.position.y = 2.6 + Math.sin(t * 0.6 + meme.year) * 0.06; };
  return g;
}

// :-) is a face only once you tilt your head. Here the world tilts for you as you approach.
function emoticon(kit, meme) {
  const g = new THREE.Group();
  const tex = canvasTexture(1024, 400, (c, w, h) => {
    c.font = `bold 330px ${F.courier}`; c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(':-)', w / 2, h / 2 + 10);
  });
  const face = panel(tex, 5.5, { transparent: true, side: THREE.DoubleSide });
  face.position.set(0, 3.2, 0.6);
  const page = documentPage(meme, 2.6);
  page.position.set(0, 1.5, -0.2);
  page.scale.setScalar(0.8);
  g.add(face, page);
  let turn = 0;
  g.userData.near = (d, dt) => {
    const target = d < 10 ? Math.min(1, (10 - d) / 6) : 0;
    turn += (target - turn) * Math.min(1, dt * 1.5);
    face.rotation.z = -turn * Math.PI / 2;
    face.position.y = 3.6 + turn * 1.8;
  };
  return g;
}

// A warning about a virus that did not exist, forwarded until it filled the sky.
function goodTimes(kit, meme) {
  const g = new THREE.Group();
  g.add(documentPage(meme));
  const tex = canvasTexture(512, 150, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#000'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
    c.fillStyle = '#000'; c.font = `20px ${F.courier}`;
    ['From: a friend', 'Subject: FW: FW: FW: Good Times', '', 'DO NOT OPEN IT. FORWARD THIS', 'TO EVERYONE YOU KNOW.'].forEach((l, i) => c.fillText(l, 14, 28 + i * 25));
  });
  const geo = new THREE.PlaneGeometry(1.4, 0.41);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const swarm = [];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    m.userData = { r: 2 + Math.random() * 7, a: Math.random() * Math.PI * 2, y: 0.6 + Math.random() * 6, s: (0.15 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1) };
    swarm.push(m); g.add(m);
  }
  let spread = 0;
  g.userData.near = (d, dt) => {
    if (d < 8) {
      const before = Math.floor(spread);
      spread = Math.min(swarm.length, spread + dt * (2 + spread * 0.35));
      if (Math.floor(spread) > before) kit.audio.tone(1200 + Math.random() * 400, 0.04, { type: 'square', gain: 0.03 });
    }
    swarm.forEach((m, i) => { m.visible = i < spread; });
  };
  g.userData.update = (t) => {
    for (const m of swarm) {
      if (!m.visible) continue;
      const u = m.userData;
      const a = u.a + t * u.s;
      m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.2, Math.sin(a) * u.r);
      m.rotation.y = -a;
    }
  };
  return g;
}

// 1996: a rendered baby in flat gray shading, dancing for whoever opened the attachment.
function dancingBaby(kit, meme) {
  const g = new THREE.Group();
  const page = documentPage(meme, 2.6);
  page.position.set(0, 2.2, -1.2);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x9a9a9a }));
  plinth.position.set(0, 0.4, 0.8);
  const baby = figure(new THREE.MeshLambertMaterial({ color: 0xd8b8a0, flatShading: true }), { height: 0.85 });
  baby.position.set(0, 0.8, 0.8);
  g.add(page, plinth, baby);
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(2, 5, 4);
  g.add(light, new THREE.AmbientLight(0xffffff, 0.6));
  g.userData.update = (t) => { pose(baby, t, 'dance'); baby.rotation.y = Math.sin(t * 0.7) * 0.6; };
  return g;
}

// Usenet and HTML fragments drifting at the edge of the fog.
function fragments(group) {
  const bits = ['<HTML>', '<BODY>', '</A>', '<HR>', '<BLINK>', 'Newsgroups: alt.folklore.computers', 'Subject: Re: Re: Re: Re:',
    'Path: archive!news!not-for-mail', '-- ', 'Organization: The Archive', 'Lines: 4', '<IMG SRC="baby.gif">', '404 Not Found', 'CONNECT 14400'];
  bits.forEach((text, i) => {
    const tex = canvasTexture(1024, 96, (g, w, h) => {
      g.font = `${text.startsWith('<') ? 64 : 52}px ${F.courier}`; g.fillStyle = '#000'; g.textBaseline = 'middle';
      g.fillText(text, 8, h / 2);
    });
    const m = panel(tex, 14, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (22 + (i * 7) % 15), 4 + (i * 5) % 12, -10 - i * 7);
    m.rotation.y = -side * 0.5;
    group.add(m);
  });
}

// Doors are hyperlinks: walk through the underline.
function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const label = kind === 'back' ? `Up: ${target.title}` : kind === 'deeper' ? `Next: ${target.title}` : target.title;
  const tex = autoTexture(900, 260, (c, w) => {
    c.fillStyle = GRAY; c.fillRect(0, 0, w, 260);
    c.font = `48px ${F.times}`; c.textBaseline = 'alphabetic';
    let x = 20;
    c.fillStyle = '#000'; c.fillText('[', x, 70); x += 18;
    x += link(c, label, x, 70, kind === 'back' ? VISITED : LINK) + 6;
    c.fillStyle = '#000'; c.fillText(']', x, 70);
    c.font = `italic 30px ${F.times}`;
    const sub = kind === 'deeper' ? `${target.era ? kit.archive.eras.find((e) => e.id === target.era)?.start + '. ' : ''}Please wait while your modem connects.` : target.blurb ?? '';
    return wrapText(c, sub, 20, 122, w - 40, 36) + 10;
  });
  const p = panel(tex, 3.4, { side: THREE.DoubleSide });
  p.position.y = 2.2;
  // A thin frame of grooved rules marks the doorway itself.
  const post = new THREE.MeshBasicMaterial({ color: 0x808080 });
  for (const x of [-1.6, 1.6]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 0.05), post);
    m.position.set(x, 1.6, 0);
    g.add(m);
  }
  g.add(p);
  return g;
}

// A thread reads like a "See also" footnote.
function threadSign(kit, { meme, room, why }) {
  const tex = autoTexture(620, 400, (c, w, h) => {
    c.fillStyle = GRAY; c.fillRect(0, 0, w, h);
    c.font = `bold 30px ${F.times}`; c.fillStyle = '#000'; c.fillText('See also:', 14, 40);
    c.font = `30px ${F.times}`;
    link(c, `${meme.name} (${meme.year})`, 14, 82);
    c.font = `italic 24px ${F.times}`; c.fillStyle = '#000';
    return wrapText(c, why, 14, 122, w - 28, 29) + 6;
  });
  const p = panel(tex, 1.7, { side: THREE.DoubleSide });
  p.position.y = 1.5;
  const g = new THREE.Group();
  g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.5, player.pos.z); };
  return g;
}

// The room's name, set like an <H1> high above the entrance.
function sign(kit, room) {
  const tex = autoTexture(1400, 300, (c, w) => {
    c.font = `bold 96px ${F.times}`; c.fillStyle = '#000'; c.textBaseline = 'alphabetic';
    c.fillText(room.title, 10, 100);
    c.font = `italic 40px ${F.times}`;
    return wrapText(c, room.blurb ?? '', 12, 160, w - 24, 46) + 10;
  });
  const p = panel(tex, 9, { transparent: true, side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  return p;
}

function env(kit, group, layout) {
  group.add(floor(new THREE.MeshBasicMaterial({ color: 0xb4b4b4 })));
  // Long grooved rules run beside the path, as if the page had margins.
  const len = -layout.end + 12;
  for (const side of [-1, 1]) {
    const dark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, len), new THREE.MeshBasicMaterial({ color: 0x808080 }));
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, len), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dark.position.set(side * (layout.width + 0.4), 0.02, layout.end / 2 + 3);
    light.position.copy(dark.position).add(new THREE.Vector3(0.07, 0, 0));
    group.add(dark, light);
  }
  fragments(group);
  return { sky: new THREE.Color(GRAY), fog: new THREE.Fog(GRAY, 14, 80) };
}

export default {
  env, sign, door, threadSign,
  onTravel: (kit, kind) => { if (kind === 'deeper') kit.audio.modem(); },
  exhibit: genericDocument,
  bespoke: { emoticon, 'good-times-hoax': goodTimes, 'dancing-baby': dancingBaby },
};
