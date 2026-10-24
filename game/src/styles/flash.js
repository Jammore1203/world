import * as THREE from 'three';
import { canvasTexture, autoTexture, redraw, panel, wrapText, bevel, F } from '../engine/textures.js';
import { floor } from '../zones/common.js';

// Flash & Forums (1998–2004): a personal homepage you can stand inside. Tiled pixel
// backgrounds, Win98 bevels, Verdana, 88x31 buttons, Flash preloaders, the webring.
const SITE_COLORS = ['#ffff00', '#00ff00', '#00ffff', '#ff66ff', '#ff9900'];

function starTile(bg = '#000010') {
  return canvasTexture(64, 64, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
    [[5, 9, '#fff'], [40, 4, '#ffffaa'], [22, 30, '#aaaaff'], [55, 44, '#fff'], [12, 52, '#ffffff'], [33, 58, '#ccc']].forEach(([x, y, c]) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); });
    g.fillStyle = '#fff'; g.fillRect(48, 20, 1, 3); g.fillRect(47, 21, 3, 1); // a twinkle
  }, { pixel: true });
}

// An 88x31 button, the currency of every late-90s links page.
function button88(text, sub, colors) {
  return canvasTexture(88, 31, (g) => {
    g.fillStyle = colors[0]; g.fillRect(0, 0, 88, 31);
    g.fillStyle = colors[1]; g.fillRect(2, 2, 84, 27);
    g.strokeStyle = '#000'; g.strokeRect(0.5, 0.5, 87, 30);
    g.fillStyle = colors[2]; g.font = `bold 11px ${F.verdana}`; g.textAlign = 'center';
    g.fillText(text, 44, 14);
    g.font = `9px ${F.verdana}`; g.fillText(sub, 44, 25);
  }, { pixel: true });
}

const BUTTONS = [
  ['MADE WITH', 'Notepad', ['#000', '#ffffff', '#000080']],
  ['BEST VIEWED', '800 x 600', ['#000', '#008080', '#ffffff']],
  ['GET', 'Flash Player', ['#000', '#cc0000', '#ffffff']],
  ['HTML 4.0', 'checked!', ['#000', '#ffcc00', '#000000']],
  ['Ring of', 'Memories', ['#000', '#660099', '#ffff00']],
  ['NO', 'FRAMES', ['#000', '#000000', '#00ff00']],
  ['sign my', 'GUESTBOOK', ['#000', '#ff66cc', '#000000']],
];

function windowChrome(g, w, title) {
  bevel(g, 0, 0, w, 34);
  const grad = g.createLinearGradient(4, 0, w - 4, 0);
  grad.addColorStop(0, '#000080'); grad.addColorStop(1, '#1084d0');
  g.fillStyle = grad; g.fillRect(4, 4, w - 8, 26);
  g.fillStyle = '#fff'; g.font = `bold 15px ${F.tahoma}`; g.textBaseline = 'middle';
  g.fillText(title, 12, 17);
  ['_', '□', '×'].forEach((s, i) => { bevel(g, w - 26 - (2 - i) * 24, 7, 20, 18); g.fillStyle = '#000'; g.font = `bold 13px ${F.tahoma}`; g.fillText(s, w - 21 - (2 - i) * 24, 16); });
  g.textBaseline = 'alphabetic';
}

