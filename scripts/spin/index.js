const Discord = require('discord.js');
const GIFEncoder = require('gifencoder');
const { createCanvas, Image } = require('canvas');
const request = require('request-promise-native');
const twemoji = require('twemoji');

let w = 240, h = 220;
let s = 105;
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

const customCode = '\\[\\[([^= ]*)=([^\\] ]+)\\]\\]';

function replaceStandardEmojis(txt) {
	let imgtags = /<img class="emoji"[^>]* src="([^"]+)"[^>]*\/>/g;
	return twemoji.parse(txt, icon => '[[icon=https://twemoji.maxcdn.com/2/72x72/'+icon+'.png]]').replace(imgtags, (m, src) => src);
}
function fillText(ctx, text, x, y, max, asImage) {
	let parts = [];
	let token;
	while (token = text.match(new RegExp('^(.*?)('+customCode+'|$)'))) {
		token = token[1] || token[2];
		if (token) {
			parts.push(token);
			text = text.slice(token.length);
		} else {
			break;
		}
	}
	let fontSize = parseInt(ctx.font);
	let partSizes = [];
	let height = fontSize;
	parts.forEach(part => {
		let customCodeMatch = part.match(new RegExp('^'+customCode+'$'));
		if (customCodeMatch) {
			if (customCodeMatch[1] === 'icon') {
				partSizes.push(fontSize * 1.5);
				height = Math.max(height, fontSize * 1.5);
			}
			return;
		}
		let metrics = ctx.measureText(part);
		// m.actualBoundingBoxRight - m.actualBoundingBoxLeft
		partSizes.push(metrics.width);
		height = Math.max(height, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
	});
	let width = partSizes.reduce((s, e) => s + e);
	let result = createCanvas(width, height);
	let tctx = result.getContext('2d');
	let defaultColor = ctx.fillStyle;
	tctx.fillStyle = defaultColor;
	tctx.font = ctx.font;
	tctx.textAlign = 'left';
	tctx.textBaseline = 'middle';
	let pos = 0;
	let icons = [];
	parts.forEach((part, i) => {
		let size = partSizes[i];
		let customCodeMatch = part.match(new RegExp('^'+customCode+'$'));
		if (customCodeMatch) {
			let type = customCodeMatch[1];
			let value = customCodeMatch[2];
			if (type === 'icon') {
				let left = pos;
				icons.push(request({
					url: value,
					encoding: null
				}).then(src => {
					let img = new Image();
					img.src = src;
					tctx.drawImage(img, left, (height - size) * .5, size, size);
				}).catch(e => console.log(e)));
			} else if (type === 'color') {
				ctx.fillStyle = value === 'reset' ? defaultColor : value;
			}
			pos += size;
			return;
		}
		tctx.fillText(part, pos, height * .5);
		pos += size;
	});
	if (asImage) {
		return Promise.all(icons).then(() => result);
	}
	switch (ctx.textBaseline)  {
		case 'top':    break;
		case 'middle': y -= height * .5; break;
		case 'bottom':
		default:       y -= height; break;
	}
	let fw = width;
	if (max && max < width) fw = max;
	switch (ctx.textAlign)  {
		case 'right':
		case 'start':  break;
		case 'center': x -= fw * .5; break;
		case 'right':
		case 'end':    x -= fw; break;
	}
	return Promise.all(icons).then(() => ctx.drawImage(result, 0, 0, width, height, x, y, fw, height));
	// return Promise.all(icons).then(() => {
	// 	ctx.beginPath();
	// 	ctx.rect(x, y, fw, height);
	// 	ctx.stroke();
	// });
}

module.exports = function(choices, message) {
	if (!choices.length) return;
	choices = choices.map(replaceStandardEmojis);

	let start = Date.now();
	let hueOffset = 360 * Math.random();
	let colors = choices.map((choice, i) => {
		let hue = hueOffset + i * 360 / choices.length;
		return 'hsl(' + hue + ', 50%, 65%)';
	});
	shuffle(colors);

	let force = Math.random() * .8 + .2;
	let friction = .965;
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
	encoder.setQuality(20);

	let stream = encoder.createReadStream();
	let file = new Discord.MessageAttachment(stream, 'spin.gif');
	message.reply('', {
		files: [ file ]
	});
	encoder.start();

	let count = 0;
	let result = createCanvas(w, h);
	let ctx = result.getContext('2d');
	ctx.font = '30px sans-serif';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	let won = undefined;
	let winFrameNum = 0;
	let particles = [];
	function drawWheel() {
		let wheel = createCanvas(2 * s, 2 * s);
		let wheelCtx = wheel.getContext('2d');
		wheelCtx.font = '12px sans-serif';
		wheelCtx.textBaseline = 'middle';
		wheelCtx.textAlign = 'center';
		wheelCtx.save();
		wheelCtx.translate(s, s);
		let texts = Promise.resolve();
		for (let i = 0; i < l; i++) {
			texts = texts.then(() => {
				if (i) {
					wheelCtx.rotate(-ai);
				}
				wheelCtx.beginPath();
				wheelCtx.moveTo(0, 0);
				wheelCtx.arc(0, 0, s, -.5 * ai, .5 * ai, false);
				wheelCtx.fillStyle = colors[i % choices.length % colors.length];
				wheelCtx.fill();
				wheelCtx.fillStyle = 'black';
				return fillText(wheelCtx, choices[i % choices.length], s * .62, 0, s * .7);
			});
		}
		return texts.then(() => {
			wheelCtx.restore();
			return wheel;
		});
	}
	function frame(wheel) {
		ctx.fillStyle = '#36393e';
		ctx.fillRect(0, 0, w, h);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(offset);
		ctx.translate(-s, -s);
		ctx.drawImage(wheel, 0, 0);
		ctx.restore();
		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		ctx.moveTo(2 * s, y);
		ctx.arc(w - 12, y, 7, Math.PI * -.5, Math.PI * .5, false);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		if (winFrameNum) {
			let opacity = Math.min(winFrameNum / 20, .7);
			ctx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
			ctx.fillRect(0, 0, w, h);
			if (winFrameNum >= 3 && winFrameNum < 20) {
				for (let i = 0, n = Math.random() * 3.5; i < n; i++) {
					let force = Math.random() * 10 + 3;
					// let angle = Math.random() * 2 * Math.PI;
					// let angle = ((Math.random() - .5) * .4 - .5) * Math.PI;
					let angle = Math.PI * ((Math.random() * .2 + .05) * (Math.random() < .5 ? -1 : 1) - .5);
					particles.push({
						color: pColors[~~(Math.random() * pColors.length)],
						rad: 4 + Math.random() * 6,
						pos: [w * .5, h],
						vel: [force * Math.cos(angle), force * Math.sin(angle)]
					});
				}
			}
			for (let i = particles.length; i--;) {
				let p = particles[i];
				p.vel[1] += .2;
				// p.vel[0] *= .99;
				// p.vel[1] *= .99;
				p.pos[0] += p.vel[0];
				p.pos[1] += p.vel[1];
				ctx.beginPath();
				ctx.fillStyle = p.color;
				ctx.arc(p.pos[0], p.pos[1], p.rad, 0, 2 * Math.PI, false);
				ctx.fill();
				if (p.pos[1] - p.rad > h || p.pos[0] - p.rad > w || p.pos[0] < -p.rad || p.pos[1] + p.rad < -20) {
					particles.splice(i, 1);
				}
			}
			let scaleP = Math.min(Math.max(winFrameNum / 15, 0), 1);
			if (won && scaleP > .01) {
				scaleP *= scaleP * scaleP;
				ctx.save();
				ctx.translate(w * .5, y);
				ctx.scale(scaleP, scaleP);
				// ctx.fillStyle = 'white';
				// fillText(ctx, won, 0, 0, w - 10);
				let wonWidth = Math.min(won.width, w - 10);
				ctx.drawImage(won, 0, 0, won.width, won.height, wonWidth * -.5, won.height * -.5, wonWidth, won.height);
				ctx.restore();
			}
		}

		count++;
		encoder.addFrame(ctx);
		let wait = Promise.resolve();
		if (force > .001) {
			offset += force;
			force *= friction;
		} else {
			if (won === undefined) {
				force = 0;
				let wonChoice = choices[~~(dup * choices.length * ((offset + ai * .5) / (2 * Math.PI) % 1)) % choices.length];
				ctx.fillStyle = 'white';
				wait = fillText(ctx, wonChoice, 0, 0, w - 10, true).then(drawn => won = drawn);
			}
			winFrameNum++;
		}
		if (winFrameNum >= 20 && !particles.length) {
			encoder.finish();
			return;
		}
		if (count % 10 === 0) {
			// Every few frames, use setTimeout to let the process do other stuff
			wait = wait.then(() => new Promise(resolve => setTimeout(resolve, 1)));
		}
		return wait.then(() => frame(wheel));
	}
	return drawWheel().then(wheel => frame(wheel));
}
