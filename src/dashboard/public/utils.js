const Utils = {
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  },

  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-in ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' :
      type === 'warning' ? 'bg-yellow-600' :
      'bg-blue-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-slide-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  validateSnowflake(id) {
    return /^\d{17,20}$/.test(id);
  },

  validateChannelIds(input) {
    if (!input || !input.trim()) return { valid: true, ids: [] };

    const ids = input.split(/[,\n]/).map(id => id.trim()).filter(id => id.length > 0);
    const invalid = ids.filter(id => !this.validateSnowflake(id));

    if (invalid.length > 0) {
      return { valid: false, invalid, ids: [] };
    }

    return { valid: true, ids };
  },

  showLoadingOverlay(message = 'Loading...') {
    const existing = document.getElementById('loading-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-zinc-800 px-8 py-6 rounded-lg shadow-xl flex items-center space-x-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <span class="text-white font-medium">${this.escapeHtml(message)}</span>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  },

  confirmAction(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h3 class="text-xl font-bold text-white mb-4">Confirm Action</h3>
          <p class="text-zinc-300 mb-6">${this.escapeHtml(message)}</p>
          <div class="flex justify-end space-x-3">
            <button class="cancel-btn px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded transition">
              ${this.escapeHtml(cancelText)}
            </button>
            <button class="confirm-btn px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition text-white">
              ${this.escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      const cleanup = () => {
        modal.remove();
      };

      modal.querySelector('.cancel-btn').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      modal.querySelector('.confirm-btn').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });

      document.body.appendChild(modal);
    });
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Copied to clipboard!', 'success');
      }).catch(() => {
        this.showToast('Failed to copy', 'error');
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('Copied to clipboard!', 'success');
      } catch (err) {
        this.showToast('Failed to copy', 'error');
      }
      document.body.removeChild(textArea);
    }
  }
};

window.Utils = Utils;
