class ModerationQueue {
  constructor() {
    this.appeals = [];
    this.currentFilter = { status: 'pending' };
    this.tooltipTimeout = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadAppeals();
  }

  setupEventListeners() {
    const filterBtns = document.querySelectorAll('[data-appeal-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.target.dataset.appealFilter;
        this.setFilter(status);
      });
    });
  }

  setFilter(status) {
    this.currentFilter.status = status === 'all' ? undefined : status;
    this.loadAppeals();

    document.querySelectorAll('[data-appeal-filter]').forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-zinc-700', 'text-gray-300');
    });

    const activeBtn = document.querySelector(`[data-appeal-filter="${status}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-zinc-700', 'text-gray-300');
      activeBtn.classList.add('bg-blue-600', 'text-white');
    }
  }

  async loadAppeals() {
    try {
      const guildId = window.currentGuildId;
      const params = new URLSearchParams(this.currentFilter).toString();
      const response = await fetch(`/api/guilds/${guildId}/appeals?${params}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.appeals = result.data;
        this.renderAppeals();
      }
    } catch (error) {
      console.error('Failed to load appeals:', error);
    }
  }

  renderAppeals() {
    const container = document.getElementById('appeals-list');
    if (!container) return;

    container.innerHTML = '';

    if (this.appeals.length === 0) {
      container.innerHTML = '<div class="text-gray-400 text-center py-8">No appeals found</div>';
      return;
    }

    this.appeals.forEach(appeal => {
      const appealEl = this.createAppealElement(appeal);
      container.appendChild(appealEl);
    });
  }

  createAppealElement(appeal) {
    const div = document.createElement('div');
    div.className = 'appeal-item border border-zinc-700 rounded-lg p-4 mb-3 bg-zinc-800/50 hover:bg-zinc-800 transition';

    const statusColors = {
      pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      approved: 'bg-green-900/30 text-green-400 border-green-700',
      denied: 'bg-red-900/30 text-red-400 border-red-700'
    };

    const statusColor = statusColors[appeal.status] || 'bg-zinc-700 text-gray-300 border-zinc-600';
    const createdDate = new Date(appeal.created_at * 1000).toLocaleString();

    const tooltipId = `user-tooltip-${appeal.user_id}-${appeal.id}`;
    const userDisplay = appeal.user ? `
      <div class="flex items-center gap-2 mb-2">
        <span class="user-tag-wrapper inline-flex items-center" data-user-id="${appeal.user_id}">
          <span class="user-tag-trigger inline-flex items-center gap-2 cursor-help text-gray-200 hover:text-indigo-300" onmouseenter="window.moderationQueue.showTooltip('${tooltipId}', event)" onmouseleave="window.moderationQueue.scheduleHideTooltip('${tooltipId}')">
            <img src="${appeal.user.avatar}" alt="${appeal.user.username}" class="w-8 h-8 rounded-full">
            <span class="font-medium">${appeal.user.tag}</span>
          </span>
          <div id="${tooltipId}" class="user-tooltip hidden fixed bg-zinc-900 border border-zinc-700 rounded-lg p-3 z-50 min-w-[200px] shadow-xl pointer-events-none" onmouseenter="window.moderationQueue.cancelHideTooltip('${tooltipId}')" onmouseleave="window.moderationQueue.hideTooltip('${tooltipId}')">
            <div class="flex items-center gap-2 mb-2 pointer-events-auto">
              <img src="${appeal.user.avatar}" class="w-10 h-10 rounded-full" alt="${appeal.user.username}">
              <div>
                <div class="font-semibold text-gray-200">${appeal.user.username}</div>
                <div class="text-xs text-gray-400">${appeal.user.tag}</div>
              </div>
            </div>
            <div class="text-xs text-gray-400 border-t border-zinc-700 pt-2">
              <div>ID: ${appeal.user_id}</div>
            </div>
          </div>
        </span>
      </div>
    ` : `
      <div class="text-sm text-gray-400 mb-2">User ID: ${appeal.user_id}</div>
    `;

    div.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="px-3 py-1 rounded-full text-sm font-medium border ${statusColor}">${appeal.status.toUpperCase()}</span>
          <span class="text-sm text-gray-400">Type: ${appeal.type}</span>
        </div>
        <span class="text-sm text-gray-400">${createdDate}</span>
      </div>

      <div class="mb-3">
        ${userDisplay}
        ${appeal.action_id ? `<div class="text-sm text-gray-400 mb-1">Case ID: #${appeal.action_id}</div>` : ''}
        <div class="mt-2">
          <strong class="text-gray-200">Reason:</strong>
          <p class="text-gray-300 mt-1">${this.escapeHtml(appeal.reason)}</p>
        </div>
      </div>

      ${appeal.moderator_reason ? `
        <div class="bg-zinc-900/50 border border-zinc-700 p-3 rounded mb-3">
          <strong class="text-sm text-gray-200">Moderator Response:</strong>
          <p class="text-sm text-gray-300 mt-1">${this.escapeHtml(appeal.moderator_reason)}</p>
        </div>
      ` : ''}

      ${appeal.status === 'pending' ? `
        <div class="flex gap-2 mt-3">
          <button onclick="window.moderationQueue.approveAppeal(${appeal.id})"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition">
            ✓ Approve
          </button>
          <button onclick="window.moderationQueue.denyAppeal(${appeal.id})"
                  class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition">
            ✗ Deny
          </button>
          <button onclick="window.moderationQueue.showNoteModal(${appeal.id})"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
            📝 Add Note
          </button>
        </div>
      ` : ''}
    `;

    return div;
  }

  async approveAppeal(appealId) {
    const reason = prompt('Approval reason (optional):');
    if (reason === null) return;

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'approved',
          moderatorReason: reason || 'Approved'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Appeal approved successfully!');
        this.loadAppeals();
      } else {
        alert('Failed to approve appeal: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to approve appeal:', error);
      alert('Failed to approve appeal');
    }
  }

  async denyAppeal(appealId) {
    const reason = prompt('Denial reason:');
    if (!reason) return;

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'denied',
          moderatorReason: reason
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Appeal denied successfully!');
        this.loadAppeals();
      } else {
        alert('Failed to deny appeal: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to deny appeal:', error);
      alert('Failed to deny appeal');
    }
  }

  async showNoteModal(appealId) {
    const note = prompt('Add a note:');
    if (!note) return;

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/appeals/${appealId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note })
      });

      const result = await response.json();

      if (result.success) {
        alert('Note added successfully!');
      } else {
        alert('Failed to add note: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note');
    }
  }

  showTooltip(tooltipId, event) {
    this.cancelHideTooltip();
    const tooltip = document.getElementById(tooltipId);
    if (tooltip && event) {
      tooltip.classList.remove('hidden');
      const rect = event.target.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 5}px`;
    }
  }

  scheduleHideTooltip(tooltipId) {
    this.tooltipTimeout = setTimeout(() => this.hideTooltip(tooltipId), 100);
  }

  cancelHideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  hideTooltip(tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
      tooltip.classList.add('hidden');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.ModerationQueue = ModerationQueue;
