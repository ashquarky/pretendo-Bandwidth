const Discord = require('discord.js');
const nlpManager = require('./nlp/manager');
const readyHandler = require('./events/ready');
const guildMemberAddHandler = require('./events/guildMemberAdd');
const interactionCreateHandler = require('./events/interactionCreate');
const messageCreateHandler = require('./events/messageCreate');
const config = require('../config.json');

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.GuildMembers,
		Discord.GatewayIntentBits.MessageContent,
	]
});

client.nlpManager = nlpManager;

client.buttons = new Discord.Collection();
client.commands = new Discord.Collection();
client.contextMenus = new Discord.Collection();
client.modals = new Discord.Collection();
client.selectMenus = new Discord.Collection();

client.on(Discord.Events.ClientReady, readyHandler);
client.on(Discord.Events.GuildMemberAdd, guildMemberAddHandler);
client.on(Discord.Events.InteractionCreate, interactionCreateHandler);
client.on(Discord.Events.MessageCreate, messageCreateHandler);

client.login(config.bot_token);