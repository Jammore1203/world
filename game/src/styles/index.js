import dawn from './dawn.js';
import flash from './flash.js';
import tube from './tube.js';
import social from './social.js';
import short from './short.js';
import algo from './algo.js';

// One style per era id in data/eras.json. A style supplies a room's materials and objects;
// the floor plan, doors and threads come from zones/room.js.
export const styles = { dawn, flash, tube, social, short, algo };
