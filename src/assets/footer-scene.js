// The scenery along the bottom of the footer: a cyber grid, with wireframe
// towers standing on a glowing floor. Drawn as a text grid like the art in
// sprites.js. The build turns it into pictures for each theme, a moving one
// and a still one, and the CSS repeats the right one across the footer. The
// left and right edges match, so the copies join up.
//
// It is 64 × 18. The first and last columns must line up with each other.
// In the moving pictures the windows (w) flicker, the antenna light (R)
// pulses, and data pulses run along the floor's grid lines (see build.js).

export const SCENE = [
	'..................................R.............................',
	'.............................nnnnnnnnnnnn.......................',
	'.............................n..........n.......................',
	'....nnnnnnnn.................n.w.w.w.w.wn.......................',
	'....n......n.................n..........n.....nnnnnnnn..........',
	'....n.w.w.wn.................n.w.w.w.w.wn.....n......n..........',
	'....n......n.....nnnnnn......n..........n.....n.w.w.wn..........',
	'....n.w.w.wn.....n....n......n.w.w.w.w.wn.....n......n...nnnn...',
	'....n......n.....n.w.wn......n..........n.....n.w.w.wn...n..n...',
	'....n.w.w.wn.....n....n......n.w.w.w.w.wn.....n......n...n.wn...',
	'....n......n.....n.w.wn......n..........n.....n.w.w.wn...n..n...',
	'....n.w.w.wn.....n....n......n.w.w.w.w.wn.....n......n...n.wn...',
	'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
	'g.......g.......g.......g.......g.......g.......g.......g.......',
	'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
	'g...g...g...g...g...g...g...g...g...g...g...g...g...g...g...g...',
	'g...g...g...g...g...g...g...g...g...g...g...g...g...g...g...g...',
	'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

// What each character means, by day and by night: blueprint blues by day,
// neon by night. The pulses that run along the grid use the outline colour.
export const SCENE_COLOURS = {
	day: {
		n: '#3F6FB5', // tower outlines, pulses
		w: '#7FA8E0', // windows
		g: '#9DB8DE', // floor grid
		R: '#E05A4F', // antenna light
	},
	night: {
		n: '#47E5FF',
		w: '#FF4FD8',
		g: '#7B3FE4',
		R: '#FF6B5E',
	},
};
