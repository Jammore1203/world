import * as THREE from 'three';
import { autoTexture, panel, F } from '../engine/textures.js';
import { floor } from './common.js';

// The End of the Internet: the white page everyone eventually found. Then back to the start.
export default function buildEnd(kit) {
  const group = new THREE.Group();
  group.add(floor(new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const tex = autoTexture(1200, 1000, (g, w) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, 1000);
    g.fillStyle = '#000'; g.textAlign = 'center';
    g.font = `bold 84px ${F.times}`; g.fillText('Congratulations!', w / 2, 110);
    g.font = `48px ${F.times}`;
    g.fillText('This is the last page.', w / 2, 210);
    g.fillText('You have reached the', w / 2, 290);
    g.font = `bold 64px ${F.times}`; g.fillText('END OF THE INTERNET.', w / 2, 370);
    g.font = `44px ${F.times}`;
    g.fillText('Thank you for visiting.', w / 2, 470);
    g.fillText('Please turn off your computer and go outside.', w / 2, 540);
    g.font = `italic 34px ${F.times}`; g.fillStyle = '#551a8b';
    g.fillText('(walk forward to begin again)', w / 2, 650);
    g.fillRect(w / 2 - 230, 658, 460, 3);
    return 690;
  });
  const page = panel(tex, 9);
  page.position.set(0, 3.2, -12);
  group.add(page);
  kit.trigger({ x: 0, z: -10.5, r: 2.5, enter: () => kit.go(kit.tree.root.id, { from: kit.room.id }) });
  return {
    group,
    sky: new THREE.Color(0xffffff),
    fog: new THREE.Fog(0xffffff, 10, 40),
    walk: [[-8, 8, -11.5, 4]],
    arrive: () => ({ x: 0, z: 2, yaw: 0 }),
    update() {},
  };
}
