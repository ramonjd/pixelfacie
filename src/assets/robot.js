// The Pixel Facie robot, reading a book: 18 × 23, drawn as a text grid like
// the art in sprites.js. The build script draws it in LED dots into the
// header and the home page, and in square pixels for the site icon. The
// outline is k, not o, because drawSprite treats o as a pupil.

// How brightly each key lights up when the robot is drawn as LED dots (see
// drawLed in sprites.js): the outline, eyes, lit antenna and the book's title
// marks are fully lit, the book is part-lit, and the head and body glow
// faintly so the outline reads.
export const ROBOT_LEVELS = {
	k: 1,
	e: 1,
	a: 1,
	y: 1,
	d: 0.55,
	D: 0.35,
	A: 0.2,
	g: 0.16,
	G: 0.1,
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
