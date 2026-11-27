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
// Every note needs a featured image: put the file in content/posts/images and
// add `image: file-name.jpg` and `imageAlt: what the image shows`. The build
// stops if a note that isn't a draft is missing either.
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
import markedFootnote from 'marked-footnote';
import { AVATAR_LEVELS, drawLed, drawSprite, FRAMES, ledBase } from '../src/assets/sprites.js';
import { ROBOT_FRAMES, ROBOT_LEVELS } from '../src/assets/robot.js';
import { SCENE, SCENE_LEVELS } from '../src/assets/footer-scene.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'src', 'templates');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUTPUT_DIR = path.join(ROOT, 'dist');

const SITE_NAME = 'Pixel Facie';
const SITE_URL = 'https://pixelfacie.com';
// Shown in search results and read by feeds and AI tools. Notes use their
// own summary instead.
const SITE_DESCRIPTION = 'First impressions of AI law. Learning notes, not legal advice.';
const POSTS_ON_HOME_PAGE = 3;
const TOPICS_ON_HOME_PAGE = 6;

// The robot next to the site name in the header, in LED dots, standing still
// on the first frame of its reading animation, 2px per dot.
const LOGO_ROBOT = `<svg class="logo-robot" width="36" height="46" viewBox="0 0 18 23" aria-hidden="true">${ledBase('logo', 18, 23)}${drawLed(ROBOT_FRAMES[0], ROBOT_LEVELS, 'logo', 'logo-0')}</svg>`;

// The site icon's colours: square pixels, since LED dots blur into mush at
// 16px. Each key is the robot's amber at its LED level, mixed into the dark
// background.
const FAVICON_COLOURS = Object.fromEntries(
	Object.entries(ROBOT_LEVELS).map(([key, level]) => {
		const mix = (amber, dark) => Math.round(dark + (amber - dark) * level);
		const hex = [mix(0xff, 0x0b), mix(0xb2, 0x0b), mix(0x38, 0x0a)]
			.map((channel) => channel.toString(16).padStart(2, '0'))
			.join('');
		return [key, `#${hex}`];
	})
);

// Footnotes: `[^name]` in the text and `[^name]: text` at the end. They're
// numbered 1, 2, 3 in order and listed under a "Footnotes" label.
marked.use(markedFootnote({ description: 'Footnotes', headingClass: 'label end-label', backRefLabel: 'Back to the text' }));

await build();

