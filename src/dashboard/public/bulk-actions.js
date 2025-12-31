class BulkActions {
  constructor() {
    this.selectedUsers = new Set();
    this.currentAction = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadHistory();
  }

  setupEventListeners() {
    const actionBtns = document.querySelectorAll('[data-bulk-action]');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        this.selectAction(button.dataset.bulkAction);
      });
    });

    const executeBtn = document.getElementById('bulk-execute-btn');
    if (executeBtn) {
      executeBtn.addEventListener('click', () => this.showConfirmModal());
    }

    const userSearchInput = document.getElementById('bulk-user-search');
    if (userSearchInput) {
      userSearchInput.addEventListener('input', (e) => this.searchUsers(e.target.value));
    }
  }

  selectAction(action) {
    this.currentAction = action;
    this.selectedUsers.clear();
    this.updateUI();

    document.querySelectorAll('[data-bulk-action]').forEach(btn => {
      btn.classList.remove('bg-indigo-600', 'border-indigo-500', 'text-white');
      btn.classList.remove('bg-red-600', 'border-red-500');
      btn.classList.remove('bg-orange-600', 'border-orange-500');
      btn.classList.remove('bg-green-600', 'border-green-500');
      btn.classList.remove('bg-yellow-600', 'border-yellow-500');
      btn.classList.add('bg-zinc-700', 'border-zinc-600', 'text-zinc-300');
    });

    const activeBtn = document.querySelector(`[data-bulk-action="${action}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-zinc-700', 'border-zinc-600', 'text-zinc-300');

      const actionColors = {
        ban: ['bg-red-600', 'border-red-500', 'text-white'],
        kick: ['bg-orange-600', 'border-orange-500', 'text-white'],
        role_add: ['bg-green-600', 'border-green-500', 'text-white'],
        role_remove: ['bg-yellow-600', 'border-yellow-500', 'text-white']
      };

      const colors = actionColors[action] || ['bg-indigo-600', 'border-indigo-500', 'text-white'];
      activeBtn.classList.add(...colors);
    }

    const roleSelector = document.getElementById('bulk-role-selector');
    if (roleSelector) {
      roleSelector.classList.toggle('hidden', !['role_add', 'role_remove'].includes(action));
    }
  }

  async searchUsers(query) {
    if (!query || query.length < 2) {
      document.getElementById('bulk-user-results').innerHTML = '';
      return;
    }

    const container = document.getElementById('bulk-user-results');
    container.innerHTML = '<div class="p-4 text-gray-500">Enter user IDs separated by commas or newlines</div>';
  }

  addUser(userId) {
    this.selectedUsers.add(userId);
    this.updateSelectedList();
  }

  removeUser(userId) {
    this.selectedUsers.delete(userId);
    this.updateSelectedList();
  }

  updateSelectedList() {
    const container = document.getElementById('bulk-selected-users');
    if (!container) return;

    container.innerHTML = '';

    if (this.selectedUsers.size === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-zinc-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="text-sm">No users selected</p>
        </div>
      `;
      return;
    }

    this.selectedUsers.forEach(userId => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between bg-zinc-700/50 px-3 py-2 rounded-lg mb-2 hover:bg-zinc-700 transition-colors';
      div.innerHTML = `
        <span class="text-sm text-white font-mono">${userId}</span>
        <button onclick="window.bulkActions.removeUser('${userId}')"
                class="text-red-400 hover:text-red-300 font-bold">✕</button>
      `;
      container.appendChild(div);
    });

    this.updateUI();
  }

  updateUI() {
    const executeBtn = document.getElementById('bulk-execute-btn');
    if (executeBtn) {
      executeBtn.disabled = this.selectedUsers.size === 0 || !this.currentAction;
      executeBtn.classList.toggle('opacity-50', executeBtn.disabled);
      executeBtn.classList.toggle('cursor-not-allowed', executeBtn.disabled);
    }

    const countEl = document.getElementById('bulk-selected-count');
    if (countEl) {
      countEl.textContent = this.selectedUsers.size;
    }
  }

  showConfirmModal() {
    const actionNames = {
      ban: 'Ban',
      kick: 'Kick',
      role_add: 'Add Role to',
      role_remove: 'Remove Role from'
    };

    const actionName = actionNames[this.currentAction] || this.currentAction;
    const confirmed = confirm(
      `Are you sure you want to ${actionName} ${this.selectedUsers.size} user(s)?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      this.executeAction();
    }
  }

  async executeAction() {
    const reason = document.getElementById('bulk-reason').value || 'Bulk action from dashboard';
    const roleId = document.getElementById('bulk-role-select')?.value;

    if (['role_add', 'role_remove'].includes(this.currentAction) && !roleId) {
      alert('Please select a role');
      return;
    }

    const payload = {
      userIds: Array.from(this.selectedUsers),
      reason
    };

    if (roleId) {
      payload.roleId = roleId;
    }

    if (this.currentAction === 'ban') {
      payload.deleteMessageDays = parseInt(document.getElementById('bulk-delete-days')?.value || '0');
    }

    try {
      const guildId = window.currentGuildId;
      const endpoint = `/api/guilds/${guildId}/bulk/${this.currentAction.replace('_', '-')}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Success: ${result.data.successCount} succeeded, ${result.data.failedCount} failed`);
        this.selectedUsers.clear();
        this.updateSelectedList();
        await this.loadHistory();
      } else {
        alert('Failed to execute action: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to execute bulk action:', error);
      alert('Failed to execute bulk action');
    }
  }

  async loadHistory() {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/bulk/history?limit=20`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to load bulk action history:', error);
    }
  }

  renderHistory(history) {
    const container = document.getElementById('bulk-history-list');
    if (!container) return;

    container.innerHTML = '';

    if (history.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-zinc-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="text-sm">No history available</p>
        </div>
      `;
      return;
    }

    history.forEach(action => {
      const div = document.createElement('div');
      div.className = 'bg-zinc-700/30 p-3 rounded-lg mb-2 hover:bg-zinc-700/50 transition-colors';

      const date = new Date(action.created_at * 1000).toLocaleString();
      const actionName = action.action_type.replace('_', ' ').toUpperCase();

      div.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-white">${actionName}</span>
          <span class="text-xs text-zinc-400">${date}</span>
        </div>
        <div class="text-xs text-zinc-400 mb-1">
          Executor: <span class="font-mono">${action.executor_id}</span>
        </div>
        <div class="text-xs mt-1">
          <span class="text-green-400">${action.success_count} succeeded</span> /
          <span class="text-red-400">${action.failed_count} failed</span> /
          <span class="text-zinc-400">${action.target_count} total</span>
        </div>
        ${action.reason ? `<div class="text-xs text-zinc-400 mt-1">Reason: ${action.reason}</div>` : ''}
      `;

      container.appendChild(div);
    });
  }

  parseUserInput() {
    const input = document.getElementById('bulk-user-input');
    if (!input) return;

    const text = input.value;
    const userIds = text.split(/[\n,\s]+/).filter(id => id.trim().length > 0);

    userIds.forEach(id => this.addUser(id.trim()));
    input.value = '';
  }
}

window.BulkActions = BulkActions;
