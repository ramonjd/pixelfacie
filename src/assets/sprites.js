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
