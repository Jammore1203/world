#!/usr/bin/env node
// Manage the archive's room tree and meme links. Built for the gathering bot:
// every command validates the whole archive and only writes if it is still valid.
//
//   npm run archive -- tree
//   npm run archive -- check
//   npm run archive -- add-room <id> --parent <id> --title "Title" [--blurb "..."] [--after <sibling-id>]
//   npm run archive -- edit-room <id> [--title "..."] [--blurb "..."]
//   npm run archive -- move-room <id> --parent <id>
//   npm run archive -- remove-room <id> [--into <id>]       (memes and child rooms move up)
//   npm run archive -- place <meme-id> <room-id> [--index n]
//   npm run archive -- link <meme-id> <meme-id> --why "how they connect"
//   npm run archive -- unlink <meme-id> <meme-id>
//
// Add --json for machine-readable output: { ok, command, errors?, tree? }.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadArchive, validateArchive } from './validate-data.mjs';
import { buildTree, renderTree } from '../game/src/tree.js';
import * as ops from './lib/archive-ops.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      flags[key] = value;
    } else positional.push(a);
  }
  return { command: positional[0], args: positional.slice(1), flags };
}

export function apply(data, { command, args, flags }) {
  switch (command) {
    case 'add-room': return ops.addRoom(data, { id: args[0], parent: flags.parent, title: flags.title, blurb: flags.blurb, after: flags.after });
    case 'edit-room': return ops.editRoom(data, { id: args[0], title: flags.title, blurb: flags.blurb });
    case 'move-room': return ops.moveRoom(data, { id: args[0], parent: flags.parent });
    case 'remove-room': return ops.removeRoom(data, { id: args[0], into: flags.into });
    case 'place': return ops.placeMeme(data, { meme: args[0], room: args[1], index: flags.index === undefined ? undefined : Number(flags.index) });
    case 'link': return ops.link(data, { from: args[0], to: args[1], why: flags.why });
    case 'unlink': return ops.unlink(data, { from: args[0], to: args[1] });
    default: throw new Error(`unknown command "${command}". Try: tree, check, add-room, edit-room, move-room, remove-room, place, link, unlink`);
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const json = parsed.flags.json === true;
  const say = (result) => {
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(result.tree ?? `ok: ${result.command}`);
    else console.error(result.errors.join('\n'));
    process.exitCode = result.ok ? 0 : 1;
  };
  const { eras, memes, rooms, schema, roomSchema } = await loadArchive();
  const command = parsed.command ?? 'tree';

  if (command === 'tree' || command === 'check') {
    const errors = validateArchive(eras, memes, schema, rooms, roomSchema);
    if (errors.length) return say({ ok: false, command, errors });
    return say({ ok: true, command, tree: command === 'tree' ? renderTree(buildTree(rooms, memes)) : undefined });
  }

  let next;
  try { next = apply({ rooms, memes }, parsed); } catch (e) { return say({ ok: false, command, errors: [e.message] }); }
  const errors = validateArchive(eras, next.memes, schema, next.rooms, roomSchema);
  if (errors.length) return say({ ok: false, command, errors: ['refused: the archive would be invalid', ...errors] });
  await writeFile(join(root, 'game/data/rooms.json'), JSON.stringify({ rooms: next.rooms }, null, 2) + '\n');
  await writeFile(join(root, 'game/data/memes.json'), JSON.stringify(next.memes, null, 2) + '\n');
  say({ ok: true, command });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
