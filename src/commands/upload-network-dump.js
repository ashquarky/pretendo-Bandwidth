const path = require('node:path');
const Discord = require('discord.js');
const database = require('../database');
const { SlashCommandBuilder } = require('@discordjs/builders');

const HOKAKU_CAFE_DEFAULT_PCAP_NAME_REGEX = /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(?:pcapng|pcap)/;
const HOKAKU_CAFE_BIN_NAME_REGEX = /nexServiceToken-\d{10}-[\dA-f]{8}\.bin/;
const HOKAKU_CTR_DEFAULT_PCAP_NAME_REGEX = /\d{6}_\d{6}\.(?:pcapng|pcap)/;
const MITMPROXY_NINTENDO_DEFAULT_NAME_REGEX = /(?:wiiu|3ds)-latest\.har/;

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function uploadNetworkDumpHandler(interaction) {
	const description = interaction.options.getString('description');
	if (description.trim().length < 10) {
		await interaction.reply({
			content: 'Please use a longer description',
			ephemeral: true
		});

		return;
	}

	const subcommand = interaction.options.getSubcommand();
	let result;

	switch (subcommand) {
		case 'hokakucafe':
			result = await hokakuCafeHandler(interaction);
			break;
		case 'hokakuctr':
			result = await hokakuCTRHandler(interaction);
			break;
		case 'pcap':
			result = await hokakuPCAPHandler(interaction);
			break;
		case 'http':
			result = await proxyHandler(interaction);
			break;
		default:
			throw new Error(`Unhandled subcommand ${subcommand}`);
	}

	if (!result) {
		return;
	}

	const uploadedDumpsChannelId = await database.getGuildSetting(interaction.guildId, 'uploaded_network_dumps_channel_id');
	const uploadedDumpsChannel = interaction.guild.channels.cache.get(uploadedDumpsChannelId);

	if (!uploadedDumpsChannel) {
		await interaction.reply({
			content: 'The channel to submit them to has not been found. Please contact a developer immediately.',
			ephemeral: true
		});

		return;
	}

	try {
		await uploadedDumpsChannel.send({
			content: result.message,
			files: result.attachments.map((attachment) => ({
				attachment: attachment.url,
				name: attachment.name,
			}))
		});
	} catch (error) {
		await interaction.reply({
			content: `There was an error uploading your dumps. Please contact a developer immediately.\n\n${error}`,
			ephemeral: true
		});

		return;
	}

	await interaction.reply({
		content: 'Thank you for the submission!',
		ephemeral: true
	});
}

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function hokakuCafeHandler(interaction) {
	const dump = interaction.options.getAttachment('dump');
	const bin = interaction.options.getAttachment('bin');
	const description = interaction.options.getString('description');

	const dumpFileExtension = path.extname(dump.name.toLowerCase());

	if (dumpFileExtension !== '.pcap' && dumpFileExtension !== '.pcapng') {
		await interaction.reply({
			content: `Invalid dump file type. Expected pcap/pcapng, got ${dumpFileExtension}`,
			ephemeral: true
		});

		return;
	}

	if (dump.name.match(HOKAKU_CAFE_DEFAULT_PCAP_NAME_REGEX)) {
		await interaction.reply({
			content: 'Uses default HokakuCafe pcap file name. Please change the name to something more descriptive',
			ephemeral: true
		});

		return;
	}

	if (!bin.name.match(HOKAKU_CAFE_BIN_NAME_REGEX)) {
		await interaction.reply({
			content: 'BIN file appears to be invalid. Name should be in the format "nexServiceToken-1234567890-12345678.bin", where "1234567890" is your NEX username (PID) and "12345678" is the last 8 characters of the title ID for the title',
			ephemeral: true
		});

		return;
	}

	if (bin.size !== 604) {
		await interaction.reply({
			content: `BIN file appears to be invalid. Bad size. Should be 604 bytes, got ${bin.size} bytes`,
			ephemeral: true
		});

		return;
	}

	return {
		attachments: [
			dump,
			bin
		],
		message: `<@${interaction.member.id}> Uploaded a HokakuCafe dump: \n\n${description}`
	};
}

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function hokakuCTRHandler(interaction) {
	const dump = interaction.options.getAttachment('dump');
	const description = interaction.options.getString('description');

	const dumpFileExtension = path.extname(dump.name.toLowerCase());

	if (dumpFileExtension !== '.pcap') {
		await interaction.reply({
			content: `Invalid dump file type. Expected pcap, got ${dumpFileExtension}`,
			ephemeral: true
		});

		return;
	}

	if (dump.name.match(HOKAKU_CTR_DEFAULT_PCAP_NAME_REGEX)) {
		await interaction.reply({
			content: 'Uses default HokakuCTR pcap file name. Please change the name to something more descriptive',
			ephemeral: true
		});

		return;
	}

	return {
		attachments: [
			dump
		],
		message: `<@${interaction.member.id}> Uploaded a HokakuCTR dump: \n\n${description}`
	};
}

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function hokakuPCAPHandler(interaction) {
	const dump = interaction.options.getAttachment('dump');
	const username = interaction.options.getInteger('username');
	const password = interaction.options.getString('password');
	const description = interaction.options.getString('description');

	const dumpFileExtension = path.extname(dump.name.toLowerCase());

	if (dumpFileExtension !== '.pcap' && dumpFileExtension !== '.pcapng') {
		await interaction.reply({
			content: `Invalid dump file type. Expected pcap/pcapng, got ${dumpFileExtension}`,
			ephemeral: true
		});

		return;
	}

	if (password.length !== 16) {
		await interaction.reply({
			content: 'Invalid password size. Passwords are 16 characters long',
			ephemeral: true
		});

		return;
	}

	return {
		attachments: [
			dump
		],
		message: `<@${interaction.member.id}> Uploaded a WireShark PCAP: ${username}:${password}\n\n${description}`
	};
}

