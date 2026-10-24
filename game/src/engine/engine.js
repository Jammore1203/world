import * as THREE from 'three';
import { Controls } from './controls.js';
import { audio } from './audio.js';
import { soundscape } from '../zones/common.js';

const EYE = 1.6;
const RADIUS = 0.3;

// Owns the renderer, the player and the active zone. Zones are built lazily the
// first time you reach them and kept afterwards, so walking back is instant.
export class Engine {
  constructor({ canvas, ui, archive, tree, buildRoom }) {
    this.ui = ui;
    this.archive = archive;
    this.tree = tree;
    this.buildRoom = buildRoom;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping; // keep period colors exactly as they were
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 600);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera); // so things can be attached to your view
    this.controls = new Controls(canvas, ui.stick);
    this.player = { pos: new THREE.Vector3(), y: 0, bob: 0, frozen: false, shake: 0 };
    this.built = new Map();
    this.zone = null;
    this.zoneId = null;
    this.t = 0;
    this.travelling = false;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 82 : 72; // a little wider on portrait phones
    this.camera.updateProjectionMatrix();
  }

  yearOf(room) {
    if (!room || room.kind === 'void') return null;
    if (room.kind === 'end') return Infinity;
    return this.archive.eras.find((e) => e.id === room.era)?.start ?? null;
  }

  build(id) {
    if (this.built.has(id)) return this.built.get(id);
    const room = this.tree.byId.get(id);
    const triggers = [];
    const sound = soundscape();
    const kit = {
      THREE, engine: this, room, tree: this.tree, archive: this.archive, audio, sound,
      era: this.archive.eras.find((e) => e.id === room.era) ?? null,
      trigger: (def) => { const t = { inside: false, fired: false, ...def }; triggers.push(t); return t; },
      caption: (text, ms) => this.caption(text, ms),
      go: (to, opts) => this.go(to, opts),
    };
    const zone = this.buildRoom(kit);
    Object.assign(zone, { id, room, triggers, sound });
    zone.obstacles ??= [];
    this.built.set(id, zone);
    return zone;
  }

  // Travel to a room: fade out, roll the year if the era changes, fade in.
  // opts.from = the room you came from (arrive at its door); opts.meme = arrive facing that exhibit.
  async go(id, opts = {}) {
    if (this.travelling) return;
    if (!this.tree.byId.has(id)) id = this.tree.root.id;
    this.travelling = true;
    const next = this.build(id);
    if (!opts.instant) {
      this.ui.veil.classList.remove('is-clear');
      if (opts.thread) audio.tone(880, 1.2, { type: 'sine', gain: 0.05, slideTo: 220 });
      await wait(opts.thread ? 900 : 650);
      const from = this.yearOf(this.zone?.room), to = this.yearOf(next.room);
      if (from !== to) await this.rollYear(from, to);
    }
    if (this.zone && this.zone !== next) {
      this.zone.onLeave?.();
      this.zone.sound.stopAll();
      this.scene.remove(this.zone.group);
    }
    if (this.zone) for (const t of this.zone.triggers) if (t.inside) { t.inside = false; t.exit?.(); }
    this.zone = next;
    this.zoneId = id;
    this.scene.add(next.group);
    this.scene.background = next.sky ?? null;
    this.scene.fog = next.fog ?? null;
    const at = next.arrive(opts);
    this.player.pos.set(at.x, 0, at.z);
    this.player.y = at.y ?? 0;
    this.controls.yaw = at.yaw ?? 0;
    this.controls.pitch = 0;
    this.player.frozen = false;
    // Whatever you are already standing in on arrival should not fire (no bouncing through doors).
    for (const t of next.triggers) {
      t.inside = Math.hypot(at.x - t.x, at.z - t.z) < t.r;
      if (t.inside && t.once) t.fired = true;
    }
    next.onEnter?.(opts);
    const room = next.room;
    this.ui.era.textContent = room.path.slice(1).map((p) => this.tree.byId.get(p).title).join('  ›  ');
    if (history.replaceState) history.replaceState(null, '', room.kind === 'void' ? location.pathname : `#${id}`);
    this.ui.veil.classList.add('is-clear');
    this.ui.year.classList.remove('is-on');
    if (opts.thread) this.caption(`a thread pulls you to ${room.title}`, 2600);
    this.travelling = false;
  }

  rollYear(from, to) {
    const el = this.ui.year;
    el.classList.add('is-on');
    if (to === null) return Promise.resolve();
    if (to === Infinity) { el.textContent = '∞'; return wait(900); }
    const a = from === null || from === Infinity ? to - 12 : from;
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const k = Math.min(1, (now - start) / 900);
        el.textContent = Math.round(a + (to - a) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick); else setTimeout(resolve, 350);
      };
      requestAnimationFrame(tick);
    });
  }

  caption(text, ms = 4200) {
    const el = this.ui.caption;
    el.innerHTML = '';
    const s = document.createElement('span'); s.textContent = text;
    el.append(s);
    el.classList.add('is-on');
    clearTimeout(this._capTimer);
    this._capTimer = setTimeout(() => el.classList.remove('is-on'), ms);
  }

  walkable(x, z) {
    const zone = this.zone;
    if (!zone.walk.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) return false;
    return !zone.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + RADIUS);
  }

  step(dt) {
    const { player, controls } = this;
    if (!player.frozen) {
      const { forward, strafe, run } = controls.read();
      let f = forward, s = strafe;
      const len = Math.hypot(f, s);
      if (len > 1) { f /= len; s /= len; }
      const speed = (run ? 7 : 3.8) * dt;
      const sin = Math.sin(controls.yaw), cos = Math.cos(controls.yaw);
      const dx = (-sin * f + cos * s) * speed;
      const dz = (-cos * f - sin * s) * speed;
      const p = player.pos;
      if (this.walkable(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
      else if (this.walkable(p.x + dx, p.z)) p.x += dx;
      else if (this.walkable(p.x, p.z + dz)) p.z += dz;
      player.bob += Math.hypot(dx, dz) * 2.2;
    }
    for (const t of this.zone.triggers) {
      const d = Math.hypot(player.pos.x - t.x, player.pos.z - t.z);
      const inside = d < t.r;
      if (inside && !t.inside && !(t.once && t.fired)) { t.inside = true; t.fired = true; t.enter?.(d); }
      else if (!inside && t.inside) { t.inside = false; t.exit?.(); }
      if (t.near) t.near(d, dt);
    }
    this.zone.update?.(dt, this.t, player);
    const cam = this.camera;
    const shake = player.shake > 0 ? (player.shake -= dt, (Math.random() - 0.5) * 0.08) : 0;
    cam.position.set(player.pos.x + shake, player.y + EYE + Math.sin(player.bob) * 0.035, player.pos.z);
    cam.rotation.set(controls.pitch, controls.yaw, shake * 0.5);
  }

  start() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.t += dt;
      if (this.zone) { this.step(dt); this.renderer.render(this.scene, this.camera); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
