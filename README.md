# yasmeenroumie.com

My personal site, served by GitHub Pages from this repo.

## Editing

All the words (jobs, projects, bio) live in `src/site/content.mjs`. Page layouts are in `src/site/pages.mjs`
(and `making.mjs` for the Mini Yaz write-up); the shared frame (head, tabs, Dock, footer) is in `src/site/templates.mjs`.
After editing, regenerate the pages:

```sh
npm install
npm run build        # writes index.html, work.html, projects.html, lab.html, about.html, making-mini-yaz.html, 404.html
npm run serve        # http://localhost:8130
```

The generated `.html` files are committed, since GitHub Pages serves them as-is.

## Layout

- `assets/css/site.css`: the Aqua styles, with the Blue and Graphite appearances
- `assets/js/site.js`: Appearance and Pause motion switches, the Dock bounce, page reactions for Mini Yaz
- `assets/js/lab.js`: the Lab experiments
- `assets/mini-yaz/`: the 3D character (see `mini-yaz/README.md`)
- `mini-yaz/`: how the character is built: Blender scripts, the reference, and render tools
- `blog/`, `tinyfoodie/`, `hidden_pages/`, `resume.pdf`: kept at their existing links
