import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indexArchive, rng, fakeCount, compact, roomLayout } from '../game/src/data.js';
import { buildTree, checkTree, deeper, renderTree } from '../game/src/tree.js';
import { validateArchive, checkAgainstSchema, loadArchive } from '../tools/validate-data.mjs';

const { eras, memes, rooms, schema, roomSchema } = await loadArchive();

test('shipped data satisfies the bot/game contract', () => {
  assert.deepEqual(validateArchive(eras, memes, schema, rooms, roomSchema), []);
});

test('every era has a style, a hub and at least one meme', async () => {
  const src = await readFile(new URL('../game/src/styles/index.js', import.meta.url), 'utf8');
  for (const era of eras) {
    assert.match(src, new RegExp(`\\b${era.id}\\b`), `no style for ${era.id}`);
    assert.ok(rooms.some((r) => r.kind === 'hub' && r.era === era.id), `no hub for ${era.id}`);
    assert.ok(memes.some((m) => m.era === era.id), `no memes in ${era.id}`);
  }
});

test('validator catches meme contract violations', () => {
  const bad = { ...memes[0], id: 'Bad Id', year: 2030, extra: 1 };
  delete bad.sources;
  const errors = validateArchive(eras, [bad, memes[0], memes[0]], schema);
  for (const expected of ['must match', 'missing "sources"', 'unknown property "extra"', 'outside era', 'duplicate id']) {
    assert.ok(errors.some((e) => e.includes(expected)), `expected an error containing "${expected}"`);
  }
  assert.equal(checkAgainstSchema('🌈🐱', { type: 'string', maxLength: 2 }).length, 0, 'counts code points, not UTF-16 units');
  assert.equal(checkAgainstSchema(null, { type: ['string', 'null'] }).length, 0);
  assert.equal(checkAgainstSchema(3, { type: ['string', 'null'] }).length, 1);
});

test('tree: structure, era inheritance, trunk and threads', () => {
  const tree = buildTree(rooms, memes);
  assert.equal(tree.root.kind, 'void');
  assert.deepEqual(tree.trunk.map((h) => h.era), eras.map((e) => e.id), 'hubs descend in era order');
  assert.equal(deeper(tree, tree.trunk.at(-1).id), tree.end, 'the last era leads to the end');
  assert.equal(deeper(tree, tree.trunk[0].id), tree.trunk[1]);
  const nested = tree.byId.get('algo-brainrot-italian');
  assert.equal(nested.era, 'algo', 'era inherited through two levels');
  assert.deepEqual(nested.path, ['archive', 'algo', 'algo-brainrot', 'algo-brainrot-italian']);
  // Threads go both ways and know which room the other end is in.
  const there = tree.threads.get('nyan-cat').find((t) => t.to === 'hampster-dance');
  const back = tree.threads.get('hampster-dance').find((t) => t.to === 'nyan-cat');
  assert.equal(there.room, 'flash-loops');
  assert.equal(back.room, 'social-joy');
  assert.match(renderTree(tree), /Italian Brainrot \[algo-brainrot-italian\]/);
});

test('tree checks catch structural mistakes', () => {
  const cases = [
    [rooms.map((r) => (r.id === 'dawn-symbols' ? { ...r, parent: 'nowhere' } : r)), 'unknown parent'],
    [rooms.map((r) => (r.id === 'dawn-forward' ? { ...r, memes: [...r.memes, 'emoticon'] } : r)), 'placed in both'],
    [rooms.map((r) => (r.id === 'dawn-symbols' ? { ...r, memes: r.memes.filter((m) => m !== 'spam') } : r)), 'not placed'],
    [rooms.map((r) => (r.id === 'flash-loops' ? { ...r, memes: [...r.memes, 'doge'] } : r)), 'placed in both'],
    [rooms.map((r) => (r.id === 'dawn' ? { ...r, parent: 'dawn-symbols' } : r)), 'loops'],
    [rooms.filter((r) => r.kind !== 'end'), 'missing the end room'],
  ];
  for (const [bad, expected] of cases) {
    assert.ok(checkTree(bad, memes, eras).some((e) => e.includes(expected)), `expected "${expected}"`);
  }
  // A meme in a room of the wrong era.
  const moved = rooms.map((r) => {
    if (r.id === 'social-animals') return { ...r, memes: r.memes.filter((m) => m !== 'doge') };
    if (r.id === 'flash-loops') return { ...r, memes: [...r.memes, 'doge'] };
    return r;
  });
  assert.ok(checkTree(moved, memes, eras).some((e) => e.includes('era "social" but sits in room flash-loops')));
});

test('room layout: exhibits face the walkway, doors fit, arrivals stand clear', () => {
  const l = roomLayout({ memes: 4, doors: 3 });
  assert.equal(l.exhibits.length, 4);
  assert.deepEqual(l.exhibits.map((e) => e.side), [-1, 1, -1, 1]);
  for (const e of l.exhibits) {
    assert.ok(Math.sign(e.x) === e.side && Math.sign(e.view.x) === e.side);
    assert.ok(Math.hypot(e.view.x - e.pad.x, e.view.z - e.pad.z) > 1, 'a thread arrival does not land on a pad');
  }
  assert.equal(l.doors.length, 3);
  for (const d of l.doors) assert.ok(Math.abs(d.x) < l.width && d.z === l.end);
  const [x0, x1, z0, z1] = l.walk[0];
  assert.ok(z0 < l.end && z1 > 0 && x0 === -l.width && x1 === l.width);
  assert.ok(roomLayout({ memes: 0, doors: 7 }).width > roomLayout({ memes: 0, doors: 2 }).width, 'rooms widen for many doors');
});

test('indexArchive groups memes by era in chronological order', () => {
  const archive = indexArchive(eras, memes);
  assert.equal(archive.all.length, memes.length);
  for (const s of archive.strata) {
    const years = s.memes.map((m) => m.year);
    assert.deepEqual(years, [...years].sort((a, b) => a - b));
  }
});

test('deterministic helpers', () => {
  const a = rng('rickroll'), b = rng('rickroll');
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.equal(fakeCount('doge', 2013), fakeCount('doge', 2013));
  assert.ok(fakeCount('x', 2024) > fakeCount('x', 1996));
  assert.equal(compact(1500), '1.5K');
  assert.equal(compact(2_300_000_000), '2.3B');
});
