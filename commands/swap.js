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
    name: 'swap',
    description: 'Échange deux membres entre leurs salons vocaux',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'swap', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 2) {
            return sendTempEmbed(message, `**Usage:** \`=swap <@user/ID> <@user/ID>\``, 5000);
        }

        // 🔹 Récupération des deux membres proprement
        const getMember = (input) => {
            return (
                message.mentions.members.find(m => m.id === input.replace(/[<@!>]/g, '')) ||
                message.guild.members.cache.get(input.replace(/[<@!>]/g, ''))
            );
        };

        const member1 = getMember(args[0]);
        const member2 = getMember(args[1]);

        if (!member1 || !member2) return sendTempEmbed(message, "❌ Utilisateurs introuvables", 3000);
        if (!member1.voice.channel || !member2.voice.channel) return sendTempEmbed(message, "❌ Les deux membres doivent être en vocal", 3000);
        if (member1.id === member2.id) return sendTempEmbed(message, "❌ Vous devez fournir deux utilisateurs différents", 3000);

        const channel1 = member1.voice.channel;
        const channel2 = member2.voice.channel;

        try {
            await member1.voice.setChannel(channel2);
            await member2.voice.setChannel(channel1);

            const embed = new EmbedBuilder()
                .setTitle('ÉCHANGE RÉUSSI')
                .setDescription(`🔄 ${member1.user.tag} et ${member2.user.tag} ont échangé leurs salons.`)
                .setColor('#2F3136')
                .setTimestamp();

            message.channel.send({ embeds: [embed] });

        } catch (err) {
            console.error('Swap Error:', err);
            return sendTempEmbed(message, "❌ Erreur lors de l’échange - Vérifiez les permissions", 3000);
        }
    }
};
