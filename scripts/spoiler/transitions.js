function genericRenderer(draw, n) {
	return function(dest, from, to, onFrame) {
		for (let i = 0; i < n; i++) {
			draw(i, dest, from, to);
			onFrame(dest);
		}
	};
}

let bands = (function() {
	let bandSize = 10;
	let duration = 40;
	let bandDuration = .4;
	let easing = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;

	function frame(i, ctx, from, to) {
		let p = i / (duration - 1);
		let w = ctx.canvas.width;
		let h = ctx.canvas.height;
		for (let l = 0; l < w; l += bandSize) {
			let bandFrom = (1 - bandDuration) * l / w;
			let bandProgress = Math.min(Math.max((p - bandFrom) / bandDuration, 0), 1);
			bandProgress = easing(bandProgress);
			let y = -bandProgress * h;
			ctx.drawImage(from, l, 0, bandSize, h, l, y, bandSize, h);
			ctx.drawImage(to, l, 0, bandSize, h, l, y + h, bandSize, h);
		}
	}

	return genericRenderer(frame, duration);
})();

module.exports = {
	bands
};