// A homepage block: beveled table, colored heading, Verdana body, and a Flash movie that loads as you approach.
function exhibit(kit, meme) {
  const g = new THREE.Group();
  const color = SITE_COLORS[meme.year % SITE_COLORS.length];
  let movieTop = 0;
  const page = autoTexture(640, 1200, (c, w, h) => {
    bevel(c, 0, 0, w, h);
    c.fillStyle = '#000020'; c.fillRect(6, 6, w - 12, h - 12);
    for (let i = 0; i < 160; i++) { c.fillStyle = i % 7 ? '#ffffff' : '#ffff99'; c.fillRect(6 + ((i * 97) % (w - 12)), 6 + ((i * 53) % 1180), 1, 1); }
    c.fillStyle = color; c.font = `bold 34px ${F.arial}`;
    c.shadowColor = '#000'; c.shadowOffsetX = 2; c.shadowOffsetY = 2;
    let y = wrapText(c, meme.name, 24, 52, w - 48, 38);
    c.shadowColor = 'transparent';
    c.font = `bold 13px ${F.verdana}`; c.fillStyle = '#ff0000'; c.fillText(`*** ${meme.year} ***`, 24, y + 2); y += 26;
    movieTop = y; y += 270; // room for the movie
    c.fillStyle = '#ffffff'; c.font = `16px ${F.verdana}`;
    y = wrapText(c, meme.summary, 24, y, w - 48, 21) + 8;
    c.fillStyle = '#cccccc'; c.font = `14px ${F.verdana}`;
    y = wrapText(c, meme.origin.story, 24, y, w - 48, 19) + 6;
    c.fillStyle = '#00ffff'; c.font = `13px ${F.verdana}`;
    c.fillText(`found on: ${meme.origin.platform}${meme.origin.creator ? `  ·  by ${meme.origin.creator}` : ''}`, 24, y + 4);
    // the rainbow divider gif
    const rb = c.createLinearGradient(24, 0, w - 24, 0);
    ['#f00', '#f90', '#ff0', '#0f0', '#0ff', '#00f', '#f0f'].forEach((col, i, a) => rb.addColorStop(i / (a.length - 1), col));
    c.fillStyle = rb; c.fillRect(24, y + 18, w - 48, 4);
    return y + 40;
  });
  const p = panel(page, 3.2, { side: THREE.DoubleSide });
  const height = p.geometry.parameters.height;
  p.position.y = 0.4 + height / 2;
  g.add(p);

  // The movie: a preloader that fills as you come close, then plays the meme as scrolling text.
  let progress = 0, playing = false, scroll = 0;
  const movie = canvasTexture(560, 240, (c, w, h) => drawMovie(c, w, h));
  function drawMovie(c, w, h) {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#808080'; c.strokeRect(0.5, 0.5, w - 1, h - 1);
    if (!playing) {
      c.fillStyle = '#000'; c.font = `bold 16px ${F.arial}`; c.textAlign = 'center';
      c.fillText(`LOADING... ${Math.floor(progress)}%`, w / 2, h / 2 - 18);
      c.strokeStyle = '#000'; c.strokeRect(w / 2 - 150.5, h / 2 - 4.5, 300, 18);
      c.fillStyle = '#000099'; c.fillRect(w / 2 - 148, h / 2 - 2, 296 * progress / 100, 14);
      c.font = `11px ${F.arial}`; c.fillStyle = '#666'; c.fillText('[ skip intro ]', w / 2, h - 18);
      c.textAlign = 'left';
      return;
    }
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.font = `bold 44px ${F.arial}`; c.fillStyle = color; c.textBaseline = 'middle';
    const text = `${meme.quote ?? meme.name}   ·   `;
    const tw = c.measureText(text).width;
    for (let x = -(scroll % tw); x < w; x += tw) c.fillText(text, x, h / 2);
    c.textBaseline = 'alphabetic';
  }
  const m = panel(movie, 2.8);
  // Sits in the gap the page layout left for it, just below the heading.
  m.position.set(0, p.position.y + height / 2 - (3.2 / 640) * (movieTop + 135), 0.01);
  g.add(m);
  let acc = 0;
  g.userData.near = (d, dt) => {
    acc += dt;
    if (acc < 1 / 15) return; // animate at GIF speed
    const step = acc; acc = 0;
    if (d < 9 && !playing) { progress = Math.min(100, progress + step * (20 + Math.random() * 40)); if (progress >= 100) playing = true; redraw(movie, drawMovie); }
    else if (playing && d < 14) { scroll += step * 160; redraw(movie, drawMovie); }
  };
  return g;
}

