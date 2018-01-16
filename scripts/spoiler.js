const Discord = require('discord.js');
const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');
const request = require('request-promise-native');
const getStream = require('get-stream');

const defaultText = '(spoiler, fils de pute)';
const font = '15px Helvetica Neue,Helvetica,Arial,sans-serif';
const lineHeight = 20;
function spoilerGif(text) {
	text = text.split('\n');
	let c = new Canvas(320, 240);
	let ctx = c.getContext('2d');

	// Compute size
	ctx.font = font;
	let maxWidth = 600;
	// 36 for the 'gif' size + 5 extra padding
	let width = ctx.measureText(defaultText).width + 41;
	let lines = [];
	text.forEach(src => {
		src = src.split(' ');
		let line = src.shift();
		let size = ctx.measureText(line).width;
		while (src.length) {
			let elem = src.shift();
			let iSize = ctx.measureText(line + ' ' + elem).width;
			if (iSize > maxWidth) {
				lines.push(line);
				width = Math.max(width, size);
				line = elem;
				size = ctx.measureText(line).width;
			} else {
				line += ' ' + elem;
				size = iSize;
			}
		}
		lines.push(line);
		width = Math.max(width, size);
	});
	lines = lines.slice(0, 20);

	let padding = 5;
	let w = width + 2 * padding;
	let h = lines.length * lineHeight + 2 * padding;

	c.width = w;
	c.height = h;
	let encoder = new GIFEncoder(w, h);

	let prom = getStream.buffer(encoder.createReadStream(), { encoding: 'binary' });

	let cfrom = new Canvas(w, h);
	let cto = new Canvas(w, h);
	let from = cfrom.getContext('2d');
	let to = cto.getContext('2d');

	from.font = font;
	to.font = font;
	from.textBaseline = 'top';
	to.textBaseline = 'top';
	to.fillStyle = '#36393e';
	to.fillRect(0, 0, w, h);
	from.fillStyle = '#36393e';
	from.fillRect(0, 0, w, h);
	from.fillStyle = 'rgba(255, 255, 255, 0.5)';
	to.fillStyle = 'rgba(255, 255, 255, 0.7)';
	from.fillText(defaultText, padding, padding);
	lines.forEach((line, i) => to.fillText(line, padding, padding + lineHeight * i));

	encoder.start();
	encoder.setRepeat(-1);
	encoder.setDelay(20);

	let bandSize = 10;
	let duration = 40;
	let bandDuration = .4;
	let easing = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
	function frame(i) {
		let p = i / (duration - 1);
		for (let l = 0; l < w; l += bandSize) {
			let bandFrom = (1 - bandDuration) * l / w;
			let bandProgress = Math.min(Math.max((p - bandFrom) / bandDuration, 0), 1);
			bandProgress = easing(bandProgress);
			let y = -bandProgress * h;
			ctx.drawImage(cfrom, l, 0, bandSize, h, l, y, bandSize, h);
			ctx.drawImage(cto, l, 0, bandSize, h, l, y + h, bandSize, h);
		}
		encoder.addFrame(ctx);
	}
	for (let i = 0; i < duration; i++) {
		frame(i);
	}

	encoder.finish();

	return prom.then(buffer => (
		request.post({
			url: 'https://api.imgur.com/3/image',
			headers: {
				Authorization: 'Client-ID 365facd888ebe57'
			},
			json: true,
			formData: {
				type: 'base64',
				name: 'spoiler.gif',
				image: buffer.toString('base64')
			}
		});
	)).then(r => r && r.data && r.data.link);
}

modules.exports = function(message, content) {
	if (!content) return;
	message.edit('!spoiler');
	spoilerGif(content).then(url => {
		const embed = new Discord.RichEmbed()
			.setTitle('Spoiler')
			.setURL('https://google.com');
		if (url) embed.setImage(url);
		message.edit({ embed });
	});
};