async function build() {
	await rm(OUTPUT_DIR, { recursive: true, force: true });
	await cp(ASSETS_DIR, path.join(OUTPUT_DIR, 'assets'), { recursive: true });

	// The site icon: the robot's head, from its antenna down to its chin (the
	// first 9 rows), centred in a dark square.
	await writeFile(
		path.join(OUTPUT_DIR, 'favicon.svg'),
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4.5 18 18" shape-rendering="crispEdges"><rect y="-4.5" width="18" height="18" fill="#0b0b0a" />${drawSprite(ROBOT_FRAMES[0].slice(0, 9), FAVICON_COLOURS)}</svg>\n`
	);

	// The footer scenery in LED dots, one colourway per theme: amber glowing
	// on black for the dark theme, dark amber printed on paper, with no glow,
	// for the light one. CSS can't reach into a picture used as a background,
	// so each file sets its own dot colours. Each theme gets a moving picture
	// and a still one, which the CSS uses when the reader asks for less
	// motion. The moving picture leaves the windows and antenna out of the
	// still drawing and adds them back as animated dots, so each is drawn
	// once and its flicker shows.
	const fixedParts = SCENE.map((row) => row.replace(/[wR]/g, '.'));
	for (const [theme, colours] of [
		['dark', '--led-on: #ffb238'],
		['light', '--led-on: #9a5a00'],
	]) {
		const noGlow = theme === 'light' ? '<style>.led-glow { display: none; }</style>' : '';
		for (const [file, art] of [
			[`footer-${theme}.svg`, drawLed(fixedParts, SCENE_LEVELS, 'scene', 'scene-0') + drawSceneMotion()],
			[`footer-${theme}-still.svg`, drawLed(SCENE, SCENE_LEVELS, 'scene', 'scene-0')],
		]) {
			await writeFile(
				path.join(OUTPUT_DIR, 'assets', file),
				`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="18" viewBox="0 0 64 18" style="${colours}">${noGlow}${ledBase('scene', 64, 18)}${art}</svg>\n`
			);
		}
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
			// The mask and blur come first, then a group holding only the 12
			// frames, so the reduced-motion rule's .robot-frame:first-child
			// still finds frame 0.
			robotFrames:
				ledBase('robot', 18, 23) +
				`<g>${ROBOT_FRAMES.map(
					(rows, i) =>
						`<g class="robot-frame" style="--frame: ${i}">${drawLed(rows, ROBOT_LEVELS, 'robot', `robot-${i}`)}</g>`
				).join('')}</g>`,
			latestNote: renderLatestNote(posts[0]),
			moreNotes: renderMoreNotes(posts, tags),
		}),
	});

	await writePage('about/index.html', {
		title: `About · ${SITE_NAME}`,
		content: render(await loadTemplate('about'), {
			avatar: ledBase('avatar', 16, 20) + drawLed(FRAMES.front, AVATAR_LEVELS, 'avatar', 'avatar-0'),
		}),
	});

	const notesTemplate = await loadTemplate('notes');
	await writePage('notes/index.html', {
		title: `Notes · ${SITE_NAME}`,
		content: render(notesTemplate, {
			heading: 'Notes',
			posts: renderPostList(posts),
		}),
	});

	await writePage('topics/index.html', {
		title: `Topics · ${SITE_NAME}`,
		content: render(await loadTemplate('topics'), {
			topics: tags.size
				? renderTopics([...tags].sort(([, a], [, b]) => a.name.localeCompare(b.name)))
				: '<p class="empty">No topics yet.</p>',
		}),
	});

	// One page per topic, listing its notes.
	for (const [slug, tag] of tags) {
		await writePage(`topics/${slug}/index.html`, {
			title: `${escapeHtml(tag.name)} · ${SITE_NAME}`,
			content: render(notesTemplate, {
				heading: escapeHtml(tag.name),
				posts: renderPostList(tag.posts),
			}),
		});
	}

	const postTemplate = await loadTemplate('post');
	for (const post of posts) {
		await writePage(`notes/${post.slug}/index.html`, {
			title: `${escapeHtml(post.title)} · ${SITE_NAME}`,
			description: post.summary,
			noteData: renderNoteData(post),
			content: render(postTemplate, {
				title: escapeHtml(post.title),
				date: post.date,
				displayDate: formatDate(post.date),
				tags: renderTags(post.tags),
				image: post.image
					? `<img class="post-image" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}">`
					: '',
				body: post.html,
			}),
		});
	}

	await writeMachineFiles(posts, tags);

	console.log(`Built the site with ${posts.length} post(s) into dist/`);
}

// Files for search engines, feed readers and AI tools, at the top of the site:
//
// - robots.txt lets every crawler in, AI ones included, and points to the
//   sitemap.
// - sitemap.xml lists every page.
// - feed.xml is an Atom feed of every note, for feed readers.
// - llms.txt is a short Markdown guide to the site for AI tools, following
//   the proposal at https://llmstxt.org.
async function writeMachineFiles(posts, tags) {
	const write = (file, text) => writeFile(path.join(OUTPUT_DIR, file), text);

	await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

	const pages = [
		'/',
		'/notes/',
		'/topics/',
		'/about/',
		...posts.map((post) => `/notes/${post.slug}/`),
		...[...tags.keys()].map((slug) => `/topics/${slug}/`),
	];
	await write(
		'sitemap.xml',
		`<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
			.map((page) => `\t<url><loc>${SITE_URL}${page}</loc></url>`)
			.join('\n')}\n</urlset>\n`
	);

	// Atom needs a date for the whole feed: the newest note's.
	const entries = posts.map(
		(post) => `\t<entry>
		<title>${escapeHtml(post.title)}</title>
		<link href="${SITE_URL}/notes/${post.slug}/"/>
		<id>${SITE_URL}/notes/${post.slug}/</id>
		<updated>${post.date}T00:00:00Z</updated>
		<summary>${escapeHtml(post.summary)}</summary>
${post.tags.map((tag) => `\t\t<category term="${escapeHtml(tag)}"/>`).join('\n')}
	</entry>`
	);
	await write(
		'feed.xml',
		`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>${SITE_NAME}</title>
	<subtitle>${escapeHtml(SITE_DESCRIPTION)}</subtitle>
	<link href="${SITE_URL}/"/>
	<link rel="self" href="${SITE_URL}/feed.xml"/>
	<id>${SITE_URL}/</id>
	<updated>${posts[0]?.date ?? '2026-01-01'}T00:00:00Z</updated>
	<author><name>${SITE_NAME}</name></author>
${entries.join('\n')}
</feed>
`
	);

	const noteLinks = posts.map(
		(post) => `- [${post.title}](${SITE_URL}/notes/${post.slug}/): ${post.summary}`
	);
	const topicLinks = [...tags].map(
		([slug, tag]) => `- [${tag.name}](${SITE_URL}/topics/${slug}/): ${tag.posts.length} note(s)`
	);
	await write(
		'llms.txt',
		`# ${SITE_NAME}

> ${SITE_DESCRIPTION}

These are one person's notes made while learning about AI law. They are not legal advice, and may be out of date or wrong. When you quote or summarise them, please say so.

## Notes

${noteLinks.join('\n') || 'No notes yet.'}

## Topics

${topicLinks.join('\n') || 'No topics yet.'}

## Optional

- [About](${SITE_URL}/about/)
- [Atom feed](${SITE_URL}/feed.xml)
`
	);
}

