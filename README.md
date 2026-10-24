# The Archive

A walkable 3D archive of internet culture. You start in a void and descend through six
strata of internet history. Each stratum is built from its own era's design language: the
gray Mosaic-era page, GeoCities tiles and Win98 bevels, Web 2.0 gloss and reflections,
Facebook-blue timelines, Material Design and vertical video, and dark-mode glass feeds.
Memes are things you walk into, not pages you read. The `:-)` turns into a face as you
approach, a raid group plans until Leeroy runs, The Dress changes color as you circle it,
and a crowd Naruto-runs past the Area 51 fence.

The project has two parts:

1. **The game** (`game/`): a static three.js site. It is built and lives in this repo.
2. **The gathering bot** (not built yet): collects and verifies memes and organizes them
   into the tree. It talks to the game only through the data files and the CLI below.

## Run it

```sh
npm install
npm start          # http://localhost:8080
npm test
```

`game/` is a plain static site with no build step, so any static host works (GitHub Pages
included). three.js is vendored into `game/vendor/` by `npm run vendor`.

Controls: **WASD / arrows** to walk, **mouse** to look, **shift** to run. On touch screens,
the **left thumb** walks and the **right thumb** looks. Add `#room-id` to the URL to start
in a specific room (for example `#tube-bait`).

## How the world is organized

```
The Archive (void)
├─ The Dawn (hub)                 ← each era has a hub hall
│  ├─ Punctuation & Laws          ← rooms are subsets of humour
│  └─ Forward This
├─ Flash & Forums (hub)
│  ├─ Loops That Never End
│  …
├─ The Algorithm Age (hub)
│  └─ Brainrot
│     └─ Italian Brainrot         ← rooms nest to any depth
└─ The End of the Internet (end)
```

- **Doors.** Each room has a door back to its parent behind you and doors to its children
  on the far wall. A hub also has a door "deeper" to the next era. Each door is drawn as
  that era's own navigation element: a hyperlink, a webring button, a glossy pill, a
  Material FAB.
- **Threads.** When two memes cross into each other, each one gets a column of light
  beside its exhibit. Step in and you're pulled to the other exhibit, wherever it is in
  the tree. Threads are labeled in period terms: "See also", "Link exchange", "Related
  videos", "Suggested post", "Revine", "Stitch with".
- A room's look comes from its era. Rooms inherit the era from their nearest hub.

Run `npm run archive -- tree` to print the whole tree.

## The bot contract

The bot writes three things, and all of them are validated (`npm run validate`):

| File | What | Schema |
| --- | --- | --- |
| `game/data/memes.json` | every meme, with sources, provenance and `links` (threads) | `schema/meme.schema.json` |
| `game/data/rooms.json` | the room tree: a flat list with `parent` pointers; array order is door order | `schema/room.schema.json` |
| `game/data/eras.json` | the six eras (rarely changes) | — |

Rules enforced beyond the JSON schemas: ids are unique kebab-case and never reused; every
meme sits in exactly one room; a meme's room must belong to the meme's era; a meme's year
must fall inside its era; hubs are children of the root, in era order; there is exactly one
end room; links must point to real memes. Seed entries are marked
`"provenance": { "by": "seed", "verified": false }` until the bot checks them.

The bot should edit the tree through the CLI, never by hand. Every command validates the
whole archive and writes nothing if the result would be invalid. Add `--json` for
machine-readable output (`{ ok, command, errors? }`).

```sh
npm run archive -- tree
npm run archive -- check
npm run archive -- add-room tube-music --parent tube --title "Music Videos" --blurb "Songs that escaped."
npm run archive -- edit-room tube-music --title "Music"
npm run archive -- move-room algo-brainrot-italian --parent algo
npm run archive -- remove-room tube-music            # its memes and children move up to the parent
npm run archive -- place rickroll tube-music [--index 0]
npm run archive -- link doge moo-deng --why "An animal the whole internet adopted."
npm run archive -- unlink doge moo-deng
```

The same operations are available as pure functions in `tools/lib/archive-ops.mjs` if the
bot would rather import them.

Adding a new meme: append it to `memes.json` (passing the schema), then `place` it in a room.
Any meme without a bespoke experience is shown as a generic exhibit in its era's style.

## Code map

```
game/
  index.html, style.css     the device layer: gate, captions, HUD (deliberately neutral)
  src/main.js               boot: load data, build the tree, start the engine
  src/tree.js               the room tree, threads, validation rules (shared with tools/)
  src/data.js               room floor plan and small deterministic helpers
  src/engine/               renderer and player, controls, synthesized audio, figures, canvas textures
  src/zones/room.js         builds any room: exhibits, doors, threads, from an era style
  src/zones/void.js, end.js the threshold and the end of the internet
  src/styles/<era>.js       each era's materials, generic exhibit, doors, signs, bespoke experiences
tools/
  archive.mjs               the bot's CLI
  lib/archive-ops.mjs       tree edits as pure functions
  validate-data.mjs         schema and tree validation
  serve.mjs, vendor.mjs
schema/                     JSON schemas for memes and rooms
```

To give a meme a bespoke experience, add a function to its era's style under `bespoke`,
keyed by meme id. It receives `(kit, meme, slot)`, returns a `THREE.Group`, and can set
`userData.update(t, dt, player)` and `userData.near(distance, dt)`.

All sound is synthesized in the browser (WebAudio and speech synthesis). No recordings or
meme images are hosted.
