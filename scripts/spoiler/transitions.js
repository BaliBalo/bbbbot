// Testing : https://jsfiddle.net/o0marpyv/1/

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

let bandsAlternate = (function() {
	let bandSize = 40;
	let duration = 40;
	let bandDuration = .2;
	let easing = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;

	function frame(i, ctx, from, to) {
		let p = i / (duration - 1);
		let w = ctx.canvas.width;
		let h = ctx.canvas.height;
		for (let index = 0; index * bandSize < w; index++) {
			let l = index * bandSize;
			let bandFrom = (1 - bandDuration) * l / w;
			let bandProgress = Math.min(Math.max((p - bandFrom) / bandDuration, 0), 1);
			bandProgress = easing(bandProgress);
			let direction = (index % 2 ? 1 : -1);
			let y = bandProgress * h * direction;
			ctx.drawImage(from, l, 0, bandSize, h, l, y, bandSize, h);
			ctx.drawImage(to, l, 0, bandSize, h, l, y + h * -direction, bandSize, h);
		}
	}

	return genericRenderer(frame, duration);
})();

let wave = (function() {
	let bandSize = 20;
	let duration = 50;
	let bandDuration = .35;

	function frame(i, ctx, from, to) {
		let p = i / (duration - 1);
		let w = ctx.canvas.width;
		let h = ctx.canvas.height;
		ctx.fillStyle = '#202731';
		ctx.fillRect(0, 0, w, h);
		for (let l = 0; l < w; l += bandSize) {
			let bandFrom = (1 - bandDuration) * l / w;
			let bandProgress = Math.min(Math.max((p - bandFrom) / bandDuration, 0), 1);
			let bandZoom = 1 / (1 + Math.sin(bandProgress * Math.PI) * 1.333);
			let im = bandProgress < .5 ? from : to;
			let iw = bandSize;
			let fw = iw * bandZoom;
			let fh = h * bandZoom;
			ctx.drawImage(from, l, 0, iw, h, l + (iw - fw) * .5, (h - fh) * .5, fw, fh);
			ctx.globalAlpha = Math.max(Math.min((bandProgress - .4) / .2, 1), 0);
			ctx.drawImage(to, l, 0, iw, h, l + (iw - fw) * .5, (h - fh) * .5, fw, fh);
			ctx.globalAlpha = 1;
		}
	}

	return genericRenderer(frame, duration);
})();

module.exports = {
	bands,
	bandsAlternate,
	wave
};
