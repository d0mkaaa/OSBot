class CustomFiltersManager {
  constructor(guildId) {
    this.guildId = guildId;
    this.filters = [];
  }

  async loadFilters() {
    try {
      const response = await API.client.get(`/guilds/${this.guildId}/automod/filters`);
      this.filters = response.data || [];
      return this.filters;
    } catch (error) {
      console.error('Failed to load custom filters:', error);
      Utils.showToast('Failed to load custom filters', 'error');
      return [];
    }
  }

  async addFilter(name, pattern, action, enabled = true) {
    try {
      const response = await API.client.post(`/guilds/${this.guildId}/automod/filters`, {
        name,
        pattern,
        action,
        enabled
      });

      if (response.success) {
        Utils.showToast(`Filter "${name}" added successfully`, 'success');
        await this.loadFilters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add filter:', error);
      return false;
    }
  }

  async updateFilter(name, updates) {
    try {
      const response = await API.client.patch(`/guilds/${this.guildId}/automod/filters/${encodeURIComponent(name)}`, updates);

      if (response.success) {
        Utils.showToast(`Filter "${name}" updated successfully`, 'success');
        await this.loadFilters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update filter:', error);
      return false;
    }
  }

  async deleteFilter(name) {
    if (!confirm(`Are you sure you want to delete the filter "${name}"?`)) {
      return false;
    }

    try {
      const response = await API.client.delete(`/guilds/${this.guildId}/automod/filters/${encodeURIComponent(name)}`);

      if (response.success) {
        Utils.showToast(`Filter "${name}" deleted successfully`, 'success');
        await this.loadFilters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete filter:', error);
      return false;
    }
  }

  async toggleFilter(name, enabled) {
    return await this.updateFilter(name, { enabled });
  }

  renderFiltersUI() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Custom Regex Filters</h3>
          <button type="button" onclick="customFiltersManager.showAddFilterModal()" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm transition">
            + Add Filter
          </button>
        </div>

        <div class="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded border border-zinc-700">
          <p><strong>📝 Regex filters:</strong> Create custom content filters using regular expressions. Each filter can have its own action.</p>
          <p class="mt-1"><strong>Example patterns:</strong></p>
          <ul class="list-disc list-inside mt-1 space-y-1">
            <li><code class="text-xs bg-zinc-900 px-1 py-0.5 rounded">scam|phishing</code> - Matches "scam" or "phishing"</li>
            <li><code class="text-xs bg-zinc-900 px-1 py-0.5 rounded">\\b(free|win)\\s+(nitro|money)\\b</code> - "free nitro", "win money", etc.</li>
            <li><code class="text-xs bg-zinc-900 px-1 py-0.5 rounded">discord\\.gg/[a-zA-Z0-9]+</code> - Discord invite links</li>
          </ul>
        </div>

        ${this.filters.length === 0 ? `
          <div class="text-center py-8 text-zinc-400">
            <svg class="w-16 h-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <p class="text-lg font-medium">No custom filters configured</p>
            <p class="text-sm mt-1">Create your first regex filter to get started</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${this.filters.map(filter => this.renderFilterCard(filter)).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderFilterCard(filter) {
    const actionColors = {
      delete: 'bg-red-500/20 text-red-400 border-red-500/30',
      warn: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      timeout: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      kick: 'bg-red-600/20 text-red-400 border-red-600/30',
      ban: 'bg-red-700/20 text-red-400 border-red-700/30'
    };

    const actionColor = actionColors[filter.action] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600';

    return `
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-4 ${!filter.enabled ? 'opacity-50' : ''}">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h4 class="text-white font-semibold truncate">${Utils.escapeHtml(filter.name)}</h4>
              <span class="px-2 py-1 text-xs rounded border ${actionColor}">${filter.action.toUpperCase()}</span>
              ${filter.enabled ?
                '<span class="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">ACTIVE</span>' :
                '<span class="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-400 border border-zinc-600">DISABLED</span>'
              }
            </div>
            <div class="bg-zinc-900/50 p-2 rounded border border-zinc-700 mb-2">
              <code class="text-sm text-cyan-400 break-all">${Utils.escapeHtml(filter.pattern)}</code>
            </div>
            <div class="flex items-center gap-2 text-xs text-zinc-500">
              <span>Created ${new Date(filter.created_at * 1000).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${filter.enabled ? 'checked' : ''}
                onchange="customFiltersManager.toggleFilter('${Utils.escapeHtml(filter.name)}', this.checked)"
                class="sr-only peer">
              <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <button onclick="customFiltersManager.showEditFilterModal('${Utils.escapeHtml(filter.name)}')"
              class="p-2 hover:bg-zinc-700 rounded transition" title="Edit">
              <svg class="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onclick="customFiltersManager.deleteFilter('${Utils.escapeHtml(filter.name)}')"
              class="p-2 hover:bg-red-500/20 text-red-400 rounded transition" title="Delete">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showAddFilterModal() {
    const modal = document.createElement('div');
    modal.id = 'add-filter-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Add Custom Filter</h3>
          <button onclick="document.getElementById('add-filter-modal').remove()" class="text-zinc-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="add-filter-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Filter Name</label>
            <input type="text" name="name" required maxlength="50" placeholder="e.g., Scam Detection"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            <p class="text-xs text-zinc-400 mt-1">A unique name to identify this filter</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Regex Pattern</label>
            <input type="text" name="pattern" required placeholder="e.g., scam|phishing|free\\s+nitro"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono text-sm">
            <p class="text-xs text-zinc-400 mt-1">Regular expression pattern (case-insensitive)</p>
            <p class="text-xs text-yellow-400 mt-1">⚠️ Invalid regex will be ignored to prevent bot crashes</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Action</label>
            <select name="action" required
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
              <option value="delete">Delete Message</option>
              <option value="warn">Warn User</option>
              <option value="timeout">Timeout User</option>
              <option value="kick">Kick User</option>
              <option value="ban">Ban User</option>
            </select>
            <p class="text-xs text-zinc-400 mt-1">Action to take when pattern is matched</p>
          </div>

          <div class="flex items-center gap-3 p-3 bg-zinc-700/50 rounded">
            <input type="checkbox" name="enabled" id="add-filter-enabled" checked class="w-4 h-4">
            <label for="add-filter-enabled" class="text-sm font-medium cursor-pointer">Enable this filter immediately</label>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded font-medium transition">
              Add Filter
            </button>
            <button type="button" onclick="document.getElementById('add-filter-modal').remove()"
              class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded font-medium transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('add-filter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const success = await this.addFilter(
        formData.get('name'),
        formData.get('pattern'),
        formData.get('action'),
        formData.get('enabled') === 'on'
      );

      if (success) {
        modal.remove();
        if (typeof renderGuildDashboard === 'function') {
          renderGuildDashboard();
        }
      }
    });
  }

  showEditFilterModal(name) {
    const filter = this.filters.find(f => f.name === name);
    if (!filter) return;

    const modal = document.createElement('div');
    modal.id = 'edit-filter-modal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Edit Filter: ${Utils.escapeHtml(filter.name)}</h3>
          <button onclick="document.getElementById('edit-filter-modal').remove()" class="text-zinc-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="edit-filter-form" class="space-y-4">
          <input type="hidden" name="original_name" value="${Utils.escapeHtml(filter.name)}">

          <div>
            <label class="block text-sm font-medium mb-2">Regex Pattern</label>
            <input type="text" name="pattern" required value="${Utils.escapeHtml(filter.pattern)}"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono text-sm">
            <p class="text-xs text-zinc-400 mt-1">Regular expression pattern (case-insensitive)</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Action</label>
            <select name="action" required
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
              <option value="delete" ${filter.action === 'delete' ? 'selected' : ''}>Delete Message</option>
              <option value="warn" ${filter.action === 'warn' ? 'selected' : ''}>Warn User</option>
              <option value="timeout" ${filter.action === 'timeout' ? 'selected' : ''}>Timeout User</option>
              <option value="kick" ${filter.action === 'kick' ? 'selected' : ''}>Kick User</option>
              <option value="ban" ${filter.action === 'ban' ? 'selected' : ''}>Ban User</option>
            </select>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded font-medium transition">
              Update Filter
            </button>
            <button type="button" onclick="document.getElementById('edit-filter-modal').remove()"
              class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded font-medium transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('edit-filter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const success = await this.updateFilter(
        formData.get('original_name'),
        {
          pattern: formData.get('pattern'),
          action: formData.get('action')
        }
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

window.customFiltersManager = null;
