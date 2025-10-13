// utils/messageUtils.js
function replyTemp(message, content, delay = 3000) {
    return message.channel.send(content)
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), delay));
}

module.exports = { replyTemp };
