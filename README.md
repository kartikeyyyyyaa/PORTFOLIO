# Kartikeya Shukla, portfolio

Hand-written HTML, CSS and JavaScript in `index.html`. No frameworks, no build step.

## What's where
- `img/me-hero.jpg`, `img/me-about.jpg`, `img/me-contact.jpg`: your graded portraits
- `img/photos/ph-*.jpg`: the 12 photographs in the Frames section
- Photo titles, quotes, experience, certifications and projects are plain data near the top of the
  `<script>` in `index.html` (`PHOTOS`, `EXPERIENCE`, `CERTS`, `ACHIEVEMENTS`, `PROJECTS`).

## Swap in sharper photos
The Frames photos came from Instagram story screenshots (720px wide). If you have the originals,
export them at ~1600px on the long side, keep the same file names in `img/photos/`, and update
`w` / `h` in `PHOTOS`.

## Résumé / walkv source
In `CONFIG`: set `resume: "resume.pdf"` (drop the PDF next to index.html) and `walkvRepo` once pushed.

## Run / deploy
`python3 -m http.server 8000` then open http://localhost:8000
Vercel: `npx vercel` in this folder. GitHub Pages: push to `kartikeyyyyyaa.github.io`.
