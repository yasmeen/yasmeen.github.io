# Mini Yaz

The little clay character on yasmeenroumie.com. The write-up is at [/making-mini-yaz](https://yasmeenroumie.com/making-mini-yaz).

## How it fits together

```
reference/turn-*.png                    the turnaround the model is measured from
  └─ blender/profiles.py                measures the front and side outlines  ->  blender/profiles.json
       └─ blender/build_miniyaz.py      builds the model in Blender            ->  blender/miniyaz.blend
            └─ blender/export_web.py    bakes shading, writes the web export   ->  miniyaz.json
                 └─ tools/pack-model.mjs   packs it for the site               ->  ../assets/mini-yaz/model.bin
```

In the browser, `assets/mini-yaz/mascot.js` mounts every `.mini-yaz` on a page and `assets/mini-yaz/engine.js` draws and
animates it with three.js (r169, trimmed to what's used in `assets/mini-yaz/three.min.js`). `miniyaz.json` is also the
fallback for browsers that can't unpack `model.bin`.

## Rebuilding the model

Blender runs headless from Python (`pip install bpy==5.2.3 numpy pillow` in a virtualenv; Blender 5.2 LTS).

```sh
cd mini-yaz/blender
python profiles.py ../reference/                          # measures the reference -> profiles.json
WEB=1 SAMPLES=16 python build_miniyaz.py -- . norender    # builds and bakes -> miniyaz.json
mv miniyaz.json ../ && cd ../..
npm run build:model                                       # packs it -> assets/mini-yaz/model.bin
```

Leave out `WEB=1` to build the full-resolution model and render front, side and hero views (`r_*.png`);
`compare.py` puts those next to the reference with its outline traced over them.

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
  overshoot, and attention (eyes, then head, then body) on critically damped springs.
- Actions: `wave`, `hop`, `spin`, `cheer`, `dizzy` (five quick taps), `startle` (waking from a nap). It dozes off after
  a quiet minute.
- Props: `laptop`, `shoes`, `map`, `bib`, `trophy`, `visor`, `phone`, `coin`. Held props ride on the body and are moved to
  the hand every frame, so they stay upright.
- It pauses off screen and in hidden tabs, holds still for reduced motion or when motion is paused, caps the resolution
  on phones, and steps the resolution down further if frames run slow.
