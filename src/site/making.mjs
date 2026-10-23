// "Making Mini Yaz": how the character on this site was built.
import { site } from './content.mjs';
import { page, mascot, hint } from './templates.mjs';

const fig = (src, w, h, alt, caption) => `<figure>
  <img src="/assets/img/making/${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy">
  <figcaption>${caption}</figcaption>
</figure>`;

export function making() {
  const main = `
<article class="article" aria-labelledby="making-h">
  <h1 id="making-h">Making Mini Yaz.</h1>
  <p class="dek">Mini Yaz is the little blue clay version of me that lives on every page of this site. It started as a few reference images and ended up as a 3D character, modeled in Blender and animated live in your browser.</p>
  <p class="byline">Built with Claude as my pair: I directed and reviewed every round, and Claude wrote the Blender scripts, the rig, the animation code and the tests.</p>

  <div class="mascot-slot">${mascot({ pose: 'wave', label: 'Mini Yaz, waving', main: true })}</div>
  ${hint('Tap it, drag it, or tap five times fast')}

  <h2 id="drawing">It started as a turnaround</h2>
  <p>The character began as a turnaround sheet (front, three-quarter, side and back views of the same pose) plus a sheet of little poses with props. Those images became the spec for everything after.</p>
  ${fig('turnaround.webp', 1400, 586, 'Four reference images of Mini Yaz from the front, three-quarter, side and back', 'The turnaround every later version was measured against.')}

  <h2 id="flat">Two versions that didn't make it</h2>
  <p>The first try cut one of the pose images into parts (body, head, arms) and rotated them at the joints, with the eyes drawn live so it could blink and look around. It moved, but it looked like a paper puppet: you could see the seams, and the arms could only swing flat against the body.</p>
  <p>The second try built a 3D character in the browser out of spheres and capsules. It could turn and wave, but it wasn't cute. The proportions drifted from the reference, and the waving hand kept disappearing behind the head.</p>

  <h2 id="blender">Measuring the reference in Blender</h2>
  <p>The version you see now is built in Blender from the reference itself. A script reads the front and side views row by row and records how wide and how deep the character is at every height. A second script, run inside Blender, builds each part from those measurements: the head is lofted ring by ring, the hair is made of strands that run from the crown down to a rolled edge, and the body is fused into one smooth piece and then simplified for the web.</p>
  <p>Blender also bakes the soft shadows where parts meet (under the hair, between the arms and the body) into the model, so the browser doesn't have to compute them.</p>
  ${fig('fit.webp', 1400, 405, 'The reference image and the Blender model side by side, from the front and the side, with the reference’s outline traced over the model', 'Reference, model, and the model with the reference’s outline traced over it, from the front and the side.')}

  <h2 id="felt">Felt, not plastic</h2>
  <p>In the browser, three.js draws the model with a custom clay material: matte, with a soft bright edge like felt, a little fiber-to-fiber variation in color, and a fine bumpy texture computed on the fly. The lighting is a small virtual photo studio with a big soft key light, a fill, and a rim from behind.</p>

  <h2 id="motion">One clock, and springs everywhere</h2>
  <p>Everything Mini Yaz does comes from one clock, layered:</p>
  <ul>
    <li><strong>Breathing and idle sway</strong> come from slow sine waves with unrelated periods, so the loop never visibly repeats.</li>
    <li><strong>Actions</strong> (the wave, the hop, the spin) are keyframes joined by curves that never overshoot, so nothing wobbles past where it was meant to stop.</li>
    <li><strong>Attention</strong> runs on critically damped springs, the fastest kind that never bounces. The eyes react first, the head follows, and the body turns last. A spring can be redirected mid-move without a jump, which is why it can follow your cursor smoothly.</li>
    <li><strong>Follow-through</strong>: the bun reads where the head was about a tenth of a second ago, so it lags and settles after every move.</li>
    <li><strong>Squash and stretch</strong> keep the volume the same: when Mini Yaz squashes down, it gets wider.</li>
  </ul>
  <p>You can feel the spring part in the <a href="/lab#springs">Lab</a>.</p>

  <h2 id="tests">Testing animation like code</h2>
  <p>Looking at an animation and saying "that looks off" doesn't scale, so the animations have tests. A headless browser plays each action on a fake clock and records every joint on every frame. Then it looks for:</p>
  <ul>
    <li><strong>Pops</strong>, frames where a joint's speed jumps instead of changing smoothly.</li>
    <li><strong>Clipping</strong>, frames where the hand goes inside the head.</li>
    <li><strong>Snaps</strong>, values that jump when one action ends or another interrupts it.</li>
  </ul>
  <p>The first run found the waving hand inside the cheek for 51 of 180 frames, a pop in the elbow at 0.43 seconds, and the spin snapping back a full turn when it ended. Close-up renders caught the model problems: a puckered crown under the bun, ridges across the belly, and a slightly jagged fringe.</p>
  ${fig('graphs.webp', 1400, 252, 'Three charts from the first animation audit: the elbow angle with a pop, the spin snapping back at the end, and the hand going below the head’s surface', 'From the first audit: the elbow pop, the spin snapping back, and the hand dipping inside the head.')}
  <p>The fixes: the wave now reaches forward before it rises, and a soft guard nudges the arm away from the head if the hand gets close, easing in so it never jerks. The spin keeps its turn instead of snapping back. The crown, belly and fringe were fixed in the Blender build. The re-run found zero clipped frames.</p>
  ${fig('fixes.webp', 1400, 741, 'Close-ups before and after the fixes: the hand and cheek, the crown under the bun, the belly, and the fringe edge', 'Before (top) and after (bottom).')}

  <h2 id="details">Small things it does</h2>
  <ul>
    <li>It follows your cursor, and leans in a little when you get close.</li>
    <li>It reacts to the page: a cheer for live projects, eyes lighting up for papers and talks.</li>
    <li>If you use the keyboard, it looks at whatever has focus.</li>
    <li>After a quiet minute it dozes off, and it startles awake when you come back.</li>
    <li>Tap it five times quickly and it gets dizzy.</li>
    <li>It wears something different on some pages: running shoes on Projects, a laptop on Work, and a map on the page that doesn't exist.</li>
  </ul>
  ${fig('moods.webp', 1400, 322, 'Five renders of Mini Yaz: resting, waving, cheering, asleep, and dizzy with spiral eyes', 'Resting, waving, cheering, asleep, dizzy.')}

  <h2 id="ship">Making it light</h2>
  <ul>
    <li>Every page first shows a still image of Mini Yaz, so nothing waits on the 3D. The live version loads once the page has settled, then fades in over it.</li>
    <li>The model is packed into a 129 KB binary file, down from 395 KB, with no detail lost, and three.js is trimmed to the parts it uses.</li>
    <li>It stops drawing when it's off screen or the tab is hidden, drops to 30 frames a second while asleep, and draws fewer pixels on phones or on any device that can't keep up.</li>
    <li>If your system asks for reduced motion, it holds still. The "Pause motion" button does the same for everyone else.</li>
  </ul>
  <p>The Blender scripts, the model and the code are all in <a href="${site.github}/yasmeen.github.io">this site's repository</a>.</p>
</article>`;
  return {
    file: 'making-mini-yaz.html',
    html: page({
      path: '/making-mini-yaz', active: '', pageName: 'Making Mini Yaz',
      title: `Making Mini Yaz · ${site.name}`,
      description: 'How Mini Yaz, the little clay character on this site, went from a few reference images to a 3D model built in Blender and animated live in the browser.',
      subnav: [['#drawing', 'The turnaround'], ['#blender', 'Blender'], ['#motion', 'Motion'], ['#tests', 'Tests'], ['#details', 'Details'], ['#ship', 'Making it light']],
      main
    })
  };
}