// 32x32 hamster, two frames, drawn pixel by pixel the way GIF animators did.
function hamsterFrame(c, ox, oy, frame) {
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(ox + x, oy + y, 1, 1); };
  const bounce = frame ? 1 : 0;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const bx = (x - 15.5) / 10, by = (y - 19 - bounce) / 11;
    const hx = (x - 15.5) / 8, hy = (y - 10 - bounce) / 7;
    const inBody = bx * bx + by * by < 1, inHead = hx * hx + hy * hy < 1;
    if (inBody || inHead) {
      const belly = ((x - 15.5) / 6) ** 2 + ((y - 21 - bounce) / 7) ** 2 < 1;
      px(x, y, belly ? '#f6e7cf' : '#d99a5b');
      const edge = inBody ? bx * bx + by * by > 0.8 : !inBody && hx * hx + hy * hy > 0.75;
      if (edge) px(x, y, '#7a4a22');
    }
  }
  [[10, 3], [21, 3]].forEach(([x, y]) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) px(x + i, y + j + bounce, i === 1 && j === 1 ? '#f2a0b4' : '#7a4a22'); });
  px(12, 9 + bounce, '#000'); px(19, 9 + bounce, '#000'); px(13, 9 + bounce, '#000'); px(20, 9 + bounce, '#000');
  px(15, 12 + bounce, '#f2a0b4'); px(16, 12 + bounce, '#f2a0b4');
  const armY = frame ? 12 : 20;
  for (let i = 0; i < 4; i++) { px(5 + i, armY + (frame ? -i : 0), '#d99a5b'); px(26 - i, armY + (frame ? -i : 0), '#d99a5b'); }
  for (let i = 0; i < 3; i++) { px(10 + i, 30, '#7a4a22'); px(19 + i, 30, '#7a4a22'); }
}

// The Hampster Dance: a whole wall of them, and a song that will not leave your head.
function hampsterDance(kit, meme) {
  const g = exhibit(kit, meme);
  const frames = [0, 1].map((f) => canvasTexture(32, 32, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 32, 32); hamsterFrame(c, 0, 0, f); }, { pixel: true, repeat: [8, 4] }));
  const wallMat = new THREE.MeshBasicMaterial({ map: frames[0], side: THREE.DoubleSide });
  // Extends the exhibit into a wall of hamsters on either side.
  for (const x of [-5.8, 5.8]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wallMat);
    wall.position.set(x, 2.4, -0.2);
    g.add(wall);
  }
  let stop = null, f = 0, acc = 0;
  const melody = [84, 86, 88, 86, 84, 81, 79, 81, 84, 86, 88, 91, 88, 86, 84, 0];
  g.userData.near = ((base) => (d, dt) => {
    base(d, dt);
    acc += dt;
    if (acc > 0.18) { acc = 0; f ^= 1; wallMat.map = frames[f]; }
    if (d < 9 && !stop) stop = kit.sound.start(kit.audio.loop(170, 2, 16, (i, at) => {
      if (melody[i]) kit.audio.note(melody[i], 0.12, { type: 'square', gain: 0.035, at, slideTo: 2 ** ((melody[i] - 69 + 0.6) / 12) * 440 });
      if (i % 4 === 0) kit.audio.noise(0.05, { gain: 0.08, at, filter: 5000, type: 'highpass' });
    }));
    if (d > 13 && stop) { stop(); stop = null; }
  })(g.userData.near);
  return g;
}

