import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/Database.js';
import { antiRaidManager } from '../utils/antiraid.js';
import { buildCustomEmbed } from '../utils/embedBuilder.js';
import { AnalyticsTracker } from '../utils/analytics-tracker.js';
import { accountAgeChecker } from '../utils/account-age-checker.js';
import { altDetector } from '../utils/alt-detector.js';

const event: BotEvent = {
  name: Events.GuildMemberAdd,

  async execute(member: GuildMember): Promise<void> {
    logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);

    const db = DatabaseManager.getInstance();
    const analytics = AnalyticsTracker.getInstance();

    db.createGuild(member.guild.id);
    db.createUser(member.user.id, member.user.tag);
    db.createGuildMember(member.guild.id, member.user.id);

    analytics.trackMemberJoin(member.guild.id);

    try {
      const newInvites = await member.guild.invites.fetch();
      const oldInvites = db.getInvites(member.guild.id) as any[];

      let inviterInfo: { inviterId: string | null; inviteCode: string | null } = { inviterId: null, inviteCode: null };

      for (const [code, newInvite] of newInvites) {
        const oldInvite = oldInvites.find(inv => inv.invite_code === code);
        if (oldInvite && newInvite.uses && newInvite.uses > oldInvite.uses) {
          inviterInfo = { inviterId: newInvite.inviter?.id || null, inviteCode: code };
          db.saveInvite(
            member.guild.id,
            code,
            newInvite.inviter?.id || null,
            newInvite.uses,
            newInvite.maxUses || null
          );
          break;
        }
      }

      db.saveMemberInvite(member.guild.id, member.id, inviterInfo.inviterId, inviterInfo.inviteCode);
    } catch (error) {
      logger.error('Failed to track invite usage', error);
    }

    await antiRaidManager.checkMemberJoin(member);

    const automodSettings = db.getAutomodSettings(member.guild.id) as any;

    if (automodSettings?.account_age_enabled) {
      const minDays = automodSettings.account_age_min_days || 7;
      const ageResult = accountAgeChecker.checkMember(member, minDays);

      if (!ageResult.isAllowed) {
        const action = automodSettings.account_age_action || 'kick';

        logger.info(`Account age check failed for ${member.user.tag} in ${member.guild.name}: ${ageResult.accountAgeDays} days (required: ${minDays})`);

        try {
          await accountAgeChecker.sendAccountAgeDM(member, minDays, ageResult.accountAgeDays);
        } catch (error) {
          logger.warn('Could not DM user about account age requirement');
        }

        if (action === 'kick') {
          await member.kick(`Account age requirement: ${minDays} days (account: ${ageResult.accountAgeDays} days)`);
        } else if (action === 'ban') {
          await member.ban({ reason: `Account age requirement: ${minDays} days (account: ${ageResult.accountAgeDays} days)` });
        }

        return;
      }
    }

    if (automodSettings?.alt_detection_enabled) {
      const sensitivity = automodSettings.alt_detection_sensitivity || 3;
      const detectionResult = await altDetector.checkMember(member, sensitivity);

      if (detectionResult.isSuspicious) {
        const guildConfig = db.getGuild(member.guild.id) as any;
        const logChannel = guildConfig?.mod_log_channel_id || guildConfig?.audit_log_channel_id;

        if (logChannel) {
          const channel = await member.guild.channels.fetch(logChannel).catch(() => null) as TextChannel | null;
          if (channel?.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(detectionResult.riskLevel === 'critical' ? 0xFF0000 : detectionResult.riskLevel === 'high' ? 0xFF6600 : 0xFFCC00)
              .setTitle('⚠️ Suspicious Account Detected')
              .setDescription(`**${member.user.tag}** has been flagged by alt detection`)
              .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'Risk Level', value: detectionResult.riskLevel.toUpperCase(), inline: true },
                { name: 'Score', value: `${detectionResult.score}/100`, inline: true },
                { name: 'Account Age', value: `${detectionResult.details.accountAgeDays} days`, inline: true },
                { name: 'Default Avatar', value: detectionResult.details.hasDefaultAvatar ? 'Yes' : 'No', inline: true },
                { name: 'Flags', value: detectionResult.flags.join(', ') || 'None', inline: false }
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();

            await channel.send({ embeds: [embed] });
          }
        }

        const action = automodSettings.alt_detection_action || 'warn';

        if (action === 'kick' && detectionResult.riskLevel === 'critical') {
          await member.kick(`Suspicious account detected (score: ${detectionResult.score})`);
          return;
        } else if (action === 'ban' && detectionResult.riskLevel === 'critical') {
          await member.ban({ reason: `Suspicious account detected (score: ${detectionResult.score})` });
          return;
        }
      }
    }

    const guildData = db.getGuild(member.guild.id) as any;

    if (!guildData || !guildData.welcome_enabled) {
      return;
    }

    if (guildData.auto_role_id) {
      try {
        const role = member.guild.roles.cache.get(guildData.auto_role_id);
        if (role) {
          const botMember = await member.guild.members.fetchMe();

          if (!botMember.permissions.has('ManageRoles')) {
            logger.warn(`Missing 'Manage Roles' permission in ${member.guild.name}`);
            return;
          }

          if (role.position >= botMember.roles.highest.position) {
            logger.warn(`Cannot assign role ${role.name} - it's higher than bot's highest role`);
            return;
          }

          await member.roles.add(role);
          logger.info(`Auto-assigned role ${role.name} to ${member.user.tag}`);
        }
      } catch (error) {
        logger.error('Failed to assign auto-role', error);
      }
    }

    const channelId = guildData.welcome_channel_id || member.guild.systemChannelId;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) return;

    try {
      if (guildData.welcome_embed) {
        const embedConfig = JSON.parse(guildData.welcome_embed);
        const welcomeEmbed = buildCustomEmbed(embedConfig, {
          user: member.user.toString(),
          userTag: member.user.tag,
          userAvatar: member.user.displayAvatarURL(),
          server: member.guild.name
        });

        await channel.send({ embeds: [welcomeEmbed] });
      } else {
        const message = (guildData.welcome_message || 'Welcome {user} to {server}!')
          .replace('{user}', member.user.toString())
          .replace('{server}', member.guild.name)
          .replace('{memberCount}', member.guild.memberCount.toString());

        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('👋 Welcome!')
          .setDescription(message)
          .addFields(
            { name: '👥 Member Count', value: `You are member #${member.guild.memberCount}`, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
      }
    } catch (error) {
      logger.error(`Failed to send welcome message in ${member.guild.name}`, error);
    }

    if (guildData.log_member_join && guildData.log_channel_id) {
      const logChannel = member.guild.channels.cache.get(guildData.log_channel_id) as TextChannel;
      if (logChannel?.isTextBased()) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const daysSinceCreation = Math.floor(accountAge / (1000 * 60 * 60 * 24));

        const logEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('📥 Member Joined')
          .setDescription(`${member} joined the server`)
          .addFields(
            { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${daysSinceCreation} days ago)`, inline: true },
            { name: '👥 Member Count', value: `${member.guild.memberCount}`, inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        if (guildData.log_invite_events) {
          const inviteInfo = db.getMemberInvite(member.guild.id, member.id) as any;
          if (inviteInfo?.inviter_id) {
            const inviter = await member.guild.members.fetch(inviteInfo.inviter_id).catch(() => null);
            logEmbed.addFields({
              name: '📨 Invited By',
              value: inviter ? `${inviter.user.tag} (code: ${inviteInfo.invite_code})` : `Unknown (code: ${inviteInfo.invite_code})`,
              inline: false
            });
          }
        }

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          logger.error('Failed to send join log', error);
        }
      }
    }
  }
};

export default event;
