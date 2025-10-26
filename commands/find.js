const { hasPermission } = require('../utils/permissions');
const { EmbedBuilder } = require('discord.js');

async function sendTempEmbed(message, content, delay = 3000) {
    const embed = new EmbedBuilder()
        .setDescription(content)
        .setColor('#2F3136')
        .setTimestamp();
    
    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), delay);
    return msg;
}

module.exports = {
    name: 'find',
    description: 'Trouve un membre dans les salons vocaux',
    async execute(client, message, args) {
        if (!await hasPermission(message.author, 'find', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, "**Usage:** `=find <@user/ID>`", 5000);
        }

        const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

        if (!targetUser) {
            return sendTempEmbed(message, "❌ Utilisateur introuvable", 3000);
        }

        const voiceChannel = targetUser.voice.channel;

        if (!voiceChannel) {
            return sendTempEmbed(message, "❌ Cet utilisateur n'est dans aucun salon vocal", 3000);
        }

        const membersInChannel = voiceChannel.members.map(member => 
            `• ${member.user.tag} ${member.user.bot ? '(🤖 Bot)' : ''}`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('MEMBRE TROUVÉ')
            .setDescription(`${targetUser.user.tag} se trouve dans le salon vocal :`)
            .addFields(
                { name: 'SALON', value: `${voiceChannel.name} (\`${voiceChannel.id}\`)`, inline: true },
                { name: 'MEMBRES DANS LE SALON', value: `**${voiceChannel.members.size}** membre(s) présent(s)`, inline: true },
                { name: 'LISTE DES MEMBRES', value: membersInChannel || 'Aucun autre membre' }
            )
            .setColor('#2F3136')
            .setTimestamp()
            .setFooter({ 
                text: `Demandé par ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        await message.channel.send({ embeds: [embed] });
    }
};