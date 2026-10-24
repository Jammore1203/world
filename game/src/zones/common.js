import * as THREE from 'three';
import { canvasTexture } from '../engine/textures.js';

// A big sphere painted with a vertical gradient: cheap skies that match each era.
export function gradientSky(stops, { radius = 400 } = {}) {
  const tex = canvasTexture(4, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    stops.forEach(([at, color]) => grad.addColorStop(at, color));
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
}

// Soft circular glow, used for orbs, lamps and halos.
export function glowSprite(color, size, opacity = 1) {
  const tex = canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color); grad.addColorStop(0.25, color); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}

export function floor(material, size = 400) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Loops started inside a zone, stopped when you leave it.
export function soundscape() {
  const stops = new Set();
  return {
    start(stop) { stops.add(stop); return () => { stop(); stops.delete(stop); }; },
    stopAll() { stops.forEach((s) => s()); stops.clear(); },
  };
}
