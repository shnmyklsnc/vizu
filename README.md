# My Sketchbook

A Jekyll-powered gallery site for p5.js animations and visualizations, ready
to host on GitHub Pages.

## Structure

```
_config.yml              site title, description, the "sketches" collection
_layouts/
  default.html            shared page shell (head, header, footer)
  sketch.html             wraps a sketch's canvas + writeup, loads p5.js
_includes/
  header.html, footer.html
_sketches/                one .md file per sketch (metadata + writeup)
assets/
  css/style.css
  sketches/<slug>/
    sketch.js              the actual p5.js code
    thumb.svg               gallery thumbnail (swap for a real screenshot)
index.html                 gallery homepage, loops over site.sketches
```

## Running locally

```
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

You don't strictly need to run it locally, though — GitHub Pages builds
Jekyll sites automatically on every push, so `git push` alone is enough.

## Adding a new sketch

1. Create `assets/sketches/<your-slug>/sketch.js` with your p5.js code.
   Inside `setup()`, parent the canvas to the holder div so it lands in the
   right place on the page:

   ```js
   function setup() {
     const canvas = createCanvas(600, 400);
     canvas.parent('sketch-holder');
   }
   ```

2. Add a thumbnail image at `assets/sketches/<your-slug>/thumb.svg` (or
   `.png`/`.jpg` — just update the `thumbnail:` path below to match). An
   easy way to get a real thumbnail: call `saveCanvas('thumb', 'png')` once
   from your sketch, drop the exported file in, then remove that line.

3. Create `_sketches/<your-slug>.md`:

   ```markdown
   ---
   title: "Your Sketch Title"
   date: 2024-06-01
   description: "One sentence for the gallery card."
   thumbnail: /assets/sketches/<your-slug>/thumb.svg
   script: /assets/sketches/<your-slug>/sketch.js
   tags: [generative]
   ---
   Any longer write-up goes here as normal Markdown — it renders below
   the canvas on the sketch's own page.
   ```

4. `git add -A && git commit -m "Add <your-slug> sketch" && git push`

That's it — it'll appear on the homepage automatically, sorted by date.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set Source to **Deploy from a branch**,
   branch **main**, folder **/ (root)**.
4. If this repo is *not* named `<your-username>.github.io`, set `baseurl`
   in `_config.yml` to `/<repo-name>` so internal links resolve correctly.
5. Wait a minute or two, then visit the URL GitHub shows you.
