const config = require('../../config.json');
const fs = require('fs');
const path = require('path');
const transitions = require('./transitions');
const transList = Object.values(transitions);

const Discord = require('discord.js');
const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');
const Image = Canvas.Image;
const request = require('request-promise-native');
const getStream = require('get-stream');

const defaultText = '(spoiler, trou du cul)';
const maxWidth = 390;
const maxHeight = 290;
const padding = 5;
const font = '15px Helvetica Neue,Helvetica,Arial,sans-serif';
const lineHeight = 20;
const maxLines = maxHeight / lineHeight;
function spoilerGif(text) {
	let c = new Canvas(320, 240);
	let ctx = c.getContext('2d');

	let cto = new Canvas(maxWidth + 2 * padding, 20 * lineHeight);
	let to = cto.getContext('2d');
	to.font = font;
	to.textBaseline = 'middle';
	to.fillStyle = '#36393e';
	to.fillRect(0, 0, cto.width, cto.height);
	to.fillStyle = 'rgba(255, 255, 255, 0.7)';

	// 36 for the 'gif' size + 5 extra padding
	let fullWidth = to.measureText(defaultText).width + 41;
	let icons = [];
	let currentLine = 0;
	let currentLeft = 0;
	let updatePos = width => {
		let left = currentLeft;
		if (left + width > maxWidth) {
			fullWidth = Math.max(fullWidth, Math.min(currentLeft, maxWidth));
			if (currentLeft) currentLine++;
			currentLeft = width;
			return 0;
		}
		currentLeft += width;
		return left;
	};
	let nextToken = () => {
		let token = text.match(/^(«««=([^» ]+)»»»|\s|\S+)/);
		token = token && token[0];
		if (token) {
			text = text.slice(token.length);
		}
		return token;
	};
	let currentTop = () => padding + lineHeight * (currentLine + .5);

	let token;
	while (token = nextToken()) {
		if (token === '\n') {
			currentLine++;
			currentLeft = 0;
			continue;
		}

		let iconMatch = token.match(/^«««=(.+)»»»$/);
		if (iconMatch) {
			let left = padding + updatePos(24);
			let top = currentTop() - 10;
			icons.push(request({
				url: iconMatch[1],
				encoding: null
			}).then(src => {
				let img = new Image();
				img.src = src;
				to.drawImage(img, left, top, 20, 20);
			}));
			continue;
		}

		let size = to.measureText(token).width;
		let left = padding + updatePos(size);
		to.fillText(token, left, currentTop());

		if (currentLine >= maxLines) {
			to.fillText('...', currentLeft, currentTop());
			break;
		}
	}

	let w = fullWidth + 2 * padding;
	let h = Math.min((currentLine + 1) * lineHeight, maxHeight) + 2 * padding;

	return Promise.all(icons).then(() => {
		c.width = w;
		c.height = h;
		let encoder = new GIFEncoder(w, h);

		let stream = encoder.createReadStream();

		let cfrom = new Canvas(w, h);
		let from = cfrom.getContext('2d');
		from.font = font;
		from.textBaseline = 'middle';
		from.fillStyle = '#36393e';
		from.fillRect(0, 0, w, h);
		from.fillStyle = 'rgba(255, 255, 255, 0.5)';
		from.fillText(defaultText, padding, padding + lineHeight * .5);

		encoder.start();
		encoder.setRepeat(-1);
		encoder.setDelay(20);

		let tid = ~~(Math.random() * transList.length);
		transList[tid](ctx, cfrom, cto, () => encoder.addFrame(ctx));

		encoder.finish();

		return stream;
	});
}

function uploadFile(content, id) {
	return new Promise((res, rej) => {
		fs.writeFile(path.join(__dirname, '../../data/spoilers', id + '.txt'), content, err => {
			if (err) {
				console.log('Error saving spoiler file', err);
				return res('');
			}
			res('http://bbbbot.pause-geek.fr/spoilers/' + id + '.txt');
		});
	});
}

module.exports = function(message, content) {
	if (!content) return;
	message.delete();

	// use mentions.USERS_PATTERN on next major (discord.js 12)
	content = content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => {
			let guildMember = message.mentions.members.get(id);
			let avatar = '';
			if (guildMember.user.avatarURL) {
				avatar = '«««='+guildMember.user.avatarURL+'»»»';
			}
			return avatar + '@' + guildMember.displayName;
		})
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name);

	return uploadFile(content.replace(/«««=([^» ]+)»»»/g, ''), message.id).then(pasteUrl => {
		return spoilerGif(content).then(gif => {
			return message.reply(pasteUrl ? '(version texte: <'+pasteUrl+'>)' : '', {
				files: [ new Discord.Attachment(gif, 'spoiler.gif') ]
			});
		});
	});
};
