const path = require('path');
const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

const spoiler = require('./scripts/spoiler');
const mixu = require('./scripts/mixu');
const spin = require('./scripts/spin');

let pad2 = n => ('0' + n).slice(-2);
let ts = (d = new Date()) => {
	let date = [d.getDate(), d.getMonth() + 1, d.getYear() % 100].map(pad2).join('/');
	let time = [d.getHours(), d.getMinutes()].map(pad2).join(':');
	return '[' + date + ' ' + time + ']';
};

client.on('ready', () => {
	console.log(ts(), 'Bot running');
});

client.on('message', message => {
	let spoilerMatch = message.content.match(/^!spoiler(\[([^\]]*)\])? /);
	if (spoilerMatch) {
		let title = spoilerMatch[2];
		let content = message.content.slice(spoilerMatch[0].length).trim();
		return spoiler(message, content, title);
	}
	if (message.content.startsWith('!mixu')) {
		return mixu(message);
	}
	if (message.content.startsWith('!spin')) {
		let options = message.content.slice(5).split(',').map(e => e.trim()).filter(e => e);
		return spin(options, message);
	}

	// if (message.content === 'ping') {
	// 	message.reply('pong');
	// }
});

client.login(config.discordToken);

const express = require('express');
const app = express();

app.use('/spoilers', express.static(path.join(__dirname, 'data/spoilers')));

const server = app.listen(3000, () => {
	console.log(ts(), 'Server running');
});
