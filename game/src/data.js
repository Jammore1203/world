// Pure data helpers. No DOM here, so they're testable in node.

export function indexArchive(eras, memes) {
  const strata = eras.map((era) => ({
    ...era,
    memes: memes.filter((m) => m.era === era.id).sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)),
  }));
  return { strata, byId: new Map(memes.map((m) => [m.id, m])), all: strata.flatMap((s) => s.memes) };
}

// Deterministic randomness so the same meme always gets the same view count,
// usernames and so on, while still looking organic.
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bigger and more absurd the more recent the meme.
export function fakeCount(id, year, salt = '') {
  const rand = rng(id + salt);
  const scale = Math.pow(10, Math.min(9, 3 + (year - 1995) / 4));
  return Math.floor(scale * (0.5 + rand() * 4));
}

export function compact(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// Every room shares one floor plan. You arrive at z=0 facing -z with the door back to the
// parent behind you; exhibits alternate along both walls; doors to child rooms (and, in an
// era hub, the way deeper) line the far wall. Thread pads sit beside linked exhibits.
export function roomLayout({ memes = 0, doors = 0, spacing = 10, offset = 6.5 } = {}) {
  const first = -10;
  const exhibits = Array.from({ length: memes }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = first - i * spacing;
    return {
      i, side, x: side * offset, z,
      yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, // faces the walkway
      pad: { x: side * 3.8, z: z + 3 },
      view: { x: side * 1.2, z, yaw: -side * Math.PI / 2 }, // where a thread drops you: facing the exhibit
    };
  });
  const end = memes ? first - (memes - 1) * spacing - spacing * 1.2 : -16;
  const gap = 5;
  const doorList = Array.from({ length: doors }, (_, i) => {
    const x = (i - (doors - 1) / 2) * gap;
    return { i, x, z: end, arrive: { x, z: end + 3, yaw: Math.PI } };
  });
  const width = Math.max(10, ((doors - 1) * gap) / 2 + 3.5);
  return {
    exhibits, doors: doorList, end, width,
    back: { x: 0, z: 4.5 },
    spawn: { x: 0, z: 0, yaw: 0 },
    walk: [[-width, width, end - 1.2, 5.2]],
  };
}
