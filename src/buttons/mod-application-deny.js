const Discord = require('discord.js');
const db = require('../db');

const denyButton = new Discord.ButtonBuilder();
denyButton.setCustomId('mod-application-deny');
denyButton.setLabel('Deny');
denyButton.setStyle(Discord.ButtonStyle.Danger);

/**
 *
 * @param {Discord.ButtonInteraction} interaction
 */
async function modApplicationAcceptHandler(interaction) {
	await interaction.deferReply({
		ephemeral: true
	});

	const adminRoleId = db.getDB().get('roles.admin');

	if (!adminRoleId) {
		throw new Error('No admin role ID set!');
	}

	const hasdAdminRole = interaction.member.roles.cache.get(adminRoleId);

	if (!hasdAdminRole) {
		throw new Error('Only administrators have permission to accept/deny applications');
	}

	const { message } = interaction;
	const modApplicationEmbed = new Discord.EmbedBuilder(message.embeds[0].toJSON());
	const rowOld = message.components[0];
	const [acceptButtonOld, denyButtonOld] = rowOld.components;

	modApplicationEmbed.setColor(0xFF0000);
	modApplicationEmbed.setImage('attachment://denied-banner.png');
	modApplicationEmbed.setThumbnail('attachment://denied-icon.png');

	const acceptButtonNew = new Discord.ButtonBuilder(acceptButtonOld.toJSON());
	const denyButtonNew = new Discord.ButtonBuilder(denyButtonOld.toJSON());

	acceptButtonNew.setDisabled();
	denyButtonNew.setDisabled();

	const row = new Discord.ActionRowBuilder();
	row.addComponents(acceptButtonNew, denyButtonNew);

	await message.edit({
		embeds: [modApplicationEmbed],
		components: [row],
		files: [
			__dirname + '/../images/denied-icon.png',
			__dirname + '/../images/denied-banner.png',
		]
	});

	await interaction.editReply({
		content: 'Denied mod application',
		ephemeral: true
	});
}

module.exports = {
	name: denyButton.data.custom_id,
	button: denyButton,
	handler: modApplicationAcceptHandler
};