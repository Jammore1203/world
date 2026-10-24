// Checks game/data against schema/meme.schema.json plus the cross-file rules
// (era references, era year ranges, unique ids). The bot must pass this before
// publishing anything. Zero dependencies: implements just the schema subset we use.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkTree } from '../game/src/tree.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));

export function checkAgainstSchema(value, schema, path = '$') {
  const errors = [];
  const err = (msg) => errors.push(`${path}: ${msg}`);
  if (schema.enum && !schema.enum.includes(value)) err(`must be one of ${schema.enum.join(', ')}`);
  if (Array.isArray(schema.type)) {
    const ok = schema.type.some((t) => checkAgainstSchema(value, { ...schema, type: t }).length === 0);
    if (!ok) err(`must be one of: ${schema.type.join(', ')}`);
    return errors;
  }
  if (schema.type === 'null' && value !== null) err('must be null');
  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) { err('must be an object'); break; }
      for (const key of schema.required ?? []) if (!(key in value)) err(`missing "${key}"`);
      for (const [key, v] of Object.entries(value)) {
        const sub = schema.properties?.[key];
        if (!sub) { if (schema.additionalProperties === false) err(`unknown property "${key}"`); continue; }
        errors.push(...checkAgainstSchema(v, sub, `${path}.${key}`));
      }
      break;
    }
    case 'array':
      if (!Array.isArray(value)) { err('must be an array'); break; }
      value.forEach((v, i) => errors.push(...checkAgainstSchema(v, schema.items ?? {}, `${path}[${i}]`)));
      break;
    case 'string':
      if (typeof value !== 'string') { err('must be a string'); break; }
      if (schema.minLength && [...value].length < schema.minLength) err(`must be at least ${schema.minLength} chars`);
      if (schema.maxLength && [...value].length > schema.maxLength) err(`must be at most ${schema.maxLength} chars`);
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) err(`must match ${schema.pattern}`);
      if (schema.format === 'uri') { try { new URL(value); } catch { err('must be a URL'); } }
      break;
    case 'integer':
      if (!Number.isInteger(value)) { err('must be an integer'); break; }
      if (schema.minimum !== undefined && value < schema.minimum) err(`must be >= ${schema.minimum}`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') err('must be a boolean');
      break;
  }
  return errors;
}

export function validateArchive(eras, memes, schema, rooms = null, roomSchema = null) {
  const errors = [];
  const eraById = new Map(eras.map((e) => [e.id, e]));
  const seen = new Set();
  memes.forEach((m, i) => {
    const where = `memes[${i}]${m?.id ? ` (${m.id})` : ''}`;
    errors.push(...checkAgainstSchema(m, schema, where));
    if (seen.has(m.id)) errors.push(`${where}: duplicate id`);
    seen.add(m.id);
    const era = eraById.get(m.era);
    if (!era) errors.push(`${where}: unknown era "${m.era}"`);
    else if (m.year < era.start || (era.end !== null && m.year > era.end)) {
      errors.push(`${where}: year ${m.year} is outside era ${era.id} (${era.start}-${era.end ?? 'now'})`);
    }
  });
  if (rooms) {
    if (roomSchema) rooms.forEach((r, i) => errors.push(...checkAgainstSchema(r, roomSchema, `rooms[${i}]${r?.id ? ` (${r.id})` : ''}`)));
    errors.push(...checkTree(rooms, memes, eras));
  }
  return errors;
}

export async function loadArchive() {
  const [eras, memes, rooms, schema, roomSchema] = await Promise.all([
    readJson('game/data/eras.json'), readJson('game/data/memes.json'), readJson('game/data/rooms.json'),
    readJson('schema/meme.schema.json'), readJson('schema/room.schema.json'),
  ]);
  return { eras, memes, rooms: rooms.rooms, schema, roomSchema };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { eras, memes, rooms, schema, roomSchema } = await loadArchive();
  const errors = validateArchive(eras, memes, schema, rooms, roomSchema);
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} problem(s).`);
    process.exit(1);
  }
  const unverified = memes.filter((m) => !m.provenance.verified).length;
  console.log(`ok: ${memes.length} memes in ${rooms.length} rooms across ${eras.length} eras (${unverified} awaiting verification)`);
}
