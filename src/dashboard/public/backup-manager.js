class BackupManager {
  constructor() {
    this.backups = [];
  }

  async init() {
    this.setupEventListeners();
    await this.loadBackups();
  }

  setupEventListeners() {
    const createBtn = document.getElementById('backup-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateModal());
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
    }
  }

  renderBackups() {
    const container = document.getElementById('backups-list');
    if (!container) return;

    container.innerHTML = '';

    if (this.backups.length === 0) {
      container.innerHTML = '<div class="text-gray-500 text-center py-8">No backups found. Create your first backup!</div>';
      return;
    }

    this.backups.forEach(backup => {
      const div = this.createBackupElement(backup);
      container.appendChild(div);
    });
  }

  createBackupElement(backup) {
    const div = document.createElement('div');
    div.className = 'backup-item border rounded-lg p-4 hover:shadow-md transition';

    const date = new Date(backup.createdAt * 1000).toLocaleString();
    const size = (backup.sizeBytes / 1024).toFixed(2);
    const includes = backup.includes.join(', ');

    div.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div>
          <h4 class="font-semibold text-lg">${backup.name}</h4>
          <p class="text-sm text-gray-600">Created ${date}</p>
          <p class="text-sm text-gray-600">Size: ${size} KB</p>
        </div>
        <div class="flex gap-2">
          <button onclick="window.backupManager.downloadBackup(${backup.id})"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
            📥 Download
          </button>
          <button onclick="window.backupManager.previewBackup(${backup.id})"
                  class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm">
            👁️ Preview
          </button>
          <button onclick="window.backupManager.showRestoreModal(${backup.id})"
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
            🔄 Restore
          </button>
          <button onclick="window.backupManager.deleteBackup(${backup.id})"
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
            🗑️ Delete
          </button>
        </div>
      </div>
      <div class="text-sm">
        <strong>Includes:</strong> ${includes}
      </div>
      <div class="text-xs text-gray-500 mt-2">
        Created by: ${backup.createdBy}
      </div>
    `;

    return div;
  }

  showCreateModal() {
    const options = ['settings', 'roles', 'channels', 'rules', 'automod', 'levelRoles'];
    const checkboxes = options.map(opt =>
      `<label class="flex items-center gap-2">
        <input type="checkbox" value="${opt}" checked class="backup-include-option">
        <span>${opt}</span>
      </label>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">Create Backup</h3>
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-3">Select what to include:</p>
          <div class="space-y-2">
            ${checkboxes}
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button onclick="this.closest('.fixed').remove()"
                  class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
            Cancel
          </button>
          <button onclick="window.backupManager.createBackup(this)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Create
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  async createBackup(btnElement) {
    const modal = btnElement.closest('.fixed');
    const checkedOptions = Array.from(modal.querySelectorAll('.backup-include-option:checked'))
      .map(cb => cb.value);

    if (checkedOptions.length === 0) {
      alert('Please select at least one option');
      return;
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
        alert('Backup created successfully!');
        modal.remove();
        await this.loadBackups();
      } else {
        alert('Failed to create backup: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('Failed to create backup');
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

  async previewBackup(backupId) {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/${backupId}/preview`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.showPreviewModal(result.data);
      } else {
        alert('Failed to preview backup: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to preview backup:', error);
      alert('Failed to preview backup');
    }
  }

  showPreviewModal(data) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">Backup Preview</h3>
        <div class="text-sm">
          <p><strong>Guild:</strong> ${data.guildName}</p>
          <p><strong>Created:</strong> ${new Date(data.createdAt * 1000).toLocaleString()}</p>
          <p><strong>Version:</strong> ${data.version}</p>
          <p class="mt-4"><strong>Includes:</strong></p>
          <ul class="list-disc list-inside ml-4">
            ${data.includes.map(inc => `<li>${inc}</li>`).join('')}
          </ul>
        </div>
        <div class="mt-4 flex justify-end">
          <button onclick="this.closest('.fixed').remove()"
                  class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  showRestoreModal(backupId) {
    const options = ['settings', 'rules', 'automod', 'levelRoles'];
    const checkboxes = options.map(opt =>
      `<label class="flex items-center gap-2">
        <input type="checkbox" value="${opt}" checked class="restore-option">
        <span>Restore ${opt}</span>
      </label>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">⚠️ Restore Backup</h3>
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Warning: This will overwrite current settings!
        </div>
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-3">Select what to restore:</p>
          <div class="space-y-2">
            ${checkboxes}
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button onclick="this.closest('.fixed').remove()"
                  class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
            Cancel
          </button>
          <button onclick="window.backupManager.restoreBackup(${backupId}, this)"
                  class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Restore
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  async restoreBackup(backupId, btnElement) {
    const modal = btnElement.closest('.fixed');
    const options = {};

    modal.querySelectorAll('.restore-option').forEach(cb => {
      const key = `restore${cb.value.charAt(0).toUpperCase() + cb.value.slice(1)}`;
      options[key] = cb.checked;
    });

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
        alert(`Backup restored successfully! Restored: ${result.data.restored.join(', ')}`);
        modal.remove();
      } else {
        alert('Failed to restore backup: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Failed to restore backup');
    }
  }

  async deleteBackup(backupId) {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/backups/${backupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        alert('Backup deleted successfully!');
        await this.loadBackups();
      } else {
        alert('Failed to delete backup: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert('Failed to delete backup');
    }
  }
}

window.BackupManager = BackupManager;
