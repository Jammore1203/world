import * as THREE from 'three';

// Period system fonts first, then metric-compatible web fonts for devices that lack them.
export const F = {
  times: '"Times New Roman", Tinos, Times, serif',
  arial: 'Arial, Arimo, Helvetica, sans-serif',
  helvetica: '"Helvetica Neue", Helvetica, Arial, Arimo, sans-serif',
  verdana: 'Verdana, "DejaVu Sans", Arimo, sans-serif',
  tahoma: 'Tahoma, Verdana, "DejaVu Sans", Arimo, sans-serif',
  courier: '"Courier New", Cousine, Courier, monospace',
  lucida: '"Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Arimo, sans-serif',
  impact: 'Impact, Anton, "Arial Narrow", sans-serif',
  comic: '"Comic Sans MS", "Comic Neue", cursive',
  roboto: 'Roboto, Arimo, sans-serif',
  inter: 'Inter, -apple-system, "Segoe UI", Roboto, Arimo, sans-serif',
  georgia: 'Georgia, Tinos, serif',
};

export async function fontsReady() {
  const wanted = ['16px Tinos', 'bold 16px Tinos', '16px Arimo', 'bold 16px Arimo', '16px Cousine', '16px Anton', '16px Roboto', 'bold 16px Roboto', '16px Inter', '800 16px Inter'];
  await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 2500))]);
}

export function canvasTexture(w, h, draw, { pixel = false, repeat = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; }
  else tex.anisotropy = 8;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  tex.userData = { canvas, g, draw };
  return tex;
}

export function redraw(tex, draw = tex.userData.draw) {
  const { canvas, g } = tex.userData;
  g.clearRect(0, 0, canvas.width, canvas.height);
  draw(g, canvas.width, canvas.height);
  tex.needsUpdate = true;
}

// Word-wraps text into the canvas and returns the y after the last line.
export function wrapText(g, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && g.measureText(test).width > maxWidth) { g.fillText(line, x, y); line = word; y += lineHeight; }
    else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lineHeight; }
  return y;
}

// A flat panel sized from its texture's aspect ratio.
export function panel(tex, width, { transparent = false, side = THREE.FrontSide, lit = false, opacity = 1 } = {}) {
  const { canvas } = tex.userData;
  const geo = new THREE.PlaneGeometry(width, width * (canvas.height / canvas.width));
  const Mat = lit ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
  const mat = new Mat({ map: tex, transparent: transparent || opacity < 1, opacity, side, ...(lit ? { roughness: 0.6 } : {}) });
  return new THREE.Mesh(geo, mat);
}

// Classic Windows 9x two-tone bevel, the visual grammar of the late-90s web.
export function bevel(g, x, y, w, h, { inset = false, face = '#c0c0c0' } = {}) {
  g.fillStyle = face; g.fillRect(x, y, w, h);
  const [hi, lo, dark] = inset ? ['#808080', '#ffffff', '#000000'] : ['#ffffff', '#808080', '#000000'];
  g.fillStyle = hi; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
  g.fillStyle = dark; g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
  g.fillStyle = lo; g.fillRect(x + 2, y + h - 4, w - 4, 2); g.fillRect(x + w - 4, y + 2, 2, h - 4);
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Draws pixel art from rows of characters mapped to colors ('.' is transparent).
export function pixelArt(g, rows, palette, scale = 1, ox = 0, oy = 0) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = palette[ch];
    if (!c) return;
    g.fillStyle = c; g.fillRect(ox + x * scale, oy + y * scale, scale, scale);
  }));
}

// Like canvasTexture, but `draw` returns the height it used and the canvas is cropped to fit.
export function autoTexture(w, maxH, draw, opts) {
  const scratch = document.createElement('canvas');
  scratch.width = w; scratch.height = maxH;
  const used = Math.min(maxH, Math.ceil(draw(scratch.getContext('2d'), w, maxH)));
  return canvasTexture(w, used, (g) => g.drawImage(scratch, 0, 0), opts);
}
