const path = require('node:path');
const Discord = require('discord.js');
const fs = require('fs-extra');
const axios = require('axios');
const database = require('../database');

const HOKAKU_CAFE_TOKEN_BIN_REGEX = /nexServiceToken-\d*-[A-z0-9]*\.bin/;

/**
 *
 * @param {Discord.Message} message
 */
async function networkDumpsUploader(message) {
	try {
		const developerRoleId = await database.getGuildSetting(message.guild.id, 'developer_role_id');

		if (message.member.roles.cache.has(developerRoleId)) {
			// * Ignore developer uploads
			return;
		}

		let hasHokakuCafeBin = false;
		let hasPCAP = false;

		// * Check if the message has any proxy dumps
		// * Charles technically supports pcap dumps too but I've never gotten them to work
		const networkDumps = [...message.attachments.filter(attachment => {
			const fileExtension = path.extname(attachment.name.toLowerCase());

			if (
				fileExtension === '.har' ||   // * HTTP Archive dump
				fileExtension === '.chls' ||  // * Charles session
				fileExtension === '.chlsj' || // * Charles JSON summary
				fileExtension === '.chlsx' || // * Charles XML summary
				fileExtension === '.saz' ||   // * Fiddler session
				fileExtension === '.pcap' ||  // * PCAP
				fileExtension === '.pcapng'   // * PCAPNG
			) {
				if (fileExtension === '.pcap' || fileExtension === '.pcapng') {
					hasPCAP = true;
				}

				return attachment;
			}

			if (attachment.name.match(HOKAKU_CAFE_TOKEN_BIN_REGEX)) {
				hasHokakuCafeBin = true;
				return attachment;
			}
		}).values()];

		if (networkDumps.length === 0) {
			return;
		}

		if (message.content.trim() === '') {
			await message.reply({
				content: 'I have detected network dumps to be uploaded, but no message content. Message content is crucial to add context to network dumps. Please reupload the dumps with a detailed message as to what happened in the session'
			});

			await message.delete();

			return;
		}

		await fs.ensureDir(`${__dirname}/../../network-dumps-tmp`);

		const filesToRemove = [];
		const attachmentsToUpload = [];

		// * Download all the dumps
		for (const attachment of networkDumps) {
			const fileExtension = path.extname(attachment.name.toLowerCase());
			const downloadPath = `${__dirname}/../../network-dumps-tmp/${attachment.id}${fileExtension}`;

			filesToRemove.push(downloadPath);

			const response = await axios({
				method: 'get',
				url: attachment.url,
				responseType: 'stream'
			});

			await new Promise((resolve, reject) => {
				const writeStream = fs.createWriteStream(downloadPath);
				response.data.on('end', resolve);
				writeStream.on('error', reject);

				response.data.pipe(writeStream);
			});

			attachmentsToUpload.push(attachment);
		}

		const embed = new Discord.EmbedBuilder();
		embed.setColor(0x00FF22);
		embed.setFields(networkDumps.map(attachment => {
			const fileExtension = path.extname(attachment.name.toLowerCase());
			let type = '';

			switch (fileExtension) {
				case '.har':
					type = 'HAR (HTTP Archive dump)';
					break;
				case '.chls':
					type = 'chls (Charles session)';
					break;
				case '.chlsj':
					type = 'chlsj (Charles JSON summary)';
					break;
				case '.chlsx':
					type = 'chlsx (Charles XML summary)';
					break;
				case '.saz':
					type = 'saz (Fiddler session)';
					break;
				case '.pcap':
					type = 'PCAP (Network dump)';
					break;
				case '.pcapng':
					type = 'PCAPNG (Network dump)';
					break;
				case '.bin':
					type = 'BIN (HokakuCafe bin)';
					break;
			}

			return {
				name: type,
				value: attachment.name
			};
		}));

		const attachments = [];

		// * Convert and process the downloaded dumps
		// * This can be slow
		for (const attachment of attachmentsToUpload) {
			const fileExtension = path.extname(attachment.name.toLowerCase());
			const downloadPath = `${__dirname}/../../network-dumps-tmp/${attachment.id}${fileExtension}`;

			attachments.push({
				attachment: downloadPath,
				name: attachment.name
			});

			filesToRemove.push(downloadPath);
		}

		const embeds = [];

		if (message.content) {
			const embed = new Discord.EmbedBuilder();
			embed.setColor(0x00FF22);
			embed.setAuthor({
				iconURL: message.author.displayAvatarURL(),
				name: message.author.username
			});
			embed.setTitle('Message Body');
			embed.setDescription(message.content);

			embeds.push(embed);
		}

		const uploadedDumpsChannelId = await database.getGuildSetting(message.guild.id, 'uploaded_network_dumps_channel_id');
		const uploadedDumpsChannel = message.guild.channels.cache.get(uploadedDumpsChannelId);

		if (!uploadedDumpsChannel) {
			await message.reply({
				content: 'I have detected network dumps to be uploaded, but the channel to submit them to has not been found. Please contact a developer immediately. Your message has been deleted for security reasons.'
			});

			await message.delete();

			return;
		}

		await uploadedDumpsChannel.send({
			content: `<@${message.author.id}> Uploaded network dumps. For security reasons, the original message has been deleted and the dumps are attached below`,
			embeds: embeds,
			files: attachments
		});

		// * Clean up
		for (const file of filesToRemove) {
			if (await fs.exists(file)) {
				await fs.remove(file);
			}
		}

		let replyContent = `<@${message.author.id}> I have detected the following network dumps in your message. This message and it's dumps have been forwarded to developers. For security reasons, your original message has been deleted. If this was done in error, ping a developer to have your dumps removed`;

		if (hasPCAP && !hasHokakuCafeBin) {
			replyContent += '\n\n## Potential Error\nI have also detected a PCAP(NG) dump was uploaded, but no HokakuCafe bin was uploaded. If using HokakuCTR, you may disregard this error. When using HokakuCafe, the associated bin file is required to decrypt the network traffic. If you are uploaded a HokakuCafe dump, please check your HokakuCafe folder for the associated bin file. It will be in the format "nexServiceToken-AAAAAAAAAA-BBBBBBBB.bin"';
		}

		await message.reply({
			content: replyContent,
			embeds: [embed]
		});

		await message.delete();
	} catch (error) {
		console.log(error);

		await message.reply({
			content: 'I have detected network dumps to be uploaded, but there was an error submitting them. Please contact a developer immediately. Your message has been deleted for security reasons.'
		});

		await message.delete();
	}
}

module.exports = {
	networkDumpsUploader
};