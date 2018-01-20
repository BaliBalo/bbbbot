const Discord = require('discord.js');
const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');

let w = 300, h = 270;
let s = 130;
let x = s + 5, y = h * .5;

let shuffle = a=>a.map((v,i,j)=>a[a[i]=a[j=0|i+Math.random()*(a.length-i)],j]=v);

let pColors = [
	'rgba(26, 188, 156, 1)',
	'rgba(22, 160, 133, 1)',
	'rgba(46, 204, 113, 1)',
	'rgba(39, 174, 96, 1)',
	'rgba(52, 152, 219, 1)',
	'rgba(41, 128, 185, 1)',
	'rgba(155, 89, 182, 1)',
	'rgba(142, 68, 173, 1)',
	'rgba(52, 73, 94, 1)',
	'rgba(44, 62, 80, 1)',
	'rgba(241, 196, 15, 1)',
	'rgba(243, 156, 18, 1)',
	'rgba(230, 126, 34, 1)',
	'rgba(211, 84, 0, 1)',
	'rgba(231, 76, 60, 1)',
	'rgba(192, 57, 43, 1)',
	'rgba(236, 240, 241, 1)',
	'rgba(189, 195, 199, 1)',
	'rgba(149, 165, 166, 1)',
	'rgba(127, 140, 141, 1)'
];

module.exports = function(choices, message) {
	if (!choices.length) return;
	let hueOffset = 360 * Math.random();
	let colors = choices.map((choice, i) => {
		let hue = hueOffset + i * 360 / choices.length;
		return 'hsl(' + hue + ', 50%, 65%)';
	});
	shuffle(colors);

	// let force = Math.random() * .3 + .55;
	let force = Math.random() * .5 + .1;
	let friction = .98;
	let offset = 0;

	let minSliceSize = Math.PI / 6;
	let dup = 1;
	while (2 * Math.PI / ((dup + 1) * choices.length) > minSliceSize) {
		dup++;
	}
	let l = choices.length * dup;
	let ai = 2 * Math.PI / l;

	let encoder = new GIFEncoder(w, h);
	encoder.setRepeat(-1);
	encoder.setDelay(20);
	encoder.setQuality(10);

	let stream = encoder.createReadStream();
	encoder.start();

	let result = new Canvas(w, h);
	let ctx = result.getContext('2d');
	ctx.font = '15px sans-serif';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	let won = '';
	let lastWheelFrame = new Canvas(w, h);
	let lastWheelCtx = lastWheelFrame.getContext('2d');
	let particles = [];
	function spinFrame() {
		ctx.fillStyle = '#36393e';
		ctx.fillRect(0, 0, w, h);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(offset);
		for (let i = 0; i < l; i++) {
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, s, -.5 * ai, .5 * ai, false);
			ctx.fillStyle = colors[i % choices.length % colors.length];
			ctx.fill();
			ctx.fillStyle = 'black';
			ctx.fillText(choices[i % choices.length], s * .62, 0, s * .7);
			ctx.rotate(-ai);
		}
		ctx.restore();
		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		ctx.moveTo(2 * s, y);
		ctx.arc(w - 15, y, 10, Math.PI * -.5, Math.PI * .5, false);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		encoder.addFrame(ctx);
		if (force > .001) {
			offset += force;
			force *= friction;
			spinFrame();
		} else {
			ctx.font = '30px sans-serif';
			won = choices[~~(dup * choices.length * ((offset + ai * .5) / (2 * Math.PI) % 1)) % choices.length];
			lastWheelCtx.drawImage(result, 0, 0);
			winFrame();
		}
	}
	let winFrameNum = 0;
	function winFrame() {
		winFrameNum++;
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(lastWheelFrame, 0, 0);
		let opacity = Math.min(winFrameNum, 20) / 40;
		ctx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
		ctx.fillRect(0, 0, w, h);
		if (winFrameNum >= 40 && winFrameNum < 50) {
			for (let i = 0, n = Math.random() * 4; i < n; i++) {
				let force = Math.random() * 4 + 5;
				let angle = Math.random() * 2 * Math.PI;
				particles.push({
					color: pColors[~~(Math.random() * pColors.length)],
					rad: 4 + Math.random() * 6,
					pos: [x, y],
					vel: [force * Math.cos(angle), force * Math.sin(angle)]
				});
			}
		}
		for (let i = particles.length; i--;) {
			let p = particles[i];
			p.vel[1] += .2;
			p.vel[0] *= .99;
			p.vel[1] *= .99;
			p.pos[0] += p.vel[0];
			p.pos[1] += p.vel[1];
			ctx.beginPath();
			ctx.fillStyle = p.color;
			ctx.arc(p.pos[0], p.pos[1], p.rad, 0, 2 * Math.PI, false);
			ctx.fill();
			if (p.pos[1] - p.rad > h) {
				particles.splice(i, 1);
			}
		}
		let scaleP = Math.min(Math.max(winFrameNum - 20, 0), 20) / 20;
		scaleP *= scaleP * scaleP;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scaleP, scaleP);
		ctx.fillStyle = 'white';
		ctx.fillText(won, 0, 0, w - 10);
		ctx.restore();
		encoder.addFrame(ctx);
		if (winFrameNum >= 50 && !particles.length) {
			encoder.finish();
		} else {
			winFrame();
		}
	}
	spinFrame();

	return message.reply('', {
		files: [ new Discord.Attachment(stream, 'spin.gif') ]
	});
}