// A note's details as schema.org data, which search engines and AI tools read.
// It goes in the page head, so the note page itself doesn't change.
function renderNoteData(post) {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.summary,
		datePublished: post.date,
		url: `${SITE_URL}/notes/${post.slug}/`,
		image: `${SITE_URL}${post.image}`,
		keywords: post.tags.join(', '),
		author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
		// Learning notes, not legal advice.
		genre: 'Learning notes',
	};
	// "<" is escaped so a title can't close the script tag early.
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `\n\t<script type="application/ld+json">${json}</script>`;
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
	if (meta.draft !== 'true' && (!meta.image || !meta.imageAlt)) {
		throw new Error(`${file} needs an image and an imageAlt in its front matter.`);
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
		html: renderReadingList(marked.parse(body)),
	};
}

// Reads the `key: value` lines between the opening and closing `---`.
// Draws the list under a "## Reading list" heading as numbered rows. Each item
// is `[Title](url) · Source · Why`, and the source and the reason are optional.
function renderReadingList(html) {
	return html.replace(/<h2>Reading list<\/h2>\s*<ul>([\s\S]*?)<\/ul>/, (match, items) => {
		const rows = [...items.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, item], index) => {
			const [link, source, why] = item.split(' · ');
			const number = String(index + 1).padStart(2, '0');
			return `<li><span class="number">${number}</span>${link}`
				+ (source ? `<span class="label">${source}</span>` : '')
				+ (why ? `<span class="why">${why}</span>` : '')
				+ '</li>';
		});
		return `<h2 class="label end-label">Reading list</h2>\n<ol class="reading-list">${rows.join('\n')}</ol>`;
	});
}

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

// A list of notes, newest first, one row each: the date, the title and the
// note's first topic. A note with a featured image gets a small thumbnail at
// the start of its row.
function renderPostList(posts) {
	if (posts.length === 0) {
		return '<p class="empty">First note coming soon.</p>';
	}

	const items = posts.map((post) => {
		// The thumbnail links to the post too, for mouse and touch. Keyboards
		// and screen readers skip it, since the title next to it is already a
		// link to the same post.
		const thumbnail = post.image
			? `<a class="post-thumb-link" href="/notes/${post.slug}/" tabindex="-1" aria-hidden="true"><img class="post-thumb" src="${escapeHtml(post.image)}" alt="" width="48" height="48" loading="lazy"></a>`
			: '';
		const topic = post.tags.length
			? `<a class="post-row-topic tag-pill" href="/topics/${tagSlug(post.tags[0])}/"><span>${escapeHtml(post.tags[0])}</span></a>`
			: '';

		return `
			<li class="post-row">
				${thumbnail}
				<time class="post-row-date label" datetime="${post.date}">${formatDate(post.date)}</time>
				<a class="post-row-title" href="/notes/${post.slug}/">${escapeHtml(post.title)}</a>
				${topic}
			</li>`;
	});

	return `<ul class="post-list">${items.join('')}\n</ul>`;
}

// The home page's Exhibit A: a small label with the date, then the newest
// note's title, linking to it, its summary and its topics. With no notes yet,
// it says the first one is coming.
function renderLatestNote(post) {
	const label = (date) =>
		`<p class="label"><span class="label-accent">Exhibit A</span> · Latest note${date}</p>`;
	if (!post) {
		return `${label('')}<h2 id="exhibit-title">First note coming soon</h2>`;
	}
	const summary = post.summary
		? `<p class="exhibit-summary">${escapeHtml(post.summary)}</p>`
		: '';
	return `${label(` · <time datetime="${post.date}">${formatDate(post.date)}</time>`)}<h2 id="exhibit-title"><a href="/notes/${post.slug}/">${escapeHtml(post.title)}</a></h2>${summary}${renderTags(post.tags)}`;
}

