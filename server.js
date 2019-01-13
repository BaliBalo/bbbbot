const path = require('path');
const config = require('./config.json');
const Discord = require('discord.js');
const discordUtils = require('./utils/discord');
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
		let options = message.content.slice(5).split(',').map(e => {
			return discordUtils.getDisplay(message, e.trim());
		}).filter(e => e);
		return spin(options, message);
	}
	if (message.content.startsWith('!bigcheh')) {
		return message.channel.send('🇨 🇭 🇪 🇭')
			.then(() => message.react('🇨'))
			.then(() => message.react('🇭'))
			.then(() => message.react('🇪'))
			.then(() => message.react('🏩'));
	}

	// if (message.content === 'ping') {
	// 	message.reply('pong');
	// }
});

client.login(config.discordToken);

const express = require('express');
const app = express();

function membersObject(membersCollection) {
	return membersCollection.reduce((obj, val, key) => {
		obj[key] = {
			id: val.user.id,
			displayName: val.displayName,
			roles: val.roles.array().map(role => ({
				id: role.id,
				color: role.hexColor,
				createdAt: role.createdTimestamp,
				name: role.name
			})),
			avatar: val.user.avatarURL,
			bot: val.user.bot,
			username: val.user.username,
			discriminator: val.user.discriminator
		};
		return obj;
	}, {});
}

app.use('/spoilers', express.static(path.join(__dirname, 'data/spoilers')));
app.use('/users', (req, res) => res.send(membersObject(client.guilds.get(config.guild).members)));

const server = app.listen(3000, () => {
	console.log(ts(), 'Server running');
});
