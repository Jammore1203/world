import buildVoid from './void.js';
import buildEnd from './end.js';
import { buildRoom } from './room.js';
import { styles } from '../styles/index.js';

// Picks the builder for a room: the threshold, the end, or an era-styled room.
export function buildZone(kit) {
  if (kit.room.kind === 'void') return buildVoid(kit);
  if (kit.room.kind === 'end') return buildEnd(kit);
  return buildRoom(kit, styles[kit.room.era]);
}
