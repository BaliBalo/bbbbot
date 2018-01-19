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
const twemoji = require('twemoji');

const customCode = '\\[\\[([^= ]*)=([^\\] ]+)\\]\\]';

const maxWidth = 390;
const maxHeight = 290;
const padding = 5;
const font = '15px Helvetica Neue,Helvetica,Arial,sans-serif';
const lineHeight = 20;
const maxLines = maxHeight / lineHeight;

function drawText(ctx, text) {
	ctx.font = font;
	ctx.textBaseline = 'middle';
	let defaultColor = 'rgba(255, 255, 255, 0.7)'
	ctx.fillStyle = defaultColor;

	let fullWidth = 0;
	let icons = [];
	let currentLine = 0;
	let currentLeft = 0;
	let nextLine = () => {
		fullWidth = Math.max(fullWidth, left);
		currentLine++;
	};
	let updatePos = width => {
		let left = currentLeft;
		if (left + width > maxWidth) {
			if (currentLeft) {
				nextLine();
			}
			currentLeft = width;
			return 0;
		}
		currentLeft += width;
		return left;
	};
	let nextToken = () => {
		let token = text.match(new RegExp('^(.*?)('+customCode+'|\\s|$)'));
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
			nextLine();
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
					ctx.drawImage(img, left, top, 20, 20);
				}));
			} else if (type === 'color') {
				ctx.fillStyle = value === 'reset' ? defaultColor : value;
			}
			continue;
		}

		let size = ctx.measureText(token).width;
		let left = padding + updatePos(size);
		ctx.fillText(token, left, currentTop());

		if (currentLine >= maxLines - 1) {
			ctx.fillText('...', currentLeft, currentTop());
			break;
		}
	}
	let w = Math.min(Math.max(fullWidth, currentLeft), maxWidth) + 2 * padding;
	let h = Math.min((currentLine + 1) * lineHeight, maxHeight) + 2 * padding;
	return { w, h, icons };
}

function spoilerGif(text, title) {
	let c = new Canvas(320, 240);
	let ctx = c.getContext('2d');

	let transition;
	let desiredTransition = title.match(/^([a-z]+)\|/i);
	if (desiredTransition && transitions[desiredTransition[1]]) {
		transition = transitions[desiredTransition[1]];
		title = title.slice(desiredTransition[0].length);
	} else {
		let transitionId = ~~(Math.random() * transList.length);
		transition = transList[transitionId];
	}

	title = title || '(spoiler, trou du cul)';

	let cfrom = new Canvas(maxWidth + 2 * padding, maxHeight);
	let from = cfrom.getContext('2d');
	from.fillStyle = '#36393e';
	from.fillRect(0, 0, cfrom.width, cfrom.height);
	let fromData = drawText(from, title);
	// 36 for the 'gif' size + 5 extra padding
	fromData.w = Math.min(fromData.w + 41, maxWidth);

	let cto = new Canvas(maxWidth + 2 * padding, maxHeight);
	let to = cto.getContext('2d');
	to.fillStyle = '#36393e';
	to.fillRect(0, 0, cto.width, cto.height);
	let toData = drawText(to, text);

	let w = Math.max(fromData.w, toData.w);
	let h = Math.max(fromData.h, toData.h);
	let icons = [].concat(fromData.icons, toData.icons);

	return Promise.all(icons).then(() => {
		c.width = w;
		c.height = h;
		let encoder = new GIFEncoder(w, h);
		encoder.setRepeat(-1);
		encoder.setDelay(20);

		let stream = encoder.createReadStream();
		encoder.start();

		transition(ctx, cfrom, cto, () => encoder.addFrame(ctx));

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
			res('http://bbbbot.balibalo.xyz/spoilers/' + id + '.txt');
		});
	});
}

function replaceStandardEmojis(txt) {
	let imgtags = /<img class="emoji"[^>]* src="([^"]+)"[^>]*\/>/g;
	return twemoji.parse(txt, icon => '[[icon=https://twemoji.maxcdn.com/2/72x72/'+icon+'.png]]').replace(imgtags, (m, src) => src);
}

function prepareDrawingTxt(txt, message) {
	txt = txt.replace(/<@!?(1|\d{17,19})>/g, (m, id) => {
		let guildMember = message.mentions.members.get(id);
		let prefix = '[[color='+guildMember.displayHexColor+']]';
		let suffix = '[[color=reset]]';
		if (guildMember.user.avatarURL) {
			prefix = '[[icon=' + guildMember.user.avatarURL + ']]' + prefix;
		}
		return prefix + '@' + guildMember.displayName + suffix;
	});
	txt = txt.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name);
	txt = txt.replace(/<:[^: ]+:(\d+)>/g, (m, id) => '[[icon=https://cdn.discordapp.com/emojis/' + id + '.png]]');
	txt = replaceStandardEmojis(txt);
	return txt;
}

module.exports = function(message, content, title) {
	if (!content) return;
	message.delete();

	title = title || '';

	let shouldSave = true;
	if (title.startsWith('!|')) {
		title = title.slice(2);
		shouldSave = false;
	}

	let imgContent = prepareDrawingTxt(content, message);
	let imgTitle = prepareDrawingTxt(title, message);

	let textContent = content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => '@' + message.mentions.members.get(id).displayName)
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name)
		.replace(/<:([^: ]+):\d+>/g, (m, name) => ':' + name + ':')
		.replace(new RegExp(customCode, 'g'), '');

	let upload = Promise.resolve();
	if (shouldSave) {
		upload = uploadFile(textContent, message.id);
	}
	return upload.then(pasteUrl => {
		return spoilerGif(imgContent, imgTitle).then(gif => {
			let replyMsg = [
				pasteUrl && '(version texte: <'+pasteUrl+'>)'
			].filter(e => e).join(' ');
			return message.reply(replyMsg, {
				files: [ new Discord.Attachment(gif, 'spoiler.gif') ]
			});
		});
	});
};
