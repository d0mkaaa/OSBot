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
        this.selectAction(e.target.dataset.bulkAction);
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
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-gray-200', 'text-gray-700');
    });

    const activeBtn = document.querySelector(`[data-bulk-action="${action}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
      activeBtn.classList.add('bg-blue-600', 'text-white');
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
      container.innerHTML = '<div class="text-gray-500 text-sm">No users selected</div>';
      return;
    }

    this.selectedUsers.forEach(userId => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between bg-blue-100 px-3 py-2 rounded';
      div.innerHTML = `
        <span class="text-sm">${userId}</span>
        <button onclick="window.bulkActions.removeUser('${userId}')"
                class="text-red-600 hover:text-red-800">✕</button>
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
      container.innerHTML = '<div class="text-gray-500 text-center py-4">No history found</div>';
      return;
    }

    history.forEach(action => {
      const div = document.createElement('div');
      div.className = 'border-b p-3 hover:bg-gray-50';

      const date = new Date(action.created_at * 1000).toLocaleString();
      const actionName = action.action_type.replace('_', ' ').toUpperCase();

      div.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">${actionName}</span>
          <span class="text-sm text-gray-500">${date}</span>
        </div>
        <div class="text-sm text-gray-600">
          Executor: ${action.executor_id}
        </div>
        <div class="text-sm mt-1">
          <span class="text-green-600">${action.success_count} succeeded</span> /
          <span class="text-red-600">${action.failed_count} failed</span> /
          <span class="text-gray-600">${action.target_count} total</span>
        </div>
        ${action.reason ? `<div class="text-sm text-gray-600 mt-1">Reason: ${action.reason}</div>` : ''}
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
