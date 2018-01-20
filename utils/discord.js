
// Get the displayable text version of a message
//   - replaces user mentions by @user
//   - replaces user mentions by #channel
//   - replaces emote mentions by :emote:
function getDisplay(message, content) {
	if (content == undefined) {
		content = message.content;
	}
	return content
		.replace(/<@!?(1|\d{17,19})>/g, (m, id) => '@' + message.mentions.members.get(id).displayName)
		.replace(/<#(\d{17,19})>/g, (m, id) => '#' + message.mentions.channels.get(id).name)
		.replace(/<:([^: ]+):\d+>/g, (m, name) => ':' + name + ':');
}

module.exports = {
	getDisplay
};
