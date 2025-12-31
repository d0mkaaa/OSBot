class BackupManager {
  constructor() {
    this.backups = [];
    this.systemBackups = [];
    this.autoBackupStatus = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadBackups();
    await this.loadAndRenderSystemBackups();
    await this.loadAndRenderAutoBackupStatus();
  }

  setupEventListeners() {
    const createBtn = document.getElementById('backup-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateModal());
    }

    const autoBackupToggle = document.getElementById('autobackup-toggle');
    if (autoBackupToggle) {
      autoBackupToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        const intervalSelect = document.getElementById('autobackup-interval');
        const intervalHours = intervalSelect ? parseInt(intervalSelect.value) : 24;

        const result = await this.toggleAutoBackup(enabled, intervalHours);
        if (result) {
          this.autoBackupStatus = result;
          this.renderAutoBackupStatus();
          await this.loadAndRenderSystemBackups();
        } else {
          e.target.checked = !enabled;
        }
      });
    }

    const intervalSelect = document.getElementById('autobackup-interval');
    if (intervalSelect) {
      intervalSelect.addEventListener('change', async (e) => {
        const toggle = document.getElementById('autobackup-toggle');
        if (toggle && toggle.checked) {
          const intervalHours = parseInt(e.target.value);
          const result = await this.toggleAutoBackup(true, intervalHours);
          if (result) {
            this.autoBackupStatus = result;
          }
        }
      });
    }
  }

  async loadBackups() {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.backups = result.data;
        this.renderBackups();
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to load backups', 'error');
      }
    }
  }

  renderBackups() {
    const container = document.getElementById('backups-list');
    if (!container) return;

    container.innerHTML = '';

    if (this.backups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p class="text-lg font-medium mb-2">No backups found</p>
          <p class="text-sm">Create your first backup to protect your server configuration!</p>
        </div>
      `;
      return;
    }

    this.backups.forEach(backup => {
      const div = this.createBackupElement(backup);
      container.appendChild(div);
    });
  }

  createBackupElement(backup) {
    const div = document.createElement('div');
    div.className = 'bg-zinc-800 border border-zinc-700 rounded-lg p-5 hover:border-zinc-600 transition-colors';

    const date = new Date(backup.createdAt * 1000).toLocaleString();
    const relativeTime = window.Utils ? window.Utils.formatRelativeTime(backup.createdAt) : date;
    const size = (backup.sizeBytes / 1024).toFixed(2);
    const includes = backup.includes.map(item => {
      const icons = {
        settings: '⚙️',
        roles: '👥',
        channels: '📝',
        rules: '📋',
        automod: '🛡️',
        levelRoles: '⭐'
      };
      return `<span class="badge badge-info">${icons[item] || '•'} ${item}</span>`;
    }).join(' ');

    div.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-white mb-1">${window.Utils ? window.Utils.escapeHtml(backup.name) : backup.name}</h4>
          <div class="flex items-center gap-3 text-sm text-zinc-400">
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ${relativeTime}
            </span>
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              ${size} KB
            </span>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap justify-end">
          <button onclick="window.backupManager.viewBackup(${backup.id})"
                  class="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                  title="View backup details">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button onclick="window.backupManager.showCompareModal(${backup.id})"
                  class="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                  title="Compare with another backup">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Compare
          </button>
          <button onclick="window.backupManager.downloadBackup(${backup.id})"
                  class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition flex items-center gap-1"
                  title="Download backup file">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button onclick="window.backupManager.showRestoreModal(${backup.id})"
                  class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded transition flex items-center gap-1"
                  title="Restore this backup">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restore
          </button>
          <button onclick="window.backupManager.deleteBackup(${backup.id})"
                  class="btn-danger text-sm px-3 py-1.5 flex items-center gap-1"
                  title="Delete this backup">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap mb-3">
        ${includes}
      </div>
      <div class="text-xs text-zinc-500 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Created by: ${window.Utils ? window.Utils.escapeHtml(backup.createdBy) : backup.createdBy}
      </div>
    `;

    return div;
  }

  showCreateModal() {
    const options = [
      { value: 'settings', label: '⚙️ Server Settings', desc: 'Prefix, locale, welcome/goodbye messages' },
      { value: 'roles', label: '👥 Roles & Permissions', desc: 'All server roles and their permissions' },
      { value: 'channels', label: '📝 Channels', desc: 'Text, voice, and category channels' },
      { value: 'rules', label: '📋 Server Rules', desc: 'All configured server rules' },
      { value: 'automod', label: '🛡️ AutoMod Settings', desc: 'Spam, profanity, and link filters' },
      { value: 'levelRoles', label: '⭐ Level Roles', desc: 'XP system and level role rewards' }
    ];

    const checkboxes = options.map(opt =>
      `<label class="flex items-start gap-3 p-3 bg-zinc-700 rounded hover:bg-zinc-600 transition cursor-pointer">
        <input type="checkbox" value="${opt.value}" checked class="backup-include-option mt-1 w-4 h-4">
        <div class="flex-1">
          <div class="font-medium text-white">${opt.label}</div>
          <div class="text-xs text-zinc-400 mt-0.5">${opt.desc}</div>
        </div>
      </label>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content max-w-2xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">💾 Create New Backup</h3>
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="text-zinc-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mb-6">
          <p class="text-zinc-300 mb-4">Select what to include in your backup:</p>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${checkboxes}
          </div>
        </div>

        <div class="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-200">
              <strong class="font-semibold">Note:</strong> Creating a backup will capture the current state of your server configuration. You can restore it anytime.
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-end">
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="btn-secondary px-6 py-2.5">
            Cancel
          </button>
          <button onclick="window.backupManager.createBackup(this)"
                  class="btn-primary px-6 py-2.5">
            Create Backup
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async createBackup(btnElement) {
    const modal = btnElement.closest('.modal-backdrop');
    const checkedOptions = Array.from(modal.querySelectorAll('.backup-include-option:checked'))
      .map(cb => cb.value);

    if (checkedOptions.length === 0) {
      if (window.Utils) {
        window.Utils.showToast('Please select at least one option', 'warning');
      } else {
        alert('Please select at least one option');
      }
      return;
    }

    if (window.Utils) {
      window.Utils.showLoadingOverlay('Creating backup...');
    }

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ includes: checkedOptions })
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast('Backup created successfully!', 'success');
        } else {
          alert('Backup created successfully!');
        }
        modal.remove();
        await this.loadBackups();
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to create backup: ' + result.error, 'error');
        } else {
          alert('Failed to create backup: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to create backup', 'error');
      } else {
        alert('Failed to create backup');
      }
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  async downloadBackup(backupId) {
    try {
      const guildId = window.currentGuildId;
      window.location.href = `/api/guilds/${guildId}/backups/${backupId}/download`;
    } catch (error) {
      console.error('Failed to download backup:', error);
      alert('Failed to download backup');
    }
  }

  async viewBackup(backupId) {
    if (window.Utils) {
      window.Utils.showLoadingOverlay('Loading backup details...');
    }

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/${backupId}/preview`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.showViewModal(result.data);
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to load backup: ' + result.error, 'error');
        } else {
          alert('Failed to load backup: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to load backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to load backup', 'error');
      } else {
        alert('Failed to load backup');
      }
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  showCompareModal(backupId) {
    const otherBackups = this.backups.filter(b => b.id !== backupId);

    if (otherBackups.length === 0) {
      if (window.Utils) {
        window.Utils.showToast('You need at least 2 backups to compare', 'warning');
      } else {
        alert('You need at least 2 backups to compare');
      }
      return;
    }

    const backupOptions = otherBackups.map(backup => {
      const date = new Date(backup.createdAt * 1000).toLocaleString();
      return `<option value="${backup.id}">${window.Utils ? window.Utils.escapeHtml(backup.name) : backup.name} - ${date}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">📊 Compare Backups</h3>
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="text-zinc-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-zinc-300 mb-2">Compare with:</label>
          <select id="compare-backup-select" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2.5 text-white">
            <option value="">Select a backup...</option>
            ${backupOptions}
          </select>
        </div>

        <div class="flex gap-3 justify-end">
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="btn-secondary px-6 py-2.5">
            Cancel
          </button>
          <button onclick="window.backupManager.compareBackups(${backupId}, this)"
                  class="btn-primary px-6 py-2.5">
            Compare
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async compareBackups(backup1Id, btnElement) {
    const modal = btnElement.closest('.modal-backdrop');
    const backup2Id = document.getElementById('compare-backup-select').value;

    if (!backup2Id) {
      if (window.Utils) {
        window.Utils.showToast('Please select a backup to compare with', 'warning');
      } else {
        alert('Please select a backup to compare with');
      }
      return;
    }

    if (window.Utils) {
      window.Utils.showLoadingOverlay('Comparing backups...');
    }

    try {
      const guildId = window.currentGuildId;
      const [response1, response2] = await Promise.all([
        fetch(`/api/guilds/${guildId}/backups/${backup1Id}/preview`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/backups/${backup2Id}/preview`, { credentials: 'include' })
      ]);

      const [result1, result2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      if (result1.success && result2.success) {
        modal.remove();
        this.showComparisonModal(result1.data, result2.data);
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to load backups for comparison', 'error');
        } else {
          alert('Failed to load backups for comparison');
        }
      }
    } catch (error) {
      console.error('Failed to compare backups:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to compare backups', 'error');
      } else {
        alert('Failed to compare backups');
      }
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  showViewModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    const includes = data.includes.map(inc => {
      const icons = {
        settings: '⚙️',
        roles: '👥',
        channels: '📝',
        rules: '📋',
        automod: '🛡️',
        levelRoles: '⭐'
      };
      return `<span class="badge badge-info">${icons[inc] || '•'} ${inc}</span>`;
    }).join(' ');

    const detailedContent = data.data ? this.renderBackupDetails(data.data) : '';

    modal.innerHTML = `
      <div class="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 sticky top-0 bg-zinc-800 pb-4 border-b border-zinc-700">
          <h3 class="text-2xl font-bold text-white">👁️ Backup Details</h3>
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="text-zinc-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="bg-zinc-700 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-zinc-400 mb-1">Guild Name</div>
                <div class="font-medium text-white">${window.Utils ? window.Utils.escapeHtml(data.guildName) : data.guildName}</div>
              </div>
              <div>
                <div class="text-xs text-zinc-400 mb-1">Created Date</div>
                <div class="font-medium text-white">${new Date(data.createdAt * 1000).toLocaleString()}</div>
              </div>
              <div>
                <div class="text-xs text-zinc-400 mb-1">Backup Version</div>
                <div class="font-medium text-white">${data.version}</div>
              </div>
              <div>
                <div class="text-xs text-zinc-400 mb-1">File Size</div>
                <div class="font-medium text-white">${(data.sizeBytes / 1024).toFixed(2)} KB</div>
              </div>
            </div>
          </div>

          <div>
            <div class="text-sm font-medium text-zinc-300 mb-2">Included Components:</div>
            <div class="flex flex-wrap gap-2">
              ${includes}
            </div>
          </div>

          ${detailedContent}
        </div>

        <div class="mt-6 flex justify-end sticky bottom-0 bg-zinc-800 pt-4 border-t border-zinc-700">
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="btn-secondary px-6 py-2.5">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  renderBackupDetails(data) {
    let html = '<div class="space-y-4">';

    if (data.settings) {
      html += `
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-bold text-white mb-3 flex items-center gap-2">
            <span>⚙️</span> Server Settings
          </h4>
          <div class="grid grid-cols-2 gap-3 text-sm">
            ${data.settings.prefix ? `<div><span class="text-zinc-400">Prefix:</span> <span class="text-white">${window.Utils ? window.Utils.escapeHtml(data.settings.prefix) : data.settings.prefix}</span></div>` : ''}
            ${data.settings.locale ? `<div><span class="text-zinc-400">Locale:</span> <span class="text-white">${data.settings.locale}</span></div>` : ''}
            ${data.settings.welcome_enabled !== undefined ? `<div><span class="text-zinc-400">Welcome:</span> <span class="text-white">${data.settings.welcome_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
            ${data.settings.xp_enabled !== undefined ? `<div><span class="text-zinc-400">XP System:</span> <span class="text-white">${data.settings.xp_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
          </div>
        </div>
      `;
    }

    if (data.automod) {
      html += `
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-bold text-white mb-3 flex items-center gap-2">
            <span>🛡️</span> AutoMod Settings
          </h4>
          <div class="grid grid-cols-2 gap-3 text-sm">
            ${data.automod.spam_enabled !== undefined ? `<div><span class="text-zinc-400">Spam Filter:</span> <span class="text-white">${data.automod.spam_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
            ${data.automod.links_enabled !== undefined ? `<div><span class="text-zinc-400">Link Filter:</span> <span class="text-white">${data.automod.links_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
            ${data.automod.profanity_enabled !== undefined ? `<div><span class="text-zinc-400">Profanity Filter:</span> <span class="text-white">${data.automod.profanity_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
            ${data.automod.invites_enabled !== undefined ? `<div><span class="text-zinc-400">Invite Filter:</span> <span class="text-white">${data.automod.invites_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>` : ''}
          </div>
        </div>
      `;
    }

    if (data.rules && data.rules.length > 0) {
      html += `
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-bold text-white mb-3 flex items-center gap-2">
            <span>📋</span> Server Rules (${data.rules.length})
          </h4>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${data.rules.map((rule, idx) => `
              <div class="bg-zinc-800 rounded p-3">
                <div class="font-medium text-white">${idx + 1}. ${window.Utils ? window.Utils.escapeHtml(rule.title) : rule.title}</div>
                <div class="text-sm text-zinc-400 mt-1">${window.Utils ? window.Utils.escapeHtml(rule.description) : rule.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (data.roles && data.roles.length > 0) {
      html += `
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-bold text-white mb-3 flex items-center gap-2">
            <span>👥</span> Roles (${data.roles.length})
          </h4>
          <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            ${data.roles.slice(0, 20).map(role => `
              <span class="badge badge-info">${window.Utils ? window.Utils.escapeHtml(role.name) : role.name}</span>
            `).join('')}
            ${data.roles.length > 20 ? `<span class="text-zinc-400 text-sm">+${data.roles.length - 20} more</span>` : ''}
          </div>
        </div>
      `;
    }

    if (data.channels && data.channels.length > 0) {
      html += `
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-bold text-white mb-3 flex items-center gap-2">
            <span>📝</span> Channels (${data.channels.length})
          </h4>
          <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            ${data.channels.slice(0, 20).map(channel => `
              <span class="badge badge-info">${window.Utils ? window.Utils.escapeHtml(channel.name) : channel.name}</span>
            `).join('')}
            ${data.channels.length > 20 ? `<span class="text-zinc-400 text-sm">+${data.channels.length - 20} more</span>` : ''}
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  showComparisonModal(backup1, backup2) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    const comparison = this.generateComparison(backup1, backup2);

    modal.innerHTML = `
      <div class="modal-content max-w-6xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 sticky top-0 bg-zinc-800 pb-4 border-b border-zinc-700">
          <h3 class="text-2xl font-bold text-white">📊 Backup Comparison</h3>
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="text-zinc-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-zinc-700 rounded-lg p-4">
            <h4 class="font-bold text-white mb-2">${window.Utils ? window.Utils.escapeHtml(backup1.name) : backup1.name}</h4>
            <div class="text-sm text-zinc-400">${new Date(backup1.createdAt * 1000).toLocaleString()}</div>
          </div>
          <div class="bg-zinc-700 rounded-lg p-4">
            <h4 class="font-bold text-white mb-2">${window.Utils ? window.Utils.escapeHtml(backup2.name) : backup2.name}</h4>
            <div class="text-sm text-zinc-400">${new Date(backup2.createdAt * 1000).toLocaleString()}</div>
          </div>
        </div>

        ${comparison}

        <div class="mt-6 flex justify-end sticky bottom-0 bg-zinc-800 pt-4 border-t border-zinc-700">
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="btn-secondary px-6 py-2.5">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  generateComparison(backup1, backup2) {
    let html = '<div class="space-y-4">';

    const sections = [
      { key: 'settings', icon: '⚙️', name: 'Server Settings' },
      { key: 'automod', icon: '🛡️', name: 'AutoMod Settings' },
      { key: 'rules', icon: '📋', name: 'Rules' },
      { key: 'roles', icon: '👥', name: 'Roles' },
      { key: 'channels', icon: '📝', name: 'Channels' }
    ];

    sections.forEach(section => {
      const data1 = backup1.data?.[section.key];
      const data2 = backup2.data?.[section.key];

      if (data1 || data2) {
        html += `
          <div class="bg-zinc-700 rounded-lg p-4">
            <h4 class="font-bold text-white mb-3 flex items-center gap-2">
              <span>${section.icon}</span> ${section.name}
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-zinc-800 rounded p-3">
                <div class="text-xs text-zinc-400 mb-2">Backup 1</div>
                ${this.renderSectionData(data1, section.key)}
              </div>
              <div class="bg-zinc-800 rounded p-3">
                <div class="text-xs text-zinc-400 mb-2">Backup 2</div>
                ${this.renderSectionData(data2, section.key)}
              </div>
            </div>
          </div>
        `;
      }
    });

    html += '</div>';
    return html;
  }

  renderSectionData(data, sectionKey) {
    if (!data) {
      return '<div class="text-zinc-500 text-sm italic">Not included in backup</div>';
    }

    if (Array.isArray(data)) {
      return `<div class="text-white text-sm">${data.length} items</div>`;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data).slice(0, 5);
      return `
        <div class="space-y-1 text-sm">
          ${keys.map(key => {
            const value = data[key];
            const displayValue = typeof value === 'boolean'
              ? (value ? '✅' : '❌')
              : (typeof value === 'string' && value.length > 30
                  ? value.substring(0, 30) + '...'
                  : value);
            return `<div><span class="text-zinc-400">${key}:</span> <span class="text-white">${displayValue}</span></div>`;
          }).join('')}
          ${Object.keys(data).length > 5 ? `<div class="text-zinc-400 text-xs">+${Object.keys(data).length - 5} more fields</div>` : ''}
        </div>
      `;
    }

    return `<div class="text-white text-sm">${data}</div>`;
  }

  showRestoreModal(backupId) {
    const options = [
      { value: 'settings', label: '⚙️ Server Settings', desc: 'Overwrites current server settings' },
      { value: 'rules', label: '📋 Server Rules', desc: 'Replaces all current rules' },
      { value: 'automod', label: '🛡️ AutoMod Settings', desc: 'Overwrites automod configuration' },
      { value: 'levelRoles', label: '⭐ Level Roles', desc: 'Restores XP system configuration' }
    ];

    const checkboxes = options.map(opt =>
      `<label class="flex items-start gap-3 p-3 bg-zinc-700 rounded hover:bg-zinc-600 transition cursor-pointer">
        <input type="checkbox" value="${opt.value}" checked class="restore-option mt-1 w-4 h-4">
        <div class="flex-1">
          <div class="font-medium text-white">${opt.label}</div>
          <div class="text-xs text-zinc-400 mt-0.5">${opt.desc}</div>
        </div>
      </label>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content max-w-2xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">🔄 Restore Backup</h3>
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="text-zinc-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div class="font-bold text-yellow-200 mb-1">Warning: This action will overwrite current settings!</div>
              <div class="text-sm text-yellow-200/80">
                Restoring a backup will replace your current configuration with the backed-up version. Make sure you have a recent backup before proceeding.
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <p class="text-zinc-300 mb-4">Select what to restore:</p>
          <div class="space-y-2">
            ${checkboxes}
          </div>
        </div>

        <div class="flex gap-3 justify-end">
          <button onclick="this.closest('.modal-backdrop').remove()"
                  class="btn-secondary px-6 py-2.5">
            Cancel
          </button>
          <button onclick="window.backupManager.restoreBackup(${backupId}, this)"
                  class="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded font-medium transition">
            Restore Backup
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async restoreBackup(backupId, btnElement) {
    const modal = btnElement.closest('.modal-backdrop');
    const options = {};

    modal.querySelectorAll('.restore-option').forEach(cb => {
      const key = `restore${cb.value.charAt(0).toUpperCase() + cb.value.slice(1)}`;
      options[key] = cb.checked;
    });

    if (window.Utils) {
      window.Utils.showLoadingOverlay('Restoring backup...');
    }

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ backupId, options })
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast(`Backup restored successfully! Restored: ${result.data.restored.join(', ')}`, 'success');
        } else {
          alert(`Backup restored successfully! Restored: ${result.data.restored.join(', ')}`);
        }
        modal.remove();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to restore backup: ' + result.error, 'error');
        } else {
          alert('Failed to restore backup: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to restore backup', 'error');
      } else {
        alert('Failed to restore backup');
      }
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  async deleteBackup(backupId) {
    const confirmed = window.Utils
      ? await window.Utils.confirmAction('Are you sure you want to delete this backup? This action cannot be undone.', 'Delete', 'Cancel')
      : confirm('Are you sure you want to delete this backup? This action cannot be undone.');

    if (!confirmed) {
      return;
    }

    if (window.Utils) {
      window.Utils.showLoadingOverlay('Deleting backup...');
    }

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/${backupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast('Backup deleted successfully!', 'success');
        } else {
          alert('Backup deleted successfully!');
        }
        await this.loadBackups();
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to delete backup: ' + result.error, 'error');
        } else {
          alert('Failed to delete backup: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to delete backup', 'error');
      } else {
        alert('Failed to delete backup');
      }
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  async loadSystemBackups() {
    try {
      const response = await fetch('/api/system/backups', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to load system backups:', error);
      return [];
    }
  }

  async loadAndRenderSystemBackups() {
    this.systemBackups = await this.loadSystemBackups();
    this.renderSystemBackups();
  }

  async loadAndRenderAutoBackupStatus() {
    this.autoBackupStatus = await this.loadAutoBackupStatus();
    this.renderAutoBackupStatus();
  }

  renderSystemBackups() {
    const container = document.getElementById('system-backups-list');
    if (!container) return;

    container.innerHTML = '';

    const autoBackups = this.systemBackups.filter(backup => backup.isAuto);

    if (autoBackups.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-zinc-400">
          <p class="text-sm">No auto backups found</p>
          <p class="text-xs mt-1">Enable auto-backup to start creating automatic backups</p>
        </div>
      `;
      return;
    }

    autoBackups.forEach(backup => {
      const div = document.createElement('div');
      div.className = 'bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors';

      const date = new Date(backup.date).toLocaleString();

      div.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">⏰</span>
              <h4 class="font-medium text-white">${window.Utils ? window.Utils.escapeHtml(backup.name) : backup.name}</h4>
              <span class="text-xs text-blue-400 font-semibold px-2 py-0.5 bg-zinc-800 rounded">Auto</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-zinc-400">
              <span>📅 ${date}</span>
              <span>💾 ${backup.size}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              onclick="window.backupManager.restoreSystemBackup('${backup.name}')"
              class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-xs font-medium transition"
            >
              Restore
            </button>
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  }

  renderAutoBackupStatus() {
    const statusDiv = document.getElementById('autobackup-status');
    const toggle = document.getElementById('autobackup-toggle');
    const intervalContainer = document.getElementById('autobackup-interval-container');

    if (!statusDiv || !toggle) return;

    if (this.autoBackupStatus) {
      toggle.checked = this.autoBackupStatus.enabled;

      if (this.autoBackupStatus.enabled) {
        statusDiv.innerHTML = `
          <span class="text-green-400 font-medium">✓ Active</span>
          <span class="text-zinc-500 text-xs ml-1">(${this.autoBackupStatus.totalBackups} backups)</span>
        `;
        if (intervalContainer) {
          intervalContainer.style.display = 'flex';
        }
      } else {
        statusDiv.innerHTML = '<span class="text-zinc-400">Inactive</span>';
        if (intervalContainer) {
          intervalContainer.style.display = 'none';
        }
      }
    } else {
      statusDiv.innerHTML = '<span class="text-red-400">Error</span>';
    }
  }

  async loadAutoBackupStatus() {
    try {
      const response = await fetch('/api/system/backups/status', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load auto-backup status:', error);
      return null;
    }
  }

  async toggleAutoBackup(enabled, intervalHours = 24) {
    try {
      const response = await fetch('/api/system/backups/auto-backup/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled, intervalHours })
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast(`Auto-backup ${enabled ? 'enabled' : 'disabled'}`, 'success');
        }
        return result.data;
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to toggle auto-backup', 'error');
        }
        return null;
      }
    } catch (error) {
      console.error('Failed to toggle auto-backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to toggle auto-backup', 'error');
      }
      return null;
    }
  }

  async createSystemBackup() {
    try {
      if (window.Utils) {
        window.Utils.showLoadingOverlay('Creating database backup...');
      }

      const response = await fetch('/api/system/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast('Database backup created successfully', 'success');
        }
        return true;
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to create backup: ' + (result.error || ''), 'error');
        }
        return false;
      }
    } catch (error) {
      console.error('Failed to create system backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to create backup', 'error');
      }
      return false;
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }

  async restoreSystemBackup(backupName) {
    if (!confirm(`Are you sure you want to restore the entire database from "${backupName}"? This will replace all current data. The bot may need to restart.`)) {
      return false;
    }

    try {
      if (window.Utils) {
        window.Utils.showLoadingOverlay('Restoring database backup...');
      }

      const response = await fetch('/api/system/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ backupName })
      });

      const result = await response.json();

      if (result.success) {
        if (window.Utils) {
          window.Utils.showToast('Database restored successfully. The bot may restart.', 'success');
        }
        return true;
      } else {
        if (window.Utils) {
          window.Utils.showToast('Failed to restore backup: ' + (result.error || ''), 'error');
        }
        return false;
      }
    } catch (error) {
      console.error('Failed to restore system backup:', error);
      if (window.Utils) {
        window.Utils.showToast('Failed to restore backup', 'error');
      }
      return false;
    } finally {
      if (window.Utils) {
        window.Utils.hideLoadingOverlay();
      }
    }
  }
}

window.BackupManager = BackupManager;
