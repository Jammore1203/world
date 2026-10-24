// Edits to the archive's tree, as pure functions over { rooms, memes }.
// Each returns new data or throws an Error with a message meant for the bot to read.

const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const clone = (data) => structuredClone(data);
const room = (data, id) => data.rooms.find((r) => r.id === id) ?? fail(`no room "${id}"`);
const meme = (data, id) => data.memes.find((m) => m.id === id) ?? fail(`no meme "${id}"`);
function fail(msg) { throw new Error(msg); }

export function addRoom(data, { id, parent, title, blurb, era, kind = 'room', after }) {
  if (!slug.test(id ?? '')) fail(`room id "${id}" must be kebab-case`);
  if (data.rooms.some((r) => r.id === id)) fail(`room "${id}" already exists`);
  if (!title) fail('a room needs a title');
  room(data, parent);
  const next = clone(data);
  const entry = Object.fromEntries(Object.entries({ id, parent, title, kind, era, blurb, memes: kind === 'room' || kind === 'hub' ? [] : undefined }).filter(([, v]) => v !== undefined));
  // Insert after the given sibling, or after the parent's last descendant, so array order stays door order.
  let at = after ? next.rooms.findIndex((r) => r.id === after) + 1 : -1;
  if (after && at === 0) fail(`no room "${after}" to insert after`);
  if (at === -1) {
    const descendants = new Set([parent]);
    next.rooms.forEach((r) => { if (descendants.has(r.parent)) descendants.add(r.id); });
    at = Math.max(...next.rooms.map((r, i) => (descendants.has(r.id) ? i : -1))) + 1;
  }
  next.rooms.splice(at, 0, entry);
  return next;
}

export function moveRoom(data, { id, parent }) {
  const r = room(data, id);
  if (r.parent === null) fail('cannot move the root');
  room(data, parent);
  // Refuse to move a room under its own descendant.
  for (let p = parent; p; p = data.rooms.find((x) => x.id === p)?.parent) if (p === id) fail(`"${parent}" is inside "${id}"`);
  const next = clone(data);
  next.rooms.find((x) => x.id === id).parent = parent;
  return next;
}

export function editRoom(data, { id, ...fields }) {
  room(data, id);
  const next = clone(data);
  const r = next.rooms.find((x) => x.id === id);
  for (const k of ['title', 'blurb', 'era']) if (fields[k] !== undefined) r[k] = fields[k];
  return next;
}

// Removing a room moves its memes and child rooms up to its parent (or into `into`).
export function removeRoom(data, { id, into }) {
  const r = room(data, id);
  if (r.kind !== 'room') fail(`only kind "room" can be removed; "${id}" is ${r.kind}`);
  const target = into ?? r.parent;
  room(data, target);
  if (target === id) fail('cannot merge a room into itself');
  const next = clone(data);
  const dest = next.rooms.find((x) => x.id === target);
  dest.memes = [...(dest.memes ?? []), ...(r.memes ?? [])];
  for (const c of next.rooms) if (c.parent === id) c.parent = target;
  next.rooms = next.rooms.filter((x) => x.id !== id);
  return next;
}

export function placeMeme(data, { meme: memeId, room: roomId, index }) {
  meme(data, memeId);
  const r = room(data, roomId);
  if (r.kind === 'void' || r.kind === 'end') fail(`"${roomId}" cannot hold memes`);
  const next = clone(data);
  for (const x of next.rooms) if (x.memes) x.memes = x.memes.filter((m) => m !== memeId);
  const dest = next.rooms.find((x) => x.id === roomId);
  dest.memes ??= [];
  dest.memes.splice(index ?? dest.memes.length, 0, memeId);
  return next;
}

export function link(data, { from, to, why }) {
  meme(data, from); meme(data, to);
  if (from === to) fail('a meme cannot link to itself');
  if (!why) fail('a link needs a "why": one line on how the memes connect');
  const already = (a, b) => (data.memes.find((m) => m.id === a).links ?? []).some((l) => l.to === b);
  if (already(from, to) || already(to, from)) fail(`"${from}" and "${to}" are already linked`);
  const next = clone(data);
  const m = next.memes.find((x) => x.id === from);
  m.links = [...(m.links ?? []), { to, why }];
  return next;
}

export function unlink(data, { from, to }) {
  const next = clone(data);
  let removed = false;
  for (const [a, b] of [[from, to], [to, from]]) {
    const m = next.memes.find((x) => x.id === a);
    if (!m?.links) continue;
    const before = m.links.length;
    m.links = m.links.filter((l) => l.to !== b);
    removed ||= m.links.length !== before;
    if (!m.links.length) delete m.links;
  }
  if (!removed) fail(`"${from}" and "${to}" are not linked`);
  return next;
}
