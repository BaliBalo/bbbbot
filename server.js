const config = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

const spoiler = require('scripts/spoiler.js');

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
	// if (message.content === '!mixu') {
	//
	// }
	if (message.content.startsWith('!spoiler')) {
		let content = message.content.slice(9).trim();
		return spoiler(message, content);
	}

	// if (message.content === 'ping') {
	// 	message.reply('pong');
	// }
});

client.login(config.discordToken);
