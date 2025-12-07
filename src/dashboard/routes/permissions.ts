import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { PermissionFlagsBits } from 'discord.js';

export function createPermissionsRoutes(client: any): Router {
  const router = Router();

  router.get('/guilds/:guildId/roles', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const roles = await guild.roles.fetch();

      const formattedRoles = roles
        .filter((role: any) => role.id !== guild.id)
        .map((role: any) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          hoist: role.hoist,
          mentionable: role.mentionable,
          managed: role.managed,
          memberCount: role.members.size
        }))
        .sort((a: any, b: any) => b.position - a.position);

      res.json({ success: true, data: formattedRoles });
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch roles' });
    }
  });

  router.get('/guilds/:guildId/roles/:roleId/permissions', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId, roleId } = req.params;
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      const permissionFlags = Object.keys(PermissionFlagsBits).map(key => ({
        name: key,
        value: (PermissionFlagsBits as any)[key].toString(),
        has: role.permissions.has((PermissionFlagsBits as any)[key])
      }));

      res.json({ success: true, data: { role: role.name, permissions: permissionFlags } });
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch role permissions' });
    }
  });

  router.patch('/guilds/:guildId/roles/:roleId/permissions', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId, roleId } = req.params;
      const { permissions } = req.body;

      if (typeof permissions !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid permissions format' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      if (role.managed) {
        return res.status(400).json({ success: false, error: 'Cannot edit managed role' });
      }

      await role.setPermissions(BigInt(permissions));

      res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      res.status(500).json({ success: false, error: 'Failed to update role permissions' });
    }
  });

  return router;
}
