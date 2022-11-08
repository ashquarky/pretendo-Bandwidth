const Discord = require('discord.js');
const { button: disableNLPButton } = require('../buttons/disable-nlp');
const { button: expandErrorButton } = require('../buttons/expand-error');
const checkForErrorCode = require('../utils/errorCode').checkForErrorCode;
const database = require('../database');

const ayyRegex = /\bay{1,}\b/gi;

/**
 *
 * @param {Discord.Message} message
 */
async function messageCreateHandler(message) {
	if (message.author.bot) return;

	// Check if the message is a command and handle it
	if (message.content === '.toggleupdates') {
		await message.reply('Looks like you tried to use a legacy command! Try our new slash commands by just typing '/'!');
		return;
	}

	// ayy => lmaoo
	if (ayyRegex.test(message.content)) {
		const lmaod = message.content.replaceAll(ayyRegex, (match) => {
			let newMatch = match.replaceAll('y', 'o').replaceAll('Y', 'O');
			newMatch = newMatch.replaceAll('a', 'lma').replaceAll('A', 'LMA');
			return newMatch;
		});

		// Check that the message isn't too long to be sent
		if (lmaod.length < 2000) {
			await message.reply({
				content: lmaod,
				allowedMentions: { parse: [] }
			});
		} else {
			await message.reply('Looks like the resulting message is too long :/');
		}

		return;
	}

	// * Check if automatic help is disabled
	const isHelpDisabled = await database.checkAutomaticHelpDisabled(message.guildId, message.member.id);

	if (isHelpDisabled) {
		// * Bail if automatic help is disabled
		return;
	}

	await tryAutomaticHelp(message);
}

/**
 *
 * @param {Discord.Message} message
 */
async function tryAutomaticHelp(message) {
	const errorCodeEmbed = checkForErrorCode(message.content);

	if (errorCodeEmbed) {
		// * Found an error/support code
		// * Send it and bail

		const row = new Discord.ActionRowBuilder();
		row.addComponents(expandErrorButton);
		
		const embed = new Discord.EmbedBuilder();
		embed.setColor(errorCodeEmbed.data.color);
		embed.setTitle(errorCodeEmbed.data.title);
		embed.setDescription('Support code detected, press to expand information');
		
		await message.reply({
			embeds: [embed],
			components: [row]
		});

		return;
	}

	// * NLP
	const response = await message.guild.client.nlpManager.process(message.content);

	if (response.intent === 'None' || response.score <= 0.7) {
		// * Do nothing if no intent found or if the bot is not very sure
		return;
	}

	let content = response.answer;

	content += '\n\n_This message was detected as needing help using machine learning, and responded to automatically. Was this done in error?\nIf you would like to stop receiving automatic help, use the `Disable Automatic Help` button below, or use the `/toggle-automatic-help` command_';

	row.addComponents(disableNLPButton);

	const messagePayload = {
		content: content,
		components: [row]
	};

	await message.reply(messagePayload);
}

module.exports = messageCreateHandler;
