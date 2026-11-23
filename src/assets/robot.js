// The Pixel Facie robot, reading a red book: 18 × 23, drawn as a text grid
// like the art in sprites.js. The build script draws it into the header, the
// home page and the site icon.

// The colours are the same in both themes: the dark outline shows on the
// light theme and the light grey body shows on the dark one. The outline is
// k, not o, because drawSprite treats o as a pupil.
export const ROBOT_COLOURS = {
	k: '#2a2e3a', // outline
	g: '#c8ccd4', // head, hands
	G: '#9aa0aa', // body
	e: '#47e5ff', // eyes
	a: '#47e5ff', // antenna, lit
	A: '#2a6f7c', // antenna, dim
	d: '#b5524a', // book cover
	D: '#7d3530', // book spine
	y: '#ffb547', // title marks on the cover
};

// The robot without its eyes. frame() adds them.
const ROBOT = [
	'........aa........',
	'........kk........',
	'....kkkkkkkkkk....',
	'...kggggggggggk...',
	'...kggggggggggk...',
	'...kggggggggggk...',
	'...kggggggggggk...',
	'...kGGGGGGGGGGk...',
	'....kkkkkkkkkk....',
	'.......kGGk.......',
	'....kkkkkkkkkk....',
	'...kGGGGGGGGGGk...',
	'..kGkkkkkkkkkkGk..',
	'..kGkdddDDdddkGk..',
	'..kgggddDDdygggk..',
	'..kggkddDDddkggk..',
	'...kkdddDDdydkk...',
	'....kdddDDdddk....',
	'....kkkkkkkkkk....',
	'.....kGGGGGGk.....',
	'.....kkkkkkkk.....',
	'.....kgk..kgk.....',
	'....kkkk..kkkk....',
];

// One frame of the reading animation. `look` moves the eyes one pixel left
// (-1) or right (1), `shut` closes them, and `light` switches the antenna.
function frame({ look = 0, shut = false, light = true }) {
	const rows = ROBOT.map((row) => [...row]);
	rows[0][8] = rows[0][9] = light ? 'a' : 'A';
	for (const x of [6 + look, 10 + look]) {
		if (shut) {
			rows[6][x] = rows[6][x + 1] = 'k';
		} else {
			for (const y of [5, 6]) {
				rows[y][x] = rows[y][x + 1] = 'e';
			}
		}
	}
	return rows.map((row) => row.join(''));
}

// The 12 frames of the reading animation, shown 450ms each: the eyes scan
// the page, blink once, and the antenna pulses.
export const ROBOT_FRAMES = [
	{ look: -1 },
	{ look: -1, light: false },
	{ look: 0 },
	{ look: 1, light: false },
	{ look: -1 },
	{ look: 0, light: false },
	{ look: 1 },
	{ look: 1, shut: true, light: false },
	{ look: 1 },
	{ look: 1, light: false },
	{ look: -1 },
	{ look: -1, light: false },
].map(frame);
