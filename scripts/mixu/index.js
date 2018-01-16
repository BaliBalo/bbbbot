const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
const Image = Canvas.Image;

function shuffle(a) {
	let j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
}

let padding = 2;
let count = 4;
let fullSize = 128;
let smallSize = fullSize / count;
let size = fullSize + (count + 1) * padding;
let getImage = new Promise((res, rej) => {
	fs.readFileSync(path.join(__dirname, 'full.png'), (err, res) => {
		if (err) return rej(err);
		res(res);
	});
}).then(src => {
	let img = new Image();
	img.src = src;
	return img;
});

function scramble() {
	let order = shuffle([...Array(count * count)].map((e, i) => i));
	return getImage.then(img => {
		let canvas = new Canvas(size, size);
		let ctx = canvas.getContext('2d');
		order.forEach((src, dest) => {
			let sx = src % count, sy = ~~(src / count);
			let dx = dest % count, dy = ~~(dest / count);
			ctx.drawImage(img, sx * smallSize, sy * smallSize, smallSize, smallSize, padding + dx * (smallSize + padding), padding + dy * (smallSize + padding), smallSize, smallSize);
		});
		return canvas.createPNGStream();
	});
}

module.exports = function(message) {
	return scramble().then(png => {
		message.channel.send(':regional_indicator_m::regional_indicator_i::regional_indicator_x::regional_indicator_u:', {
			files: [ new Discord.Attachment(png, 'result.png') ]
		});
	});
};
