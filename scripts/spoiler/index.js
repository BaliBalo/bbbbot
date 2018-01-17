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

const customCode = '\\[\\[([^= ]*)=([^\\] ]+)\\]\\]';

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
	let defaultColor = 'rgba(255, 255, 255, 0.7)'
	to.fillStyle = defaultColor;

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
		let token = text.match(new RegExp('^(.*?)('+customCode+'|\s)'));
		token = token && (token[1] || token[2]);
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

		let customCodeMatch = token.match(new RegExp('^'+customCode+'$'));
		if (customCodeMatch) {
			let type = customCodeMatch[1];
			let value = customCodeMatch[2];
			if (type === 'icon') {
				let left = padding + updatePos(24);
				let top = currentTop() - 10;
				icons.push(request({
					url: value,
					encoding: null
				}).then(src => {
					let img = new Image();
					img.src = src;
					to.drawImage(img, left, top, 20, 20);
				}));
			} else if(type === 'color') {
				to.fillStyle = value === 'reset' ? defaultColor : value;
			}
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

	let emojis = message.guild.emojis;
	// use mentions.USERS_PATTERN on next major (discord.js 12)
	let imgContent = content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => {
			let guildMember = message.mentions.members.get(id);
			let prefix = '[[color='+guildMember.displayHexColor+']]';
			let suffix = '[[color=reset]]';
			if (guildMember.user.avatarURL) {
				prefix = '[[icon=' + guildMember.user.avatarURL + ']]' + prefix;
			}
			return prefix + '@' + guildMember.displayName + suffix;
		})
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name)
		.replace(/<:[^: ]+:(\d+)>/g, (m, id) => '[[icon=https://cdn.discordapp.com/emojis/' + id + '.png]]');

	let textContent = content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => '@' + message.mentions.members.get(id).displayName)
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name)
		.replace(/<:([^: ]+):\d+>/g, (m, name) => ':' + name + ':')
		.replace(new RegExp(customCode, 'g'), '');

	return uploadFile(textContent, message.id).then(pasteUrl => {
		return spoilerGif(imgContent).then(gif => {
			return message.reply(pasteUrl ? '(version texte: <'+pasteUrl+'>)' : '', {
				files: [ new Discord.Attachment(gif, 'spoiler.gif') ]
			});
		});
	});
};
