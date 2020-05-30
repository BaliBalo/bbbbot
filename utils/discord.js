
// Get the displayable text version of a message
//   - replaces user mentions by @user
//   - replaces user mentions by #channel
//   - replaces emote mentions by :emote:
function getDisplay(message, content, useIcons) {
	if (content == undefined) {
		content = message.content;
	}
	return content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => {
			let guildMember = message.mentions.members.get(id);
			let replacement = '@' + guildMember.displayName;
			let avatar = guildMember.user.avatarURL({ format: 'png' });
			if (useIcons && avatar) {
				replacement = '[[icon=' + avatar + ']] ' + replacement;
			}
			return replacement;
		})
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name)
		.replace(/<:([^: ]+):(\d+)>/g, (m, name, id) => useIcons ? '[[icon=https://cdn.discordapp.com/emojis/' + id + '.png]]' : ':' + name + ':');
}

module.exports = {
	getDisplay
};
