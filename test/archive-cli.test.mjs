import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import * as ops from '../tools/lib/archive-ops.mjs';
import { parseArgs, apply } from '../tools/archive.mjs';
import { loadArchive, validateArchive } from '../tools/validate-data.mjs';

const { eras, memes, rooms, schema, roomSchema } = await loadArchive();
const data = { rooms, memes };
const valid = (d) => validateArchive(eras, d.memes, schema, d.rooms, roomSchema);

test('add a room, fill it, nest another inside, and stay valid', () => {
  let d = ops.addRoom(data, { id: 'tube-music', parent: 'tube', title: 'Music Videos', blurb: 'Songs that escaped.' });
  d = ops.placeMeme(d, { meme: 'rickroll', room: 'tube-music' });
  d = ops.addRoom(d, { id: 'tube-music-80s', parent: 'tube-music', title: 'Eighties Revival' });
  d = ops.placeMeme(d, { meme: 'keyboard-cat', room: 'tube-music-80s' });
  assert.deepEqual(valid(d), []);
  const i = d.rooms.findIndex((r) => r.id === 'tube-music');
  assert.ok(i > d.rooms.findIndex((r) => r.id === 'tube-home'), 'new rooms go after the parent\'s existing branch');
  assert.ok(!d.rooms.find((r) => r.id === 'tube-bait').memes.includes('rickroll'), 'placing moves, never duplicates');
  assert.equal(data.rooms.find((r) => r.id === 'tube-music'), undefined, 'operations never mutate their input');
});

test('move and remove rooms', () => {
  let d = ops.moveRoom(data, { id: 'algo-brainrot-italian', parent: 'algo' });
  assert.deepEqual(valid(d), []);
  assert.throws(() => ops.moveRoom(data, { id: 'algo-brainrot', parent: 'algo-brainrot-italian' }), /inside/);
  d = ops.removeRoom(data, { id: 'algo-brainrot' });
  assert.deepEqual(valid(d), []);
  assert.equal(d.rooms.find((r) => r.id === 'algo-brainrot-italian').parent, 'algo', 'children move up');
  assert.ok(d.rooms.find((r) => r.id === 'algo').memes.includes('skibidi-toilet'), 'memes move up');
  assert.throws(() => ops.removeRoom(data, { id: 'dawn' }), /only kind "room"/);
});

test('link and unlink memes', () => {
  let d = ops.link(data, { from: 'emoticon', to: 'six-seven', why: 'Symbols carrying more meaning than they should.' });
  assert.deepEqual(valid(d), []);
  assert.throws(() => ops.link(d, { from: 'six-seven', to: 'emoticon', why: 'again' }), /already linked/);
  assert.throws(() => ops.link(data, { from: 'emoticon', to: 'emoticon', why: 'x' }), /itself/);
  assert.throws(() => ops.link(data, { from: 'emoticon', to: 'doge' }), /why/);
  d = ops.unlink(d, { from: 'six-seven', to: 'emoticon' });
  assert.equal(d.memes.find((m) => m.id === 'emoticon').links, undefined);
});

test('bad edits are refused with readable errors', () => {
  assert.throws(() => ops.addRoom(data, { id: 'Bad Id', parent: 'tube', title: 'x' }), /kebab-case/);
  assert.throws(() => ops.addRoom(data, { id: 'tube-bait', parent: 'tube', title: 'x' }), /already exists/);
  assert.throws(() => ops.placeMeme(data, { meme: 'doge', room: 'end' }), /cannot hold memes/);
  // Ops allow it, validation refuses it: a meme in a room of another era.
  assert.ok(valid(ops.placeMeme(data, { meme: 'doge', room: 'dawn-symbols' })).some((e) => e.includes('era')));
});

test('CLI argument parsing maps to operations', () => {
  const parsed = parseArgs(['link', 'doge', 'six-seven', '--why', 'numbers and dogs', '--json']);
  assert.deepEqual(parsed, { command: 'link', args: ['doge', 'six-seven'], flags: { why: 'numbers and dogs', json: true } });
  assert.ok(apply(data, parsed).memes.find((m) => m.id === 'doge').links.some((l) => l.to === 'six-seven'));
  assert.throws(() => apply(data, parseArgs(['explode'])), /unknown command/);
});

test('CLI tree and check run against the real files', async () => {
  const cli = fileURLToPath(new URL('../tools/archive.mjs', import.meta.url));
  const run = promisify(execFile);
  const { stdout } = await run(process.execPath, [cli, 'check', '--json']);
  assert.deepEqual(JSON.parse(stdout), { ok: true, command: 'check' });
  const tree = await run(process.execPath, [cli, 'tree']);
  assert.match(tree.stdout, /└─ The End of the Internet \[end\] \(end\)/);
});
