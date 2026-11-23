// Builds the site into dist/.
//
// Pages are plain HTML templates in src/templates. Notes are Markdown files
// in content/posts, each starting with a short front matter block:
//
//   ---
//   title: Hello, world
//   date: 2026-11-06
//   ---
//
// Each note is published at /notes/<file-name>/. Add `draft: true` to keep a
// note out of the build, and `summary: one line` to show a summary on the
// home page card.
//
// To give a note a featured image, put the file in content/posts/images and
// add `image: file-name.jpg` and `imageAlt: what the image shows`.
//
// To tag a note, add `tags: EU AI Act, Policy`. Each tag gets a page at
// /topics/eu-ai-act/ listing its notes, and /topics/ lists every tag.
//
// Videos for notes go in content/posts/videos and are served from
// /notes/videos/, so a note can show one with
// <video src="/notes/videos/file-name.mp4" controls></video>.

import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { drawSprite, FRAMES } from '../src/assets/sprites.js';
import { ROBOT_COLOURS, ROBOT_FRAMES } from '../src/assets/robot.js';
import { BAT, BIRD, SCENE, SCENE_COLOURS } from '../src/assets/footer-scene.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'src', 'templates');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUTPUT_DIR = path.join(ROOT, 'dist');

const SITE_NAME = 'Pixel Facie';
const POSTS_ON_HOME_PAGE = 3;

// The robot next to the site name in the header, standing still on the first
// frame of its reading animation, 2px per art pixel.
const LOGO_ROBOT = `<svg class="logo-robot" width="36" height="46" viewBox="0 0 18 23" shape-rendering="crispEdges" aria-hidden="true">${drawSprite(ROBOT_FRAMES[0], ROBOT_COLOURS)}</svg>`;

await build();

async function build() {
	await rm(OUTPUT_DIR, { recursive: true, force: true });
	await cp(ASSETS_DIR, path.join(OUTPUT_DIR, 'assets'), { recursive: true });

	// The site icon: the robot's head, from its antenna down to its chin (the
	// first 9 rows), centred in a square.
	await writeFile(
		path.join(OUTPUT_DIR, 'favicon.svg'),
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4.5 18 18" shape-rendering="crispEdges">${drawSprite(ROBOT_FRAMES[0].slice(0, 9), ROBOT_COLOURS)}</svg>\n`
	);

	// The footer scenery: the same scene in day colours with the lorikeet for
	// the light theme, and in night colours with the bat for the dark theme.
	for (const [file, colours, critter] of [
		['footer-day.svg', SCENE_COLOURS.day, BIRD],
		['footer-night.svg', SCENE_COLOURS.night, BAT],
	]) {
		await writeFile(
			path.join(OUTPUT_DIR, 'assets', file),
			`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="18" viewBox="0 0 64 18" shape-rendering="crispEdges">${drawSprite(SCENE, colours)}<g transform="translate(${critter.x} ${critter.y})">${drawSprite(critter.rows, colours)}</g></svg>\n`
		);
	}

	// Featured images are served from /notes/images/, videos from /notes/videos/.
	for (const folder of ['images', 'videos']) {
		const source = path.join(POSTS_DIR, folder);
		if (existsSync(source)) {
			await cp(source, path.join(OUTPUT_DIR, 'notes', folder), {
				recursive: true,
			});
		}
	}

	const posts = await loadPosts();

	// Each tag's posts, newest first. Tags that differ only in capitals, such
	// as WordPress and wordpress, are one tag, named after the first spelling.
	const tags = new Map();
	for (const post of posts) {
		for (const tag of post.tags) {
			const slug = tagSlug(tag);
			if (!tags.has(slug)) {
				tags.set(slug, { name: tag, posts: [] });
			}
			tags.get(slug).posts.push(post);
		}
	}

	await writePage('index.html', {
		title: SITE_NAME,
		content: render(await loadTemplate('home'), {
			robotFrames: ROBOT_FRAMES.map(
				(rows, i) =>
					`<g class="robot-frame" style="--frame: ${i}">${drawSprite(rows, ROBOT_COLOURS)}</g>`
			).join(''),
			latestNote: renderLatestNote(posts[0]),
			moreNotes: renderMoreNotes(posts, tags),
		}),
	});

	await writePage('about/index.html', {
		title: `About · ${SITE_NAME}`,
		content: render(await loadTemplate('about'), {
			avatar: drawSprite(FRAMES.front),
		}),
	});

	const notesTemplate = await loadTemplate('notes');
	await writePage('notes/index.html', {
		title: `Notes · ${SITE_NAME}`,
		content: render(notesTemplate, {
			heading: 'Notes',
			posts: renderPostList(posts, { showTags: true }),
		}),
	});

	await writePage('topics/index.html', {
		title: `Topics · ${SITE_NAME}`,
		content: render(await loadTemplate('topics'), {
			topics: tags.size
				? renderTopics(tags)
				: '<p class="muted">No topics yet.</p>',
		}),
	});

	// One page per topic, listing its notes.
	for (const [slug, tag] of tags) {
		await writePage(`topics/${slug}/index.html`, {
			title: `${escapeHtml(tag.name)} · ${SITE_NAME}`,
			content: render(notesTemplate, {
				heading: escapeHtml(tag.name),
				posts: renderPostList(tag.posts, { showTags: true }),
			}),
		});
	}

	const postTemplate = await loadTemplate('post');
	for (const post of posts) {
		await writePage(`notes/${post.slug}/index.html`, {
			title: `${escapeHtml(post.title)} · ${SITE_NAME}`,
			content: render(postTemplate, {
				title: escapeHtml(post.title),
				date: post.date,
				displayDate: formatDate(post.date),
				tags: renderTags(post.tags),
				image: post.image
					? `<img class="post-image pixel-border" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}">`
					: '',
				body: post.html,
			}),
		});
	}

	console.log(`Built the site with ${posts.length} post(s) into dist/`);
}