/**
 *
 * @param {Discord.CommandInteraction} interaction
 */
async function proxyHandler(interaction) {
	const dump = interaction.options.getAttachment('dump');
	const description = interaction.options.getString('description');

	const dumpFileExtension = path.extname(dump.name.toLowerCase());

	if (
		dumpFileExtension !== '.har' &&   // * HTTP Archive dump
		dumpFileExtension !== '.chls' &&  // * Charles session
		dumpFileExtension !== '.chlsj' && // * Charles JSON summary
		dumpFileExtension !== '.chlsx' && // * Charles XML summary
		dumpFileExtension !== '.saz'      // * Fiddler session
	) {
		await interaction.reply({
			content: `Invalid dump file type. Expected har/chls/chlsj/chlsx/saz, got ${dumpFileExtension}`,
			ephemeral: true
		});

		return;
	}

	if (dump.name.match(MITMPROXY_NINTENDO_DEFAULT_NAME_REGEX)) {
		await interaction.reply({
			content: 'Uses default mitmproxy-nintendo capture name. Please change the name to something more descriptive',
			ephemeral: true
		});

		return;
	}

	return {
		attachments: [
			dump
		],
		message: `<@${interaction.member.id}> Uploaded a HTTP proxy dump: \n\n${description}`
	};
}

const command = new SlashCommandBuilder();

command.setDefaultMemberPermissions(Discord.PermissionFlagsBits.SendMessages);
command.setName('upload-network-dump');
command.setDescription('Upload network dumps');
command.addSubcommand((cmd) => {
	cmd.setName('hokakucafe');
	cmd.setDescription('Upload a dump made with HokakuCafe');
	cmd.addAttachmentOption((option) => {
		option.setName('dump');
		option.setDescription('The HokakuCafe PCAP');
		option.setRequired(true);

		return option;
	});
	cmd.addAttachmentOption((option) => {
		option.setName('bin');
		option.setDescription('The bin file created by HokakuCafe');
		option.setRequired(true);

		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('description');
		option.setDescription('Detailed description of what happened during the session');
		option.setRequired(true);

		return option;
	});

	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('hokakuctr');
	cmd.setDescription('Upload a dump made with HokakuCTR');
	cmd.addAttachmentOption((option) => {
		option.setName('dump');
		option.setDescription('The HokakuCTR PCAP');
		option.setRequired(true);

		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('description');
		option.setDescription('Detailed description of what happened during the session');
		option.setRequired(true);

		return option;
	});

	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('pcap');
	cmd.setDescription('Upload a PCAP(NG) made with tools like WireShark');
	cmd.addAttachmentOption((option) => {
		option.setName('dump');
		option.setDescription('The PCAP(NG)');
		option.setRequired(true);

		return option;
	});
	cmd.addIntegerOption((option) => {
		option.setName('username');
		option.setDescription('NEX username (PID)');
		option.setRequired(true);

		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('password');
		option.setDescription('NEX password');
		option.setRequired(true);

		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('description');
		option.setDescription('Detailed description of what happened during the session');
		option.setRequired(true);

		return option;
	});

	return cmd;
});
command.addSubcommand((cmd) => {
	cmd.setName('http');
	cmd.setDescription('Upload a dump made with a proxy server');
	cmd.addAttachmentOption((option) => {
		option.setName('dump');
		option.setDescription('HTTP proxy dump');
		option.setRequired(true);

		return option;
	});
	cmd.addStringOption((option) => {
		option.setName('description');
		option.setDescription('Detailed description of what happened during the session');
		option.setRequired(true);

		return option;
	});

	return cmd;
});

module.exports = {
	name: command.name,
	help: 'Upload network dump for development use',
	handler: uploadNetworkDumpHandler,
	deploy: command.toJSON(),
};
