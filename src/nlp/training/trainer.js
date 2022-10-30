const { NlpManager } = require('node-nlp');
const fs = require('fs-extra');
const config = require('../../../config.json');

async function train(manager) {
	if (!manager) {
		manager = new NlpManager(config.nlp.manager);
	}

	console.log('Adding training documents to NLP manager');

	const locales = await fs.readdir(`${__dirname}/data`);

	for (const locale of locales) {
		const trainingFiles = await fs.readdir(`${__dirname}/data/${locale}`);

		for (const file of trainingFiles) {
			const trainingData = await fs.readJSON(`${__dirname}/data/${locale}/${file}`);

			for (const utterance of trainingData.utterances) {
				manager.addDocument(locale, utterance, trainingData.intent);
			}

			manager.addAnswer(locale, trainingData.intent, trainingData.answer);
		}
	}

	console.log('Training NLP model');

	await manager.train();
	manager.save(`${__dirname}/model.nlp`);
}

if (require.main === module) {
	// * Ran from CLI
	train();
}

module.exports = {
	train
};