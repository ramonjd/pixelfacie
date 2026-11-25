# Pixel Facie

Pixel Facie: Ramon's learning notes on AI law, AI policy and whatever else comes up. Not legal advice.

Plain HTML, CSS and JavaScript, with a small Node script that turns Markdown notes into pages. The only dependency is [marked](https://marked.js.org/), for the Markdown.

## Getting started

Needs Node 20.11 or later.

```sh
npm install
npm run build     # writes the site to dist/
npm run preview   # builds, then serves dist/ locally
```

## Where things live

```
content/posts/     Notes, one Markdown file each
content/posts/images/  Featured images for notes
src/templates/     HTML templates: layout, home page, about page, notes list, topics, note
src/assets/        styles.css, main.js (the theme toggle), robot.js (the reading robot), sprites.js (Ramon's avatar on the About page) and footer-scene.js (the footer's scenery), copied as they are
scripts/build.js   The build
```

Templates use `{{name}}` placeholders, filled in by `scripts/build.js`. `layout.html` wraps every page.

## Writing a note

Add a Markdown file to `content/posts/`. The file name becomes the URL, so `hello-world.md` is published at `/notes/hello-world/`.

```md
---
title: Hello, world
date: 2026-11-06
---

The note, in Markdown.
```

Add `draft: true` to the front matter to leave a note out of the build.

The home page shows the newest note on its "Exhibit A" card, with the next three under it. To give the card a one-line summary, add it to the front matter:

```md
summary: A first pass at the risk tiers, in plain words.
```

Every note needs a featured image. Put the file in `content/posts/images/` and name it in the front matter, with a short description for people who can't see it. The build stops with an error if a note that isn't a draft is missing either line:

```md
image: state-of-mind.jpg
imageAlt: What the image shows
```

The image appears at the top of the note and as a small square thumbnail in the note lists. The thumbnail is the same file shrunk by the browser, so keep image files small.

To tag a note, list its tags in the front matter, separated by commas:

```md
tags: EU AI Act, Policy
```

Each tag gets a page listing its notes, such as `/topics/eu-ai-act/`, and `/topics/` lists every tag. The note links to its tags under the date. Tags that differ only in capitals, such as `WordPress` and `wordpress`, share one page.

## Deploying

The site is hosted on [Spacefast](https://www.npmjs.com/package/spacefast). Build, then publish `dist/` with the Spacefast CLI:

```sh
npm run build
sf publish ./dist
```