// Posts

async function loadPosts() {
	const files = (await readdir(POSTS_DIR)).filter((file) =>
		file.endsWith('.md')
	);
	const posts = await Promise.all(files.map(loadPost));

	return posts
		.filter((post) => !post.draft)
		.sort((a, b) => b.date.localeCompare(a.date));
}

async function loadPost(file) {
	const source = await readFile(path.join(POSTS_DIR, file), 'utf8');
	const { meta, body } = parseFrontMatter(source);

	if (!meta.title || !meta.date) {
		throw new Error(`${file} needs a title and a date in its front matter.`);
	}

	return {
		slug: path.basename(file, '.md'),
		title: meta.title,
		date: meta.date,
		draft: meta.draft === 'true',
		summary: meta.summary ?? '',
		image: meta.image ? `/notes/images/${meta.image}` : '',
		imageAlt: meta.imageAlt ?? '',
		tags: (meta.tags ?? '')
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean),
		html: marked.parse(body),
	};
}

// Reads the `key: value` lines between the opening and closing `---`.
function parseFrontMatter(source) {
	const text = source.replace(/\r\n/g, '\n');
	const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

	if (!match) {
		return { meta: {}, body: text };
	}

	const [, frontMatter, body] = match;
	const meta = {};

	for (const line of frontMatter.split('\n')) {
		const separator = line.indexOf(':');
		if (separator === -1) {
			continue;
		}
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		meta[key] = value;
	}

	return { meta, body };
}

