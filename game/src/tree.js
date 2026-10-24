// The archive as a tree of rooms. Pure functions, shared by the game, the validator
// and the bot's CLI (tools/archive.mjs).

export function buildTree(rooms, memes) {
  const memeById = new Map(memes.map((m) => [m.id, m]));
  const byId = new Map(rooms.map((r) => [r.id, { ...r, memeIds: r.memes ?? [], children: [], memes: [] }]));
  let root = null;
  for (const r of rooms) {
    const node = byId.get(r.id);
    if (r.parent === null) root = node;
    else byId.get(r.parent)?.children.push(node);
    node.parentNode = r.parent === null ? null : byId.get(r.parent) ?? null;
  }
  const roomOfMeme = new Map();
  for (const node of byId.values()) {
    node.memes = node.memeIds.map((id) => memeById.get(id)).filter(Boolean);
    for (const m of node.memes) roomOfMeme.set(m.id, node.id);
  }
  // Era is inherited from the nearest ancestor that sets one; path is the breadcrumb from the root.
  const visit = (node, era, path) => {
    node.era = node.era ?? era ?? null;
    node.path = [...path, node.id];
    node.depth = path.length;
    for (const c of node.children) visit(c, node.era, node.path);
  };
  if (root) visit(root, null, []);

  // Threads are links between memes, followed in both directions.
  const threads = new Map();
  const addThread = (from, to, why) => {
    if (!roomOfMeme.has(from) || !roomOfMeme.has(to)) return;
    const list = threads.get(from) ?? [];
    if (!list.some((t) => t.to === to)) list.push({ to, why, room: roomOfMeme.get(to) });
    threads.set(from, list);
  };
  for (const m of memes) for (const l of m.links ?? []) { addThread(m.id, l.to, l.why); addThread(l.to, m.id, l.why); }

  const trunk = root ? root.children.filter((c) => c.kind === 'hub') : [];
  const end = root?.children.find((c) => c.kind === 'end') ?? null;
  return { root, byId, roomOfMeme, threads, trunk, end };
}

// Where the "deeper" door of a hub leads: the next era, or the end of the internet.
export function deeper(tree, roomId) {
  const i = tree.trunk.findIndex((h) => h.id === roomId);
  if (i === -1) return null;
  return tree.trunk[i + 1] ?? tree.end;
}

export function checkTree(rooms, memes, eras) {
  const errors = [];
  const ids = new Set();
  const eraIds = new Set(eras.map((e) => e.id));
  const memeIds = new Set(memes.map((m) => m.id));
  const roots = rooms.filter((r) => r.parent === null);
  if (roots.length !== 1) errors.push(`rooms: need exactly one root (parent: null), found ${roots.length}`);
  if (roots[0] && roots[0].kind !== 'void') errors.push(`rooms: root "${roots[0].id}" must be kind "void"`);
  for (const r of rooms) {
    if (ids.has(r.id)) errors.push(`room ${r.id}: duplicate id`);
    ids.add(r.id);
  }
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const placed = new Map();
  for (const r of rooms) {
    const where = `room ${r.id}`;
    if (r.parent !== null && !byId.has(r.parent)) errors.push(`${where}: unknown parent "${r.parent}"`);
    if (r.kind === 'hub' || r.kind === 'end') {
      if (byId.get(r.parent)?.kind !== 'void') errors.push(`${where}: a ${r.kind} must be a child of the root`);
    }
    if (r.kind === 'void' && r.parent !== null) errors.push(`${where}: only the root can be kind "void"`);
    if (r.kind === 'hub' && !r.era) errors.push(`${where}: hubs must set an era`);
    if (r.era && !eraIds.has(r.era)) errors.push(`${where}: unknown era "${r.era}"`);
    if (r.kind === 'room') {
      let p = byId.get(r.parent), guard = 0;
      while (p && p.kind === 'room' && guard++ < rooms.length) p = byId.get(p.parent);
      if (!p || p.kind !== 'hub') errors.push(`${where}: rooms must sit somewhere under an era hub`);
    }
    // Cycle check: walking up must reach the root.
    let cur = r, steps = 0;
    while (cur && cur.parent !== null && steps++ <= rooms.length) cur = byId.get(cur.parent);
    if (steps > rooms.length) errors.push(`${where}: parent chain loops`);
    for (const m of r.memes ?? []) {
      if (!memeIds.has(m)) errors.push(`${where}: unknown meme "${m}"`);
      else if (placed.has(m)) errors.push(`meme ${m}: placed in both ${placed.get(m)} and ${r.id}`);
      else placed.set(m, r.id);
    }
    if ((r.kind === 'void' || r.kind === 'end') && r.memes?.length) errors.push(`${where}: ${r.kind} rooms cannot hold memes`);
  }
  const ends = rooms.filter((r) => r.kind === 'end');
  if (ends.length > 1) errors.push('rooms: at most one end room');
  if (ends.length === 0) errors.push('rooms: missing the end room (kind "end")');
  for (const m of memes) if (!placed.has(m.id)) errors.push(`meme ${m.id}: not placed in any room`);

  if (!errors.length) {
    const tree = buildTree(rooms, memes);
    for (const [memeId, roomId] of tree.roomOfMeme) {
      const meme = memes.find((m) => m.id === memeId);
      const room = tree.byId.get(roomId);
      if (room.era !== meme.era) errors.push(`meme ${memeId}: era "${meme.era}" but sits in room ${roomId} of era "${room.era}"`);
    }
  }
  for (const m of memes) for (const l of m.links ?? []) {
    if (!memeIds.has(l.to)) errors.push(`meme ${m.id}: links to unknown meme "${l.to}"`);
    if (l.to === m.id) errors.push(`meme ${m.id}: links to itself`);
  }
  return errors;
}

// Text outline of the tree, for the CLI and for humans.
export function renderTree(tree) {
  const lines = [];
  const walk = (node, prefix, last) => {
    const label = `${node.title} [${node.id}]${node.kind !== 'room' ? ` (${node.kind}${node.kind === 'hub' ? `: ${node.era}` : ''})` : ''}`;
    lines.push(node.depth === 0 ? label : `${prefix}${last ? '└─ ' : '├─ '}${label}`);
    const childPrefix = node.depth === 0 ? '' : prefix + (last ? '   ' : '│  ');
    const items = [...node.memes.map((m) => ({ meme: m })), ...node.children.map((c) => ({ node: c }))];
    items.forEach((it, i) => {
      const isLast = i === items.length - 1;
      if (it.meme) {
        const n = tree.threads.get(it.meme.id)?.length ?? 0;
        lines.push(`${childPrefix}${isLast ? '└─ ' : '├─ '}· ${it.meme.name} (${it.meme.year})${n ? `  ~${n} thread${n > 1 ? 's' : ''}` : ''}`);
      } else walk(it.node, childPrefix, isLast);
    });
  };
  if (tree.root) walk(tree.root, '', true);
  return lines.join('\n');
}