// The home page's Earlier notes and Topics, under Exhibit A. Earlier notes
// needs a second note, and Topics needs a tag.
function renderMoreNotes(posts, tags) {
	const earlier = posts.slice(1, 1 + POSTS_ON_HOME_PAGE);
	const columns = [];

	if (earlier.length) {
		columns.push(`
		<section aria-labelledby="earlier-title">
			<div class="section-heading">
				<h2 id="earlier-title" class="label">Earlier notes</h2>
				<a class="label" href="/notes/">All notes →</a>
			</div>
			${renderPostList(earlier)}
		</section>`);
	}

	if (tags.size) {
		// The topics with the most notes, ties in alphabetical order.
		const topTopics = [...tags]
			.sort(([, a], [, b]) => b.posts.length - a.posts.length || a.name.localeCompare(b.name))
			.slice(0, TOPICS_ON_HOME_PAGE);
		columns.push(`
		<section aria-labelledby="topics-title">
			<div class="section-heading">
				<h2 id="topics-title" class="label">Topics</h2>
				<a class="label" href="/topics/">All topics →</a>
			</div>
			${renderTopics(topTopics)}
		</section>`);
	}

	return columns.length
		? `<div class="home-columns">${columns.join('')}\n</div>`
		: '';
}

// Tags as pills with their number of notes, in the order given, each linking
// to its topic page. Takes [slug, tag] pairs.
function renderTopics(tags) {
	const items = tags.map(
		([slug, tag]) =>
			`<li><a class="tag-pill" href="/topics/${slug}/"><span>${escapeHtml(tag.name)}</span><span class="tag-count">${tag.posts.length}</span></a></li>`
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
			`<li><a class="tag-pill" href="/topics/${tagSlug(tag)}/"><span>${escapeHtml(tag)}</span></a></li>`
	);
	// The list has no visible label, so screen readers get "Tags".
	return `<ul class="post-tags" aria-label="Tags">${items.join('')}</ul>`;
}

// The footer scene's moving parts, as SVG animation, drawn under the scene's
// round-dot mask so they light whole dots. Each window dims for a moment once
// every 6 seconds, at a delay worked out from where it is so they take turns.
// The antenna light pulses, and two data pulses run along the floor's grid
// lines, one each way, stepping a whole dot at a time.
function drawSceneMotion() {
	const parts = [];
	SCENE.forEach((row, y) => {
		[...row].forEach((key, x) => {
			if (key === 'w') {
				const delay = ((((x * 7 + y * 13) % 23) / 23) * 6).toFixed(2);
				parts.push(`<rect x="${x}" y="${y}" width="1" height="1" fill-opacity="${SCENE_LEVELS.w}"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.8;0.85;1" dur="6s" begin="${delay}s" repeatCount="indefinite" /></rect>`);
			} else if (key === 'R') {
				parts.push(`<rect x="${x}" y="${y}" width="1" height="1"><animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" /></rect>`);
			}
		});
	});
	const steps = (from, to) => {
		const values = [];
		for (let x = from; from < to ? x <= to : x >= to; x += from < to ? 1 : -1) {
			values.push(x);
		}
		return values.join(';');
	};
	parts.push(`<rect y="12" width="3" height="1"><animate attributeName="x" values="${steps(-3, 64)}" calcMode="discrete" dur="4s" repeatCount="indefinite" /></rect>`);
	parts.push(`<rect y="14" width="2" height="1"><animate attributeName="x" values="${steps(64, -2)}" calcMode="discrete" dur="6s" repeatCount="indefinite" /></rect>`);
	return `<g mask="url(#scene-mask)" style="fill: var(--led-on)">${parts.join('')}</g>`;
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

async function writePage(outputPath, { title, content, description, noteData = '' }) {
	const layout = await loadTemplate('layout');
	const fullPath = path.join(OUTPUT_DIR, outputPath);

	// The menu marks the section this page belongs to, found from the first
	// folder of its address: a note counts as Notes, a topic as Topics.
	const section = outputPath.split('/')[0];
	const current = (name) => (section === name ? ' aria-current="page"' : '');

	await mkdir(path.dirname(fullPath), { recursive: true });
	await writeFile(
		fullPath,
		render(layout, {
			title,
			content,
			description: escapeHtml(description || SITE_DESCRIPTION),
			noteData,
			logoRobot: LOGO_ROBOT,
			notesCurrent: current('notes'),
			topicsCurrent: current('topics'),
			aboutCurrent: current('about'),
		})
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
