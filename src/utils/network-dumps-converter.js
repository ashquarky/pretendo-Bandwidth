const path = require('node:path');
const util = require('node:util');
const { exec } = require('node:child_process');
const querystring = require('node:querystring');
const Discord = require('discord.js');
const fs = require('fs-extra');
const axios = require('axios');

const execPromise = util.promisify(exec);

// TODO - Are there more headers to scrub?
const HEADERS_TO_SCRUB = [
	'authorization',
	'x-nintendo-serial-number',
	'x-nintendo-device-cert',
	'x-nintendo-servicetoken',
];

/**
 *
 * @param {Discord.Message} message
 */
async function networkDumpsConverter(message) {
	const filesToRemove = [];

	// * Check if the message has any proxy dumps
	// * Charles technically supports pcap dumps too but I've never gotten them to work
	const networkDumps = [...message.attachments.filter(attachment => {
		const fileExtension = path.extname(attachment.name.toLowerCase());
		if (
			fileExtension === '.har' ||   // * HTTP Archive dump
			fileExtension === '.chls' ||  // * Charles session
			fileExtension === '.chlsj' || // * Charles JSON summary
			fileExtension === '.chlsx' || // * Charles XML summary
			fileExtension === '.saz'      // * Fiddler session
		) {
			return attachment;
		}
	}).values()];

	if (networkDumps.length === 0) {
		return;
	}

	const attachmentsToConvert = [];

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

		attachmentsToConvert.push(attachment);
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
		}

		return {
			name: type,
			value: attachment.name
		};
	}));

	await message.channel.send({
		content: `<@${message.author.id}> I have detected the following network dumps in your message. For security reasons, your dumps will be scrubbed of user information. Your message will be deleted until this process is complete`,
		embeds: [embed],
		ephemeral: true
	});

	await message.delete();

	const convertedNetworkDumps = [];

	await fs.ensureDir(`${__dirname}/../../network-dumps-tmp`);

	// * Convert and process the downloaded dumps
	// * This can be slow
	for (const attachment of attachmentsToConvert) {
		const fileExtension = path.extname(attachment.name.toLowerCase());
		const downloadPath = `${__dirname}/../../network-dumps-tmp/${attachment.id}${fileExtension}`;

		const charlesJSONSummaryPath = `${__dirname}/../../network-dumps-tmp/${attachment.id}.chlsj`;

		filesToRemove.push(charlesJSONSummaryPath);

		if (fileExtension !== '.chlsj') {
			await execPromise(`charles convert ${downloadPath} ${charlesJSONSummaryPath}`);
		}

		const charlesJSONSummary = await fs.readJSON(charlesJSONSummaryPath);

		// TODO - Are there more requests/responses to scrub?
		for (const { request, response, path: requestPath } of charlesJSONSummary) {
			for (const header of request.header.headers) {
				if (HEADERS_TO_SCRUB.includes(header.name.toLowerCase())) {
					header.value = 'REMOVED';
				}
			}

			for (const header of response.header.headers) {
				if (HEADERS_TO_SCRUB.includes(header.name.toLowerCase())) {
					header.value = 'REMOVED';
				}
			}

			// * Remove NNID/PNID password and refresh token from request
			// * Remove access and refresh token from response
			if (requestPath === '/v1/api/oauth20/access_token/generate') {
				const newRequestBody = querystring.parse(request.body.text);

				if (newRequestBody.password) {
					newRequestBody.password = 'REMOVED';
				}

				if (newRequestBody.refresh_token) {
					newRequestBody.refresh_token = 'REMOVED';
				}

				request.body.text = querystring.stringify(newRequestBody);

				response.body.text = response.body.text.replace(/<token>.*<\/token>/, '<token>REMOVED</token>');
				response.body.text = response.body.text.replace(/<refresh_token>.*<\/refresh_token>/, '<refresh_token>REMOVED</refresh_token>');
			}

			// * Remove birthday and email address from account details
			if (requestPath === '/v1/api/people/@me/profile') {
				response.body.text = response.body.text.replace(/<address>.*<\/address>/, '<address>removed@email.com</address>');
				response.body.text = response.body.text.replace(/<birth_date>.*<\/birth_date>/, '<birth_date>YYYY-MM-DD</birth_date>');
			}

			// * Remove service token
			if (requestPath === '/v1/api/provider/service_token/@me') {
				response.body.text = response.body.text.replace(/<token>.*<\/token>/, '<token>REMOVED</token>');
			}

			// * Remove NEX token and password
			if (requestPath === '/v1/api/provider/nex_token/@me') {
				response.body.text = response.body.text.replace(/<token>.*<\/token>/, '<token>REMOVED</token>');
				response.body.text = response.body.text.replace(/<nex_password>.*<\/nex_password>/, '<nex_password>REMOVED</nex_password>');
			}
		}

		await fs.writeFile(charlesJSONSummaryPath, JSON.stringify(charlesJSONSummary));

		const harPath = `${__dirname}/../../network-dumps-tmp/${attachment.id}.har`;

		filesToRemove.push(harPath);

		await execPromise(`charles convert ${charlesJSONSummaryPath} ${harPath}`);

		const oldFileName = attachment.url.split('/').pop();
		const fileNameParts = oldFileName.split('.');

		fileNameParts.pop();
		fileNameParts.push('har');

		convertedNetworkDumps.push({
			attachment: harPath,
			name: fileNameParts.join('.')
		});
	}

	const embeds = [];

	if (message.content) {
		const embed = new Discord.EmbedBuilder();
		embed.setColor(0x00FF22);
		embed.setAuthor({
			iconURL: message.author.displayAvatarURL(),
			name: message.author.username
		});
		embed.setDescription(message.content);

		embeds.push(embed);
	}

	await message.channel.send({
		content: `<@${message.author.id}> Uploaded network dumps. For security reasons, the original message has been deleted and scrubbed versions of the dumps are attached below. All dumps have been converted to HAR for standardization`,
		embeds: embeds,
		files: convertedNetworkDumps
	});

	// * Clean up
	for (const file of filesToRemove) {
		if (await fs.exists(file)) {
			await fs.remove(file);
		}
	}
}

module.exports = {
	networkDumpsConverter
};