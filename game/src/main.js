import { Engine } from './engine/engine.js';
import { audio } from './engine/audio.js';
import { fontsReady } from './engine/textures.js';
import { indexArchive } from './data.js';
import { buildTree } from './tree.js';
import { buildZone } from './zones/index.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  const [eras, memes, { rooms }] = await Promise.all(['eras', 'memes', 'rooms'].map((f) => fetch(`data/${f}.json`).then((r) => r.json())));
  await fontsReady();
  const archive = { ...indexArchive(eras, memes), eras };
  const tree = buildTree(rooms, memes);
  const engine = new Engine({
    canvas: $('world'),
    archive, tree, buildRoom: buildZone,
    ui: { veil: $('veil'), year: $('veil-year'), caption: $('caption'), era: $('hud-era'), stick: $('stick') },
  });
  window.__archive = engine; // handy in the console: __archive.go('tube-bait')

  await engine.go(location.hash.slice(1) || tree.root.id, { instant: true });
  engine.start();

  $('enter').addEventListener('click', () => {
    audio.unlock();
    engine.controls.enabled = true;
    $('gate').classList.add('is-gone');
    if (matchMedia('(pointer: fine)').matches) $('world').requestPointerLock?.();
    engine.zone.onWake?.();
  });
  $('hud-sound').addEventListener('click', (e) => { e.currentTarget.textContent = audio.toggle() ? 'sound on' : 'sound off'; });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && matchMedia('(pointer: fine)').matches) engine.caption('paused. click to keep walking.', 2500);
  });
}

boot().catch((err) => {
  console.error(err);
  document.querySelector('.gate__inner p').textContent = 'The archive could not be reached. It needs WebGL, and must be opened through a web server (npm start).';
});
