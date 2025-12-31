class XPBoostersManager {
  constructor(guildId) {
    this.guildId = guildId;
    this.boosters = [];
  }

  async loadBoosters() {
    try {
      const response = await API.client.get(`/guilds/${this.guildId}/xp/boosters`);
      this.boosters = response.data || [];
      return this.boosters;
    } catch (error) {
      console.error('Failed to load XP boosters:', error);
      Utils.showToast('Failed to load XP boosters', 'error');
      return [];
    }
  }

  async addBooster(type, targetId, multiplier) {
    try {
      const response = await API.client.post(`/guilds/${this.guildId}/xp/boosters`, {
        type,
        target_id: targetId,
        multiplier: parseFloat(multiplier)
      });

      if (response.success) {
        Utils.showToast(`XP booster added successfully (${multiplier}x)`, 'success');
        await this.loadBoosters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add booster:', error);
      return false;
    }
  }

  async updateBooster(type, targetId, multiplier) {
    try {
      const response = await API.client.patch(`/guilds/${this.guildId}/xp/boosters/${type}/${targetId}`, {
        multiplier: parseFloat(multiplier)
      });

      if (response.success) {
        Utils.showToast(`XP booster updated successfully (${multiplier}x)`, 'success');
        await this.loadBoosters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update booster:', error);
      return false;
    }
  }

  async deleteBooster(type, targetId) {
    if (!confirm('Are you sure you want to delete this XP booster?')) {
      return false;
    }

    try {
      const response = await API.client.delete(`/guilds/${this.guildId}/xp/boosters/${type}/${targetId}`);

      if (response.success) {
        Utils.showToast('XP booster deleted successfully', 'success');
        await this.loadBoosters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete booster:', error);
      return false;
    }
  }

  renderBoostersUI() {
    const roleBoosters = this.boosters.filter(b => b.type === 'role');
    const channelBoosters = this.boosters.filter(b => b.type === 'channel');

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">XP Multipliers</h3>
            <p class="text-sm text-zinc-400 mt-1">Boost XP gain for specific roles or channels</p>
          </div>
          <button type="button" onclick="xpBoostersManager.showAddBoosterModal()" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm transition">
            + Add Booster
          </button>
        </div>

        <div class="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded border border-zinc-700">
          <p><strong>📊 How it works:</strong> Members with boosted roles or posting in boosted channels receive multiplied XP.</p>
          <p class="mt-1"><strong>💡 Tip:</strong> If a member has multiple boosts, only the highest multiplier applies (they don't stack).</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
            <h4 class="text-white font-semibold mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Role Boosters (${roleBoosters.length})
            </h4>
            ${roleBoosters.length === 0 ? `
              <p class="text-zinc-400 text-center py-8">No role boosters configured</p>
            ` : `
              <div class="space-y-2">
                ${roleBoosters.map(booster => this.renderBoosterCard(booster)).join('')}
              </div>
            `}
          </div>

          <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
            <h4 class="text-white font-semibold mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Channel Boosters (${channelBoosters.length})
            </h4>
            ${channelBoosters.length === 0 ? `
              <p class="text-zinc-400 text-center py-8">No channel boosters configured</p>
            ` : `
              <div class="space-y-2">
                ${channelBoosters.map(booster => this.renderBoosterCard(booster)).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  renderBoosterCard(booster) {
    const multiplierColor = booster.multiplier >= 2.5 ? 'text-purple-400' :
                           booster.multiplier >= 2.0 ? 'text-pink-400' :
                           booster.multiplier >= 1.5 ? 'text-indigo-400' :
                           'text-cyan-400';

    const mention = booster.type === 'role' ? `<@&${booster.target_id}>` : `<#${booster.target_id}>`;

    return `
      <div class="flex items-center justify-between p-3 bg-zinc-700/50 rounded border border-zinc-600 hover:border-indigo-500/50 transition">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="text-zinc-300 truncate">
            ${mention}
          </div>
          <div class="flex items-center gap-1">
            <span class="text-sm ${multiplierColor} font-bold">${booster.multiplier}x</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="xpBoostersManager.showEditBoosterModal('${booster.type}', '${booster.target_id}', ${booster.multiplier})"
            class="p-1.5 hover:bg-zinc-600 rounded transition" title="Edit">
            <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onclick="xpBoostersManager.deleteBooster('${booster.type}', '${booster.target_id}')"
            class="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition" title="Delete">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  showAddBoosterModal() {
    const modal = document.createElement('div');
    modal.id = 'add-booster-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Add XP Booster</h3>
          <button onclick="document.getElementById('add-booster-modal').remove()" class="text-zinc-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="add-booster-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Booster Type</label>
            <select name="type" required onchange="this.form.querySelector('[name=target_id]').placeholder = this.value === 'role' ? 'Enter Role ID' : 'Enter Channel ID'"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
              <option value="role">Role</option>
              <option value="channel">Channel</option>
            </select>
            <p class="text-xs text-zinc-400 mt-1">Choose whether to boost by role or channel</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Target ID</label>
            <input type="text" name="target_id" required placeholder="Enter Role ID" pattern="\\d{17,20}"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono">
            <p class="text-xs text-zinc-400 mt-1">Role or Channel ID (17-20 digits)</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">XP Multiplier</label>
            <input type="number" name="multiplier" required min="1.0" max="5.0" step="0.1" value="1.5"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            <p class="text-xs text-zinc-400 mt-1">Multiplier between 1.0x and 5.0x (e.g., 2.0 = double XP)</p>
          </div>

          <div class="bg-indigo-500/10 border border-indigo-500/30 rounded p-3 text-sm text-indigo-300">
            <strong>Examples:</strong>
            <ul class="list-disc list-inside mt-1 space-y-1 text-xs">
              <li>1.5x = 50% bonus XP</li>
              <li>2.0x = 100% bonus XP (double)</li>
              <li>3.0x = 200% bonus XP (triple)</li>
            </ul>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded font-medium transition">
              Add Booster
            </button>
            <button type="button" onclick="document.getElementById('add-booster-modal').remove()"
              class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded font-medium transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('add-booster-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const success = await this.addBooster(
        formData.get('type'),
        formData.get('target_id'),
        formData.get('multiplier')
      );

      if (success) {
        modal.remove();
        if (typeof renderGuildDashboard === 'function') {
          renderGuildDashboard();
        }
      }
    });
  }

  showEditBoosterModal(type, targetId, currentMultiplier) {
    const modal = document.createElement('div');
    modal.id = 'edit-booster-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Edit XP Booster</h3>
          <button onclick="document.getElementById('edit-booster-modal').remove()" class="text-zinc-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="edit-booster-form" class="space-y-4">
          <input type="hidden" name="type" value="${type}">
          <input type="hidden" name="target_id" value="${targetId}">

          <div>
            <label class="block text-sm font-medium mb-2">Target</label>
            <div class="bg-zinc-700/50 border border-zinc-600 rounded px-4 py-2 text-zinc-400 font-mono">
              ${type === 'role' ? `<@&${targetId}>` : `<#${targetId}>`}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">XP Multiplier</label>
            <input type="number" name="multiplier" required min="1.0" max="5.0" step="0.1" value="${currentMultiplier}"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            <p class="text-xs text-zinc-400 mt-1">Multiplier between 1.0x and 5.0x</p>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded font-medium transition">
              Update Booster
            </button>
            <button type="button" onclick="document.getElementById('edit-booster-modal').remove()"
              class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded font-medium transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('edit-booster-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const success = await this.updateBooster(
        formData.get('type'),
        formData.get('target_id'),
        formData.get('multiplier')
      );

      if (success) {
        modal.remove();
        if (typeof renderGuildDashboard === 'function') {
          renderGuildDashboard();
        }
      }
    });
  }
}

window.xpBoostersManager = null;