// A list of notes, newest first: title and date, plus tag pills when
// showTags is set.
function renderPostList(posts, { showTags = false } = {}) {
	if (posts.length === 0) {
		return '<p class="muted">First note coming soon.</p>';
	}

	const items = posts.map((post) => {
		// The thumbnail links to the post too, for mouse and touch. Keyboards
		// and screen readers skip it, since the title next to it is already a
		// link to the same post.
		const thumbnail = post.image
			? `<a class="post-thumb-link" href="/notes/${post.slug}/" tabindex="-1" aria-hidden="true"><img class="post-thumb pixel-border" src="${escapeHtml(post.image)}" alt="" width="80" height="80" loading="lazy"></a>`
			: '';

		return `
			<li>
				${thumbnail}
				<div class="post-list-text">
					<a class="post-list-title" href="/notes/${post.slug}/">${escapeHtml(post.title)}</a>
					<time datetime="${post.date}">${formatDate(post.date)}</time>
					${showTags ? renderTags(post.tags) : ''}
				</div>
			</li>`;
	});

	return `<ul class="post-list">${items.join('')}\n</ul>`;
}

// The home page's Exhibit A card: the newest note's title, linking to it,
// its summary and its tags. With no notes yet, it says the first one is
// coming.
function renderLatestNote(post) {
	if (!post) {
		return '<h2 id="exhibit-title">First note coming soon</h2>';
	}
	const summary = post.summary
		? `<p class="exhibit-summary">${escapeHtml(post.summary)}</p>`
		: '';
	return `<h2 id="exhibit-title"><a href="/notes/${post.slug}/">${escapeHtml(post.title)}</a></h2>${summary}${renderTags(post.tags)}`;
}

// The home page's Earlier notes and Topics, under the card. Earlier notes
// needs a second note, and Topics needs a tag.
function renderMoreNotes(posts, tags) {
	const earlier = posts.slice(1, 1 + POSTS_ON_HOME_PAGE);
	const columns = [];

	if (earlier.length) {
		columns.push(`
		<section aria-labelledby="earlier-title">
			<div class="section-heading">
				<h2 id="earlier-title">Earlier notes</h2>
				<a href="/notes/">All notes ▸</a>
			</div>
			${renderPostList(earlier)}
		</section>`);
	}

	if (tags.size) {
		columns.push(`
		<section aria-labelledby="topics-title">
			<h2 id="topics-title">Topics</h2>
			${renderTopics(tags)}
		</section>`);
	}

	return columns.length
		? `<div class="home-columns">${columns.join('')}\n</div>`
		: '';
}

// Every tag as a pill with its number of notes, sorted by name, each linking
// to its topic page.
function renderTopics(tags) {
	const items = [...tags]
		.sort(([, a], [, b]) => a.name.localeCompare(b.name))
		.map(
			([slug, tag]) =>
				`<li><a href="/topics/${slug}/">${escapeHtml(tag.name)} <span class="tag-count">${tag.posts.length}</span></a></li>`
		);
	return `<ul class="post-tags">${items.join('')}</ul>`;
}

// A post's tags as pills, each linking to its topic page.
function renderTags(tags) {
	if (!tags.length) {
		return '';
	}
	const items = tags.map(
		(tag) =>
			`<li><a href="/topics/${tagSlug(tag)}/">${escapeHtml(tag)}</a></li>`
	);
	// The list has no visible label, so screen readers get "Tags".
	return `<ul class="post-tags" aria-label="Tags">${items.join('')}</ul>`;
}

// Templates

async function loadTemplate(name) {
	return readFile(path.join(TEMPLATES_DIR, `${name}.html`), 'utf8');
}

// Fills each {{name}} in the template with values[name]. Values are inserted
// as they are, so escape anything that isn't meant to be HTML first.
function render(template, values) {
	return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name) => {
		if (!(name in values)) {
			throw new Error(`No value given for ${placeholder}.`);
		}
		return values[name];
	});
}

async function writePage(outputPath, { title, content }) {
	const layout = await loadTemplate('layout');
	const fullPath = path.join(OUTPUT_DIR, outputPath);

	await mkdir(path.dirname(fullPath), { recursive: true });
	await writeFile(
		fullPath,
		render(layout, { title, content, logoRobot: LOGO_ROBOT })
	);
}

// Helpers

function formatDate(isoDate) {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-AU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

// The tag's part of its page address: lower case, with each run of other
// characters turned into one hyphen, so "Image editing" is image-editing.
function tagSlug(tag) {
	return tag
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
