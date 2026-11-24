// The pixel art for Ramon's avatar, drawn as a text grid: one character per
// pixel, '.' for an empty pixel. The build script draws it into the About
// page.

// What each character means. A colour that follows the light/dark theme is a
// class name, styled in styles.css. Any other colour is a plain fill.
const COLOURS = {
	C: '#FFB547', // cap
	W: '#FFFFFF', // cap badge, eye whites
	b: '#B8721E', // cap brim
	h: 'px-hair',
	s: '#E8B48A', // skin
	m: '#B5524A', // mouth
	k: '#1A1A1A', // pupils
	K: '#565C6B', // headphone band
	R: '#E05A4F', // headphone cups
	g: 'px-shirt',
	p: 'px-pants',
};

// A pupil. It is drawn as eye white, with the pupil itself added on top at
// the end as its own rect.
const PUPIL = 'o';

// How brightly each avatar pixel lights up when the avatar is drawn as LED
// dots (see drawLed below), from 1 (fully lit) down. Pixels at 0, like the
// pupils, stay dark.
export const AVATAR_LEVELS = {
	K: 1,
	W: 1,
	R: 1,
	C: 0.75,
	m: 0.75,
	b: 0.45,
	g: 0.45,
	h: 0.3,
	p: 0.3,
	s: 0.3,
	k: 0,
	o: 0,
};

// The avatar, 16 × 20, facing front.
export const FRAMES = {
	front: [
		'....KKKKKKKK....',
		'...KCCCWWCCCK...',
		'...KCCCCCCCCK...',
		'..bbbbbbbbbbbb..',
		'...hssssssssh...',
		'..RRWWWssWWWRR..',
		'..RRWoWssWoWRR..',
		'..RRWWWssWWWRR..',
		'..RRssssssssRR..',
		'...ssssssssss...',
		'...sssmmmmsss...',
		'....ssssssss....',
		'......ssss......',
		'...gggggggggg...',
		'..gggggggggggg..',
		'..sggggggggggs..',
		'...gggggggggg...',
		'....ppp..ppp....',
		'....ppp..ppp....',
		'....ppp..ppp....',
	],
};

// Turns a grid into SVG <rect>s, one per run of same-coloured pixels on a
// row. Put the result inside an <svg> whose viewBox matches the grid's size.
// It uses the colours above unless it is given another list, like the
// footer scene's.
export function drawSprite(rows, colours = COLOURS) {
	const rects = [];
	const pupils = [];

	rows.forEach((row, y) => {
		const keys = [...row].map((key, x) => {
			if (key === PUPIL) {
				pupils.push(`<rect class="pupil" x="${x}" y="${y}" width="1" height="1" fill="${COLOURS.k}" />`);
				return 'W';
			}
			return key;
		});

		let start = 0;
		while (start < keys.length) {
			let end = start + 1;
			while (keys[end] === keys[start]) {
				end++;
			}
			if (keys[start] !== '.') {
				const colour = colours[keys[start]];
				if (!colour) {
					throw new Error(`No colour for "${keys[start]}".`);
				}
				const paint = colour.startsWith('#') ? `fill="${colour}"` : `class="${colour}"`;
				rects.push(`<rect x="${start}" y="${y}" width="${end - start}" height="1" ${paint} />`);
			}
			start = end;
		}
	});

	return [...rects, ...pupils].join('');
}

// Drawing art as LED dots, like a dot-matrix display: every pixel is a round
// dot, lit amber at its level. Lit dots take their colour from the --led-on
// variable in styles.css, so they follow the theme; in a standalone SVG file,
// which CSS can't reach, they fall back to the amber after the comma. Unlit
// dots, used only behind the footer scene, are a fixed dark brown.
const LED_ON = 'var(--led-on, #ffb238)';
const LED_OFF = '#1c160c';

// The shared parts of one LED picture: the round-dot mask, the blur for the
// glow, and, when `unlit` is set, a full layer of unlit dots behind the art.
// Characters like the robot leave it off and stand on the page itself. `id`
// must be unique on the page, since the mask and blur are found by id. Draw
// the lit dots after it with drawLed().
export function ledBase(id, width, height, { unlit = false } = {}) {
	return (
		'<defs>' +
		`<pattern id="${id}-dots" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.4" fill="#fff" /></pattern>` +
		`<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#${id}-dots)" /></mask>` +
		`<filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.6" /></filter>` +
		'</defs>' +
		(unlit
			? `<rect width="${width}" height="${height}" mask="url(#${id}-mask)" style="fill: ${LED_OFF}" />`
			: '')
	);
}

// The lit dots of one grid, with `levels` saying how brightly each key
// lights up. Rows are still drawn as runs by drawSprite, then cut into dots
// by the mask from ledBase(). The fully lit dots also get a soft glow: a
// blurred copy of them, drawn underneath. `frameId` must be unique on the
// page too.
export function drawLed(rows, levels, id, frameId) {
	// drawSprite treats o as a pupil, so give it another letter here.
	const grid = rows.map((row) => row.replaceAll(PUPIL, '*'));
	const keyLevels = { ...levels, '*': levels[PUPIL] ?? 0 };
	const allKeys = Object.fromEntries(Object.keys(keyLevels).map((key) => [key, 'led']));
	const atLevel = (level) =>
		drawSprite(
			grid.map((row) => [...row].map((key) => (keyLevels[key] === level ? key : '.')).join('')),
			allKeys
		);

	const dimLevels = [...new Set(Object.values(keyLevels))]
		.filter((level) => level > 0 && level < 1)
		.sort();
	const dim = dimLevels
		.map((level) => `<g fill-opacity="${level}">${atLevel(level)}</g>`)
		.join('');

	return (
		`<use href="#${frameId}-lit" class="led-glow" filter="url(#${id}-glow)" />` +
		`<g mask="url(#${id}-mask)" style="fill: ${LED_ON}">${dim}</g>` +
		`<g id="${frameId}-lit" mask="url(#${id}-mask)" style="fill: ${LED_ON}">${atLevel(1)}</g>`
	);
}