// All Your Base: the cutscene plays out on a black screen as you approach.
function allYourBase(kit, meme) {
  const g = exhibit(kit, meme);
  const lines = [
    ['', 'In A.D. 2101'], ['', 'War was beginning.'], ['Captain:', 'What happen ?'], ['Mechanic:', 'Somebody set up us the bomb.'],
    ['Operator:', 'We get signal.'], ['CATS:', 'All your base are belong to us.'], ['CATS:', 'You have no chance to survive make your time.'], ['Captain:', 'For great justice.'],
  ];
  let line = -1, acc = 0;
  const screen = canvasTexture(640, 200, (c, w, h) => draw(c, w, h));
  function draw(c, w, h) {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    if (line < 0) return;
    const [who, text] = lines[line];
    c.fillStyle = '#fff'; c.font = `22px ${F.courier}`;
    if (who) c.fillText(who, 24, 70);
    c.font = `30px ${F.courier}`;
    wrapText(c, text, who ? 180 : 24, 70, w - (who ? 200 : 48), 36);
  }
  const s = panel(screen, 5);
  s.position.set(-1.5, 5.2, 0);
  g.add(s);
  const base = g.userData.near;
  g.userData.near = (d, dt) => {
    base(d, dt);
    if (d > 10) { if (line !== -1 && d > 16) { line = -1; redraw(screen, draw); } return; }
    acc += dt;
    if (line === -1 || (acc > 2.6 && line < lines.length - 1)) {
      acc = 0; line += 1; redraw(screen, draw);
      if (lines[line][0] === 'CATS:') kit.audio.speak(lines[line][1], { pitch: 0.1, rate: 0.75 });
      else kit.audio.tone(220, 0.08, { type: 'square', gain: 0.03 });
    }
  };
  return g;
}

function door(kit, { target, kind }) {
  const g = new THREE.Group();
  const label = kind === 'back' ? '<< Back' : kind === 'deeper' ? 'Next Site >>' : 'ENTER >>';
  const tex = autoTexture(520, 400, (c, w) => {
    c.fillStyle = '#ffff00'; c.font = `bold 34px ${F.arial}`; c.textAlign = 'center';
    c.shadowColor = '#ff0000'; c.shadowOffsetX = 2; c.shadowOffsetY = 2;
    let y = wrapText(c, kind === 'deeper' ? `The Archive Webring` : target.title, w / 2, 44, w - 20, 38);
    c.shadowColor = 'transparent';
    if (kind === 'deeper') { c.fillStyle = '#00ffff'; c.font = `16px ${F.verdana}`; c.fillText(`next stop: ${target.title}`, w / 2, y + 2); y += 22; }
    bevel(c, w / 2 - 120, y + 10, 240, 50);
    c.fillStyle = '#000'; c.font = `bold 22px ${F.tahoma}`; c.fillText(label, w / 2, y + 43);
    return y + 70;
  });
  const p = panel(tex, 2.8, { transparent: true, side: THREE.DoubleSide });
  p.position.y = 2.2;
  g.add(p);
  return g;
}

function threadSign(kit, { meme, why }) {
  const tex = autoTexture(400, 300, (c, w) => {
    c.fillStyle = '#000020'; c.fillRect(0, 0, w, 300);
    c.fillStyle = '#ff66ff'; c.font = `bold 18px ${F.verdana}`; c.fillText('LINK EXCHANGE!', 12, 26);
    c.fillStyle = '#00ffff'; c.font = `bold 20px ${F.verdana}`;
    let y = wrapText(c, `visit: ${meme.name} >>`, 12, 56, w - 24, 24);
    c.fillStyle = '#fff'; c.font = `14px ${F.verdana}`;
    y = wrapText(c, why, 12, y + 4, w - 24, 18);
    return y + 4;
  });
  const p = panel(tex, 1.6, { side: THREE.DoubleSide });
  p.position.y = 1.6;
  const g = new THREE.Group(); g.add(p);
  g.userData.update = (t, dt, player) => { if (player) p.lookAt(player.pos.x, 1.6, player.pos.z); };
  return g;
}

