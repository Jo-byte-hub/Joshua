// Antilink Function 
const linkRegex = /https?:\/\/[^\s]+/gi;

// Sample in-memory group config
const antilinkGroups = {
  '1234567890-123456@g.us': {
    enabled: true,
    action: 'kick', // options: 'delete', 'warn', 'kick'
  },
  // Add more groups as needed
};

async function handleAntiLink(message, sock) {
  try {
    const { key, message: msgContent } = message;

    const isGroup = key.remoteJid.endsWith('@g.us');
    if (!isGroup) return;

    const groupId = key.remoteJid;
    const groupConfig = antilinkGroups[groupId];

    if (!groupConfig?.enabled) return;

    const from = key.participant;
    const textMsg = msgContent?.conversation ||
                    msgContent?.extendedTextMessage?.text ||
                    msgContent?.imageMessage?.caption ||
                    msgContent?.videoMessage?.caption ||
                    '';

    if (!textMsg || !linkRegex.test(textMsg)) return;

    // Get group metadata to check admin status
    const groupMetadata = await sock.groupMetadata(groupId);
    const senderIsAdmin = groupMetadata.participants.some(p =>
      p.id === from && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (senderIsAdmin) return; // Admins can post links

    // Perform action
    switch (groupConfig.action) {
      case 'delete':
        await sock.sendMessage(groupId, { delete: key });
        break;

      case 'warn':
        await sock.sendMessage(groupId, {
          text: `⚠️ @${from.split('@')[0]}, sending links is not allowed in this group.`,
          mentions: [from],
        });
        break;

      case 'kick':
        await sock.sendMessage(groupId, {
          text: `🚫 @${from.split('@')[0]} has been removed for sending a link.`,
          mentions: [from],
        });
        await sock.groupParticipantsUpdate(groupId, [from], 'remove');
        break;
    }

  } catch (err) {
    console.error('❌ Error in AntiLink:', err);
  }
}
