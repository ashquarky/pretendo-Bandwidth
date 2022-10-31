const path = require('path');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

let database;

async function connect() {
	database = await sqlite.open({
		filename: path.join(__dirname, '../database.db'),
		driver: sqlite3.Database
	});

	await database.exec(`CREATE TABLE IF NOT EXISTS server_settings (
		guild_id TEXT,
		admin_role_id TEXT,
		mod_applications_channel_id TEXT,
		reports_channel_id TEXT,
		readme_channel_id TEXT,
		rules_channel_id TEXT,
		stats_members_channel_id TEXT,
		stats_people_channel_id TEXT,
		stats_bots_channel_id TEXT,
		UNIQUE(guild_id)
	)`);

	await database.exec(`CREATE TABLE IF NOT EXISTS nlp_disabled (
		member_id TEXT
	)`);
}

async function initGuild(guildId) {
	await database.exec(`INSERT OR IGNORE INTO server_settings(guild_id) VALUES(${guildId})`);
}

async function getGuildSetting(guildId, name) {
	return (await database.get(`SELECT ${name} FROM server_settings WHERE guild_id=${guildId}`))[name];
}

async function updateGuildSetting(guildId, name, value) {
	await database.exec(`UPDATE server_settings SET ${name}=${value} WHERE guild_id=${guildId}`);
}

module.exports = {
	connect,
	initGuild,
	getGuildSetting,
	updateGuildSetting
};