function sign(kit, room) {
  const g = new THREE.Group();
  const title = autoTexture(1400, 360, (c, w) => {
    c.textAlign = 'center';
    c.font = `bold 88px ${F.comic}`; c.fillStyle = '#ffff00';
    c.shadowColor = '#ff0000'; c.shadowOffsetX = 4; c.shadowOffsetY = 4;
    c.fillText(`~*~ ${room.title} ~*~`, w / 2, 100);
    c.shadowColor = 'transparent';
    c.font = `30px ${F.verdana}`; c.fillStyle = '#ffffff';
    return wrapText(c, room.blurb ?? '', w / 2, 160, w - 60, 38) + 10;
  });
  const p = panel(title, 9, { transparent: true, side: THREE.DoubleSide });
  p.position.set(0, 5.8, -9);
  g.add(p);
  // UNDER CONSTRUCTION, forever.
  const uc = canvasTexture(320, 48, (c, w, h) => {
    for (let x = -h; x < w; x += 24) { c.fillStyle = '#ffcc00'; c.beginPath(); c.moveTo(x, h); c.lineTo(x + 12, h); c.lineTo(x + 12 + h, 0); c.lineTo(x + h, 0); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.moveTo(x + 12, h); c.lineTo(x + 24, h); c.lineTo(x + 24 + h, 0); c.lineTo(x + 12 + h, 0); c.fill(); }
    c.fillStyle = '#ffcc00'; c.fillRect(54, 10, 212, 28);
    c.fillStyle = '#000'; c.font = `bold 18px ${F.arial}`; c.textAlign = 'center'; c.fillText('UNDER CONSTRUCTION', w / 2, 31);
  });
  const ucm = panel(uc, 3, { side: THREE.DoubleSide });
  ucm.position.set(0, 3.9, -9);
  g.add(ucm);
  return g;
}

function env(kit, group, layout) {
  const tile = starTile();
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(200, 200);
  group.add(floor(new THREE.MeshBasicMaterial({ map: tile })));
  const skyTile = starTile('#000000');
  skyTile.wrapS = skyTile.wrapT = THREE.RepeatWrapping; skyTile.repeat.set(40, 20);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: skyTile, side: THREE.BackSide, fog: false })));

  // Links pages: 88x31 buttons tacked up along the walls.
  const buttons = BUTTONS.map(([a, b, col]) => button88(a, b, col));
  for (let i = 0, z = 2; z > layout.end; i++, z -= 3.5) {
    for (const side of [-1, 1]) {
      const b = panel(buttons[(i * 3 + (side > 0 ? 1 : 0)) % buttons.length], 1.3, { side: THREE.DoubleSide });
      b.position.set(side * (layout.width + 0.8), 3.8 + ((i * 7 + side) % 3) * 0.5, z);
      b.rotation.y = -side * Math.PI / 2;
      group.add(b);
    }
  }
  // A hit counter that ticks up while you're here.
  const visits = 4219 + Math.floor(Math.random() * 300);
  let count = visits;
  const counter = canvasTexture(140, 40, (c) => drawCounter(c));
  function drawCounter(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, 140, 40);
    String(count).padStart(7, '0').split('').forEach((d, i) => { c.fillStyle = '#222'; c.fillRect(4 + i * 19, 4, 17, 32); c.fillStyle = '#ff3333'; c.font = `bold 24px ${F.courier}`; c.fillText(d, 6 + i * 19, 30); });
  }
  const cm = panel(counter, 1.6, { side: THREE.DoubleSide });
  cm.position.set(0, 3.4, layout.back.z - 0.2);
  cm.rotation.y = Math.PI;
  group.add(cm);
  let acc = 0;
  return {
    sky: new THREE.Color(0x000000),
    fog: new THREE.Fog(0x000000, 18, 90),
    update(dt) { acc += dt; if (acc > 6) { acc = 0; count++; redraw(counter, drawCounter); } },
  };
}

export default {
  env, sign, door, threadSign, exhibit,
  bespoke: { 'hampster-dance': hampsterDance, 'all-your-base': allYourBase },
};
