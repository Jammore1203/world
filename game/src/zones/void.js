import * as THREE from 'three';
import { canvasTexture, F } from '../engine/textures.js';
import { glowSprite, floor } from './common.js';

// The Threshold: black, starless at first, then not. One light, far away. Walk into it.
const first = [
  'Everything that was ever posted is still here, somewhere.',
  'Every in-joke. Every looping gif. Every video sent to one friend, then a million.',
  'The archive keeps them in strata, deep as memory.',
  'Walk into the light. Go down.',
];
const again = [
  'You came back. Everyone does.',
  'The end of the internet is only the beginning of it.',
  'It is all still here.',
  'Go down again.',
];

export default function buildVoid(kit) {
  const group = new THREE.Group();
  let visits = 0;

  const stars = new THREE.BufferGeometry();
  const pts = new Float32Array(3000 * 3);
  for (let i = 0; i < pts.length; i += 3) {
    const r = 60 + Math.random() * 180, a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
    pts[i] = r * Math.sin(b) * Math.cos(a); pts[i + 1] = r * Math.cos(b); pts[i + 2] = r * Math.sin(b) * Math.sin(a);
  }
  stars.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xcfc6ff, size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false });
  group.add(new THREE.Points(stars, starMat));

  // A mirror-black floor that barely catches the light.
  const ground = floor(new THREE.MeshBasicMaterial({ color: 0x050409 }));
  group.add(ground);
  const pool = glowSprite('rgba(120,90,255,0.35)', 40, 0.6);
  pool.position.set(0, 0.02, -32);
  group.add(pool);

  const orb = new THREE.Group();
  orb.position.set(0, 3.2, -34);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 24), new THREE.MeshBasicMaterial({ color: 0xf2eeff }));
  const halo = glowSprite('rgba(170,140,255,0.9)', 12);
  const halo2 = glowSprite('rgba(255,170,230,0.5)', 26, 0.5);
  orb.add(halo2, halo, core);
  group.add(orb);

  // Lines of text that surface in the dark as you walk toward the light.
  const lines = [first, again].map((set) => set.map((text, i) => {
    const tex = canvasTexture(1400, 120, (g, w, h) => {
      g.font = `italic 64px "Cormorant Garamond", ${F.georgia}`;
      g.fillStyle = '#e9e4ff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(185,166,255,.8)'; g.shadowBlur = 18;
      g.fillText(text, w / 2, h / 2);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.position.set(0, 2.4 + (i % 2) * 0.3, -5 - i * 7.5);
    m.visible = false;
    group.add(m);
    return m;
  }));
  let shown = lines[0];

  kit.trigger({ x: 0, z: -34, r: 2.4, enter: () => kit.go(kit.tree.trunk[0].id) });

  return {
    group,
    sky: new THREE.Color(0x000000),
    fog: new THREE.FogExp2(0x000000, 0.035),
    arrive: () => ({ x: 0, z: 4, yaw: 0 }),
    walk: [[-12, 12, -40, 8]],
    obstacles: [],
    onEnter() {
      visits += 1;
      lines.flat().forEach((m) => { m.visible = false; m.material.opacity = 0; });
      shown = visits > 1 ? lines[1] : lines[0];
      shown.forEach((m) => { m.visible = true; });
    },
    update(dt, t, player) {
      const pulse = 1 + Math.sin(t * 1.3) * 0.06;
      orb.scale.setScalar(pulse);
      halo.material.rotation = t * 0.1;
      starMat.opacity = Math.min(0.9, Math.max(0, (4 - player.pos.z) / 30));
      for (const m of shown) {
        const d = Math.abs(player.pos.z - (m.position.z + 3));
        const target = d < 6 ? 1 - d / 6 : 0;
        m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 2.5);
        m.lookAt(player.pos.x, m.position.y, player.pos.z);
      }
    },
  };
}
