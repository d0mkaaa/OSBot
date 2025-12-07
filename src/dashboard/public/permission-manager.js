class PermissionManager {
  constructor() {
    this.roles = [];
    this.selectedRole = null;
    this.permissions = {};
  }

  async init() {
    await this.loadRoles();
  }

  async loadRoles() {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/roles`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.roles = result.data;
        this.renderRoleList();
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }

  renderRoleList() {
    const container = document.getElementById('permission-role-list');
    if (!container) return;

    container.innerHTML = '';

    this.roles.forEach(role => {
      const roleEl = document.createElement('div');
      roleEl.className = 'role-item p-3 border-b border-zinc-700 hover:bg-zinc-700 cursor-pointer transition';
      roleEl.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background-color: ${this.getRoleColor(role.color)}"></div>
            <span class="font-medium text-gray-200">${role.name}</span>
            ${role.managed ? '<span class="text-xs text-gray-400">(Managed)</span>' : ''}
          </div>
          <span class="text-sm text-gray-400">${role.memberCount} members</span>
        </div>
      `;

      roleEl.addEventListener('click', () => this.selectRole(role));
      container.appendChild(roleEl);
    });
  }

  getRoleColor(colorInt) {
    if (!colorInt) return '#99AAB5';
    return '#' + colorInt.toString(16).padStart(6, '0');
  }

  async selectRole(role) {
    this.selectedRole = role;
    await this.loadPermissions(role.id);
  }

  async loadPermissions(roleId) {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/roles/${roleId}/permissions`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.permissions = result.data.permissions;
        this.renderPermissions();
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }

  renderPermissions() {
    const container = document.getElementById('permission-grid');
    if (!container) return;

    const roleInfo = document.getElementById('permission-role-info');
    if (roleInfo) {
      roleInfo.innerHTML = `
        <h3 class="text-lg font-semibold mb-4 text-gray-100">Permissions for ${this.selectedRole.name}</h3>
        ${this.selectedRole.managed ? '<div class="bg-yellow-900/30 border border-yellow-700 text-yellow-400 px-4 py-2 rounded mb-4">⚠️ This role is managed by an integration and cannot be edited</div>' : ''}
      `;
    }

    container.innerHTML = '';

    const dangerousPerms = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers'];

    this.permissions.forEach(perm => {
      const isDangerous = dangerousPerms.includes(perm.name);
      const permEl = document.createElement('div');
      permEl.className = `permission-item p-3 border rounded transition ${isDangerous ? 'border-red-700 bg-red-900/20' : 'border-zinc-700 bg-zinc-800/50'}`;

      permEl.innerHTML = `
        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <span class="font-medium text-gray-200">${this.formatPermissionName(perm.name)}</span>
            ${isDangerous ? '<span class="text-red-400 text-xs ml-2">⚠️ Dangerous</span>' : ''}
          </div>
          <input type="checkbox"
                 ${perm.has ? 'checked' : ''}
                 ${this.selectedRole.managed ? 'disabled' : ''}
                 data-permission="${perm.name}"
                 class="w-5 h-5 accent-blue-600">
        </label>
      `;

      container.appendChild(permEl);
    });

    if (!this.selectedRole.managed) {
      const saveBtn = document.getElementById('permission-save-btn');
      if (saveBtn) {
        saveBtn.classList.remove('hidden');
        saveBtn.onclick = () => this.savePermissions();
      }
    }
  }

  formatPermissionName(name) {
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  async savePermissions() {
    const checkboxes = document.querySelectorAll('[data-permission]');
    let newPermissions = BigInt(0);

    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const perm = this.permissions.find(p => p.name === checkbox.dataset.permission);
        if (perm) {
          newPermissions |= BigInt(perm.value);
        }
      }
    });

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/roles/${this.selectedRole.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: newPermissions.toString() })
      });

      const result = await response.json();

      if (result.success) {
        alert('Permissions updated successfully!');
      } else {
        alert('Failed to update permissions: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('Failed to save permissions');
    }
  }
}

window.PermissionManager = PermissionManager;
