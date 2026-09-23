# My Sketchbook (Pelican)

A Pelican-powered gallery site for p5.js animations and visualizations,
deployed to GitHub Pages via GitHub Actions. This is the Pelican rebuild of
the original Jekyll `vizu` site; the sketches, styling, and layout are the
same, only the site generator changed.

## Structure

```
pelicanconf.py            dev settings (SITEURL = "", relative links)
publishconf.py            production settings used by the Actions build
content/
  flow-field.md            one file per sketch: metadata + write-up
  particle-orbit.md
  extra/
    css/style.css
    sketches/<slug>/
      sketch.js             the actual p5.js code
      thumb.svg              gallery thumbnail
theme/
  templates/
    base.html               shared page shell (head, header, footer)
    index.html               gallery homepage, loops over articles
    article.html              wraps a sketch's canvas + write-up, loads p5.js
.github/workflows/pages.yml   builds with Pelican and deploys to Pages on push
```

## Running locally

```
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pelican --listen --autoreload content
```

Then open http://localhost:8000. `--autoreload` rebuilds on save;
`--listen` serves the `output/` folder Pelican just built.

For a one-off build without the dev server: `pelican content -o output`.

## Adding a new sketch

1. Create `content/extra/sketches/<your-slug>/sketch.js` with your p5.js
   code. Inside `setup()`, parent the canvas to the holder div:

   ```js
   function setup() {
     const canvas = createCanvas(600, 400);
     canvas.parent('sketch-holder');
   }
   ```

2. Add a thumbnail at `content/extra/sketches/<your-slug>/thumb.svg` (or
   swap in a `.png`/`.jpg` and update the `Thumbnail:` line below to match).

3. Create `content/<your-slug>.md`:

   ```markdown
   Title: Your Sketch Title
   Date: 2024-06-01
   Summary: One sentence for the gallery card.
   Tags: generative
   Slug: your-slug
   Thumbnail: extra/sketches/your-slug/thumb.svg
   Script: extra/sketches/your-slug/sketch.js

   Any longer write-up goes here as normal Markdown; it renders below the
   canvas on the sketch's own page.
   ```

4. `git add -A && git commit -m "Add <your-slug> sketch" && git push`

GitHub Actions rebuilds and redeploys automatically. It shows up on the
homepage sorted by date, same as before.

## Deploying to GitHub Pages

Unlike Jekyll, GitHub Pages does not build Pelican sites natively, so this
repo ships its own build: `.github/workflows/pages.yml` builds with Pelican
on every push to `main` and deploys the result.

1. Push this repo to GitHub (as `vizu`, or update `SITEURL` in
   `publishconf.py` if you use a different name).
2. In the repo, go to **Settings -> Pages**.
3. Under "Build and deployment", set Source to **GitHub Actions** (not
   "Deploy from a branch" -- that's the Jekyll-only path).
4. Push to `main` (or run the workflow manually from the Actions tab).
5. Wait a minute or two, then visit the URL GitHub shows you --
   `https://shnmyklsnc.github.io/vizu/` if the repo is named `vizu`.
