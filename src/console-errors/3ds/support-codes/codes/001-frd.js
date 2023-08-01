const SupportCode = require('../../../common/support-code');

module.exports = {
	'0102': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'0112': new SupportCode('Missing name', 'Missing description', 'Unable to connect to the server.\nPlease try again later', 'Missing fix', 'Missing link'),
	'0302': new SupportCode('Missing name', 'Missing description', 'Unable to connect to the server.\nPlease try again later.\n\nFor help, visit support.nintendo.com', 'Missing fix', 'Missing link'),
	'0718': new SupportCode('Missing name', 'Missing description', 'Your friend list is full.\n\nYou cannot add any\nadditional friends', 'Missing fix', 'Missing link'),
	'0720': new SupportCode('Missing name', 'Missing description', 'An error has occurred.\nTurn off the power and try again.\n\nFor help, visit support.nintendo.com', 'Missing fix', 'Missing link'),
	'0721': new SupportCode('Missing name', 'Missing description', 'Online Interaction is restricted by\nParental Controls', 'Missing fix', 'Missing link'),
	'0724': new SupportCode('Missing name', 'Missing description', 'You have not yet created\na Personal Mii.\n\nCreate a Personal Mii\nusing Mii Maker', 'Missing fix', 'Missing link'),
	'0725': new SupportCode('Missing name', 'Missing description', 'Friend Registration is restricted by\nParental Controls', 'Missing fix', 'Missing link'),
	'0726': new SupportCode('Missing name', 'Missing description', 'You have not yet configured your\nnotification settings for friends.\n\nConfigure these settings in the\nfriend list', 'Missing fix', 'Missing link'),
	'0803': new SupportCode('Missing name', 'Missing description', 'Missing message', 'Missing fix', 'Missing link'),
	'0811': new SupportCode('Missing name', 'Missing description', 'The server is currently undergoing\nmaintenance. We apologize for any\ninconvenience. Please try again later.\n\nTo learn more about maintenance,\nvisit support.nintendo.com', 'Missing fix', 'Missing link'),
};
