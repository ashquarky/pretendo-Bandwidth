const Discord = require('discord.js');
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('@discordjs/builders');

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function pollHandler(interaction) {
	const name = interaction.options.getString('name');
	const optionsCount = interaction.options.getInteger('options-count');
	const expiryTime = interaction.options.getInteger('expiry-time') || 0;

	const createPollModal = new ModalBuilder();
	createPollModal.setCustomId(`create-poll-${name}-${optionsCount}-${expiryTime}`);
	createPollModal.setTitle('Create a poll');

	for (let i = 0; i < optionsCount; i++) {
		const optionTextInput = new TextInputBuilder();
		optionTextInput.setCustomId(`poll-option-${i}`);
		optionTextInput.setStyle(Discord.TextInputStyle.Short);
		optionTextInput.setLabel(`Option ${i}`);
		optionTextInput.setPlaceholder('Option text');
		optionTextInput.setMaxLength(55);

		const optionActionRow = new ActionRowBuilder();
		optionActionRow.addComponents(optionTextInput);

		createPollModal.addComponents(optionActionRow);
	}

	interaction.showModal(createPollModal, {
		client: interaction.client,
		interaction: interaction
	});
	
	return;
}

const command = new SlashCommandBuilder();

command.setDefaultMemberPermissions(Discord.PermissionFlagsBits.Administrator);
command.setName('poll');
command.setDescription('Create a new poll');
command.addStringOption((option) => {
	option.setName('name');
	option.setDescription('question for poll');
	option.setRequired(true);
	option.setMaxLength(80);
	return option;
});
command.addIntegerOption((option) => {
	option.setName('options-count');
	option.setDescription('amount of options for poll');
	option.setRequired(true);
	option.setMinValue(2);
	option.setMaxValue(5);
	return option;
});
command.addIntegerOption((option) => {
	option.setName('expiry-time');
	option.setDescription('expiry time in unix time to seconds');
	option.setRequired(false);
	return option;
});

module.exports = {
	name: command.name,
	help: 'Edit polls',
	handler: pollHandler,
	deploy: command.toJSON(),
};
