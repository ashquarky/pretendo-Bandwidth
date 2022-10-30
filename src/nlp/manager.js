const { NlpManager } = require('node-nlp');
const config = require('../../config.json');

module.exports = new NlpManager(config.nlp.manager);