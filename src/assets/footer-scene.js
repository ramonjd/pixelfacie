// The scenery along the bottom of the footer: a cyber grid, with wireframe
// towers standing on a glowing floor. Drawn as a text grid like the art in
// sprites.js. The build turns it into amber LED dots, a moving picture and a
// still one, and the CSS repeats the right one across the footer, which is a
// dark panel in both themes. The left and right edges match, so the copies
// join up.
//
// It is 64 × 18. The first and last columns must line up with each other.
// In the moving picture the windows (w) flicker, the antenna light (R)
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

// How brightly each character lights up as an LED dot: the tower outlines
// and the antenna fully, the windows a little less, the floor grid dimmer so
// the towers stand out. The pulses that run along the grid are fully lit.
export const SCENE_LEVELS = {
	n: 1,
	R: 1,
	w: 0.7,
	g: 0.4,
};
