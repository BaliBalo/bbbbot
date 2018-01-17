const config = require('../config.json');
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
const padding = 5;
const font = '15px Helvetica Neue,Helvetica,Arial,sans-serif';
const lineHeight = 20;
function spoilerGif(text) {
	// text = text.split('\n');
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
		let token = txt.match(/^(«««=([^» ]+)»»»|\s|\S+)/);
		token = token && token[0];
		if (token) {
			txt = txt.slice(token.length);
		}
		return token;
	};
	let currentTop = () => padding + lineHeight * (currentLine + .5);

	while (let token = nextToken()) {
		if (token === '\n') {
			currentLine++;
			currentLeft = 0;
			continue;
		}

		let iconMatch = token.match(/^«««=(.+)»»»$/);
		if (iconMatch) {
			let left = padding + updatePos(18) + 1;
			let top = currentTop() - 8;
			icons.push(request({
				url: iconMatch[1],
				encoding: null
			}).then(src => {
				let img = new Image();
				img.src = src;
				to.drawImage(img, left, top, 16, 16);
			}));
			continue;
		}

		let size = to.measureText(token).width;
		let left = padding + updatePos(size);
		to.fillText(token, left, currentTop());

		if (currentLine >= 20) break
	}

	let w = fullWidth + 2 * padding;
	let h = currentLine * lineHeight + 2 * padding;

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
		fs.writeFile(path.join(__dirname, '../data/spoilers', id + '.txt'), content, err => {
			if (err) return res('');
			res('http://bbbbot.pause-geek.fr/spoilers/' + id + '.txt');
		});
	});
	// return request.post({
	// 	url: 'https://pastebin.com/api/api_post.php',
	// 	form: {
	// 		api_option: 'paste',
	// 		api_dev_key: config.pastebinKey,
	// 		api_paste_code: content,
	// 		api_paste_name: 'Spoiler',
	// 		api_paste_private: 1,
	// 		api_paste_expire_date: 'N',
	// 		api_paste_format: 'text',
	// 		api_user_key: ''
	// 	}
	// }).then(res => {
	// 	if (!res.startsWith('http')) {
	// 		console.log('Error uploading to pastebin', res);
	// 		return '';
	// 	}
	// 	return res;
	// }).catch(e => '');
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