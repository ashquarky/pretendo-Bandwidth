const Discord = require('discord.js');

/**
 * 
 * @param {Discord.ModalSubmitInteraction} interaction
 */
async function modalSubmitHandler(interaction) {
	const { customId } = interaction;

	const modals = interaction.client.modals;
	const modal = modals.find(modal => customId.startsWith(modal.name)); // hack to be able to append extra metadata to modals

	// do nothing if no modal
	if (!modal) {
		throw new Error(`Missing modal handler for \`${customId}\``);
	}

	// run the modal
	await modal.handler(interaction);
}

module.exports = modalSubmitHandler;