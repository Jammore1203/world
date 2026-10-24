import * as THREE from 'three';

// Faceless mannequins: people in the archive are remembered as silhouettes.
export function figure(material, { height = 1.75 } = {}) {
  const s = height / 1.75;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const limb = (r, len) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r * s, len * s, 4, 8), material);
    m.position.y = -(len * s) / 2 - r * s;
    pivot.add(m);
    return pivot;
  };
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * s, 0.42 * s, 4, 10), material);
  torso.position.y = 1.18 * s;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 16, 12), material);
  head.position.y = 1.62 * s;
  const armL = limb(0.05, 0.5), armR = limb(0.05, 0.5), legL = limb(0.07, 0.7), legR = limb(0.07, 0.7);
  armL.position.set(-0.23 * s, 1.45 * s, 0); armR.position.set(0.23 * s, 1.45 * s, 0);
  legL.position.set(-0.1 * s, 0.86 * s, 0); legR.position.set(0.1 * s, 0.86 * s, 0);
  body.add(torso, head, armL, armR, legL, legR);
  root.userData = { body, head, armL, armR, legL, legR, phase: Math.random() * Math.PI * 2 };
  root.traverse((o) => { o.castShadow = true; });
  return root;
}

// Poses: idle (breathing), talk (gesturing), run, naruto (arms swept back), wave.
export function pose(fig, t, mode = 'idle') {
  const { body, armL, armR, legL, legR, head, phase } = fig.userData;
  const p = t + phase;
  body.rotation.x = 0; body.position.y = 0;
  head.rotation.set(0, 0, 0);
  switch (mode) {
    case 'run': {
      const w = Math.sin(p * 11);
      legL.rotation.x = w * 0.9; legR.rotation.x = -w * 0.9;
      armL.rotation.x = -w * 0.8; armR.rotation.x = w * 0.8;
      armL.rotation.z = armR.rotation.z = 0;
      body.rotation.x = 0.18; body.position.y = Math.abs(Math.cos(p * 11)) * 0.06;
      break;
    }
    case 'naruto': {
      const w = Math.sin(p * 12);
      legL.rotation.x = w * 1.0; legR.rotation.x = -w * 1.0;
      armL.rotation.x = armR.rotation.x = 1.25; armL.rotation.z = 0.15; armR.rotation.z = -0.15;
      body.rotation.x = 0.55; body.position.y = Math.abs(Math.cos(p * 12)) * 0.05;
      break;
    }
    case 'talk':
      legL.rotation.x = legR.rotation.x = 0;
      armL.rotation.x = -0.4 + Math.sin(p * 3) * 0.25; armR.rotation.x = -0.2 + Math.sin(p * 2.3) * 0.2;
      armL.rotation.z = armR.rotation.z = 0;
      head.rotation.y = Math.sin(p * 0.8) * 0.4;
      break;
    case 'dance': {
      const w = Math.sin(p * 6);
      legL.rotation.x = Math.max(0, w) * 0.5; legR.rotation.x = Math.max(0, -w) * 0.5;
      armL.rotation.x = -1.2 + w * 0.6; armR.rotation.x = -1.2 - w * 0.6;
      armL.rotation.z = 0.4; armR.rotation.z = -0.4;
      body.position.y = Math.abs(w) * 0.05; body.rotation.z = w * 0.08;
      break;
    }
    default:
      legL.rotation.x = legR.rotation.x = 0;
      armL.rotation.x = armR.rotation.x = 0;
      armL.rotation.z = 0.06; armR.rotation.z = -0.06;
      body.position.y = Math.sin(p * 1.6) * 0.01;
  }
}
