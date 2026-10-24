// First-person input: pointer-lock mouse look + keys on desktop, twin-thumb on touch.
const LOOK = 0.0022;
const TOUCH_LOOK = 0.006;

export class Controls {
  constructor(canvas, stickEl) {
    this.canvas = canvas;
    this.stick = stickEl;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.joy = { x: 0, y: 0 };
    this.enabled = false;
    this.touches = new Map();

    addEventListener('keydown', (e) => { this.keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('click', () => { if (this.enabled && !this.isTouch) canvas.requestPointerLock?.(); });
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas) this.turn(e.movementX * LOOK, e.movementY * LOOK);
      else if (this.dragging) this.turn(e.movementX * LOOK * 1.6, e.movementY * LOOK * 1.6);
    });
    // Fallback when pointer lock is unavailable (some embeds): drag to look.
    canvas.addEventListener('mousedown', () => { this.dragging = document.pointerLockElement !== canvas; });
    addEventListener('mouseup', () => { this.dragging = false; });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || !this.enabled) return;
      this.isTouch = true;
      const role = e.clientX < innerWidth * 0.45 && ![...this.touches.values()].some((t) => t.role === 'move') ? 'move' : 'look';
      this.touches.set(e.pointerId, { role, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      if (role === 'move') { this.stick.style.left = `${e.clientX}px`; this.stick.style.top = `${e.clientY}px`; this.stick.classList.add('is-on'); }
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const t = this.touches.get(e.pointerId);
      if (!t) return;
      if (t.role === 'look') this.turn((e.clientX - t.x) * TOUCH_LOOK, (e.clientY - t.y) * TOUCH_LOOK);
      t.x = e.clientX; t.y = e.clientY;
      if (t.role === 'move') {
        let dx = t.x - t.x0, dy = t.y - t.y0;
        const len = Math.hypot(dx, dy), max = 50;
        if (len > max) { dx *= max / len; dy *= max / len; }
        this.joy = { x: dx / max, y: dy / max };
        this.stick.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    });
    const end = (e) => {
      const t = this.touches.get(e.pointerId);
      if (!t) return;
      if (t.role === 'move') { this.joy = { x: 0, y: 0 }; this.stick.classList.remove('is-on'); this.stick.firstElementChild.style.transform = ''; }
      this.touches.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  turn(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy));
  }

  // Returns { forward, strafe, run } with forward/strafe in [-1, 1].
  read() {
    if (!this.enabled) return { forward: 0, strafe: 0, run: false };
    const k = this.keys;
    let forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    forward -= this.joy.y; strafe += this.joy.x;
    return { forward, strafe, run: k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(this.joy.x, this.joy.y) > 0.95 };
  }
}
