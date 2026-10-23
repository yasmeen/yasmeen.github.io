# Mini Yaz

The little vinyl character on yasmeenroumie.com: a toy in the style of Apple's Little Finder Guy, with lashes and
pink headphones. The write-up is at [/making-mini-yaz](https://yasmeenroumie.com/making-mini-yaz).

## How it fits together

```
blender/build_miniyaz.py          builds the model in Blender             ->  blender/miniyaz.blend
  └─ blender/export_web.py        bakes shading, writes the web export    ->  miniyaz.json
       └─ tools/pack-model.mjs    packs it for the site                   ->  ../assets/mini-yaz/model.bin
```

The proportions in `build_miniyaz.py` (the head's width at every height, where the eyes and smile sit, where the
blue-and-white line steps over at the nose) were measured from a front view of the Finder figure, and the body was checked against a fan-made 3D model of it
(sliced at every height; used only for measuring, not shipped). The torso and
legs are one surface: distance fields (the legs are round cones, wide at the hip and smaller at the foot) blended with
a smooth union and meshed with marching cubes. Each shoulder is a ball in that surface; each arm is a separate round
cone grown out of its ball, turning about the ball's center, so the shoulder looks the same in every pose. The arms are
skinned to a shoulder, elbow and wrist bone.

In the browser, `assets/mini-yaz/mascot.js` mounts every `.mini-yaz` on a page and `assets/mini-yaz/engine.js` draws and
animates it with three.js (r169, trimmed to what's used in `assets/mini-yaz/three.min.js`). `miniyaz.json` is also the
fallback for browsers that can't unpack `model.bin`.

The earlier clay version, built from the turnaround in `reference/`, is in the git history.

## Rebuilding the model

Blender runs headless from Python (`pip install bpy==5.2.3 numpy scikit-image` in a virtualenv; Blender 5.2 LTS).

```sh
cd mini-yaz/blender
WEB=1 python build_miniyaz.py -- "$PWD" norender   # builds and bakes -> miniyaz.json
mv miniyaz.json ../ && cd ../..
npm run build:model                                 # packs it -> assets/mini-yaz/model.bin
```

Leave out `WEB=1` and `norender` to build the full-resolution model and render front, side and hero views (`r_*.png`;
the output folder must be an absolute path, as above).

## The look

Every lighting and material value lives in `LOOK` at the top of `assets/mini-yaz/engine.js`, and `setLook()` changes
them live. The material is satin, pearly vinyl (a light clear coat, a thin iridescent film and a cool sheen), with the shading
baked in Blender. The blue and white aren't painted on the
model: the shader splits each part at a line (on the head, the Finder profile, stepping over at the nose), so the edge
stays crisp at any size. Where the blue faces the big top-left light it lifts toward a light cyan, like the figure.
`LOOK.phones` and `LOOK.pads` set the headphones' colors.

The Lab's playground offers a few colors (`COLORS` in `assets/mini-yaz/mascot.js`: the colored half and the headphones).
The choice is kept in `localStorage` (`yaz-color`), so every Mini Yaz on the site wears it; the still posters are
tinted toward it with a CSS filter until the live one fades in.

## Rendering images of Mini Yaz

The posters, the project illustrations, the peek and the link preview are rendered from the live model in a headless
Chromium, so they always match it. Serve the repo, then render:

```sh
npm run serve            # in one terminal
npm run render:art       # mini-yaz/tools/art.json: project illustrations, 404 poster, peek, cheer
npm run render:og        # assets/img/og.png
```

`tools/stage.html` is the bare stage they use; each job in `art.json` sets the pose (`opts.stance`, `opts.posed`
channel offsets), props, and crop.

## Engine notes

- One clock drives everything: idle breathing from slow sine waves, actions as keyframes on curves that never
  overshoot, and attention (the head, then the body) on critically damped springs.
- Actions: `wave`, `hop`, `spin`, `cheer`, `dizzy` (five quick taps), `startle` (waking from a nap). It dozes off after
  a quiet minute.
- The arms are rigid: the actions' elbow and wrist bends are folded into the swing at the shoulder.
- Moving between pages, `assets/js/site.js` swaps the page in place and `mascot.js` carries the live Mini Yaz to the
  new page's spot (a glide, then a hop); `setStance()` and `setProps()` ease it into that page's pose and props.
- Props: `laptop`, `shoes`, `map`, `bib`, `trophy`, `visor`, `phone`, `coin`. Held props ride on the body and are moved to
  the hand every frame, so they stay upright.
- It pauses off screen and in hidden tabs, holds still for reduced motion or when motion is paused, caps the resolution
  on phones, and steps the resolution down further if frames run slow.
