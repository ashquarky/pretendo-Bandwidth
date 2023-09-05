const SupportCode = require('../../../common/support-code');

module.exports = {
	'0101': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'0102': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'0103': new SupportCode('Missing name', 'MLC Corruption error', 'There is a problem with the system memory.\nFor help, make a note of the error code and visit support.nintendo.com', 'Usually happens on 32gb Wii U models having a Hynix chip,\nthis chip has a problem that slowly corrupts its data overtime,\nthere is nothing much to do except backing up the MLC\and replacing the Hynix chip entierly.', 'Missing link'),
	'0104': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'0105': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'2706': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'2713': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
};
