class SecurityManager {
  constructor() {
    this.currentGuildId = null;
    this.lockdownStatus = null;
  }

  async init() {
    this.currentGuildId = window.currentGuildId;
    if (!this.currentGuildId) {
      console.warn('SecurityManager: No guild ID available');
      return;
    }
    await this.loadLockdownStatus();
    await this.loadAutomodSettings();
    this.setupEventListeners();
  }

  async loadLockdownStatus() {
    try {
      const response = await fetch(`/api/antiraid/status/${this.currentGuildId}`);
      const result = await response.json();

      if (result.success) {
        this.lockdownStatus = result.data.lockdown;
        this.updateLockdownUI();
      }
    } catch (error) {
      console.error('Failed to load lockdown status:', error);
    }
  }

  async loadAutomodSettings() {
    try {
      const response = await fetch(`/api/guilds/${this.currentGuildId}/automod`);
      const result = await response.json();

      if (result.success && result.data) {
        this.updateSecurityToggles(result.data);
      }
    } catch (error) {
      console.error('Failed to load automod settings:', error);
    }
  }

  updateLockdownUI() {
    const statusElement = document.getElementById('lockdown-status');
    const toggleButton = document.getElementById('lockdown-toggle-btn');
    const statusText = document.getElementById('lockdown-status-text');

    if (!statusElement || !toggleButton || !statusText) return;

    if (this.lockdownStatus && this.lockdownStatus.active) {
      statusElement.classList.add('status-danger');
      statusElement.classList.remove('status-success');
      statusText.textContent = 'LOCKDOWN ACTIVE';
      toggleButton.textContent = 'Disable Lockdown';
      toggleButton.classList.add('btn-danger');
      toggleButton.classList.remove('btn-warning');

      const timeElement = document.getElementById('lockdown-time');
      if (timeElement && this.lockdownStatus.started_at) {
        const startedAt = new Date(this.lockdownStatus.started_at * 1000);
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000 / 60);
        timeElement.textContent = `Active for ${elapsed} minutes`;
      }
    } else {
      statusElement.classList.add('status-success');
      statusElement.classList.remove('status-danger');
      statusText.textContent = 'Lockdown Inactive';
      toggleButton.textContent = 'Enable Lockdown';
      toggleButton.classList.add('btn-warning');
      toggleButton.classList.remove('btn-danger');

      const timeElement = document.getElementById('lockdown-time');
      if (timeElement) {
        timeElement.textContent = 'Not active';
      }
    }
  }

  updateSecurityToggles(settings) {
    const toggles = {
      'phishing-enabled': settings.phishing_enabled === 1,
      'account-age-enabled': settings.account_age_enabled === 1,
      'alt-detection-enabled': settings.alt_detection_enabled === 1
    };

    Object.entries(toggles).forEach(([id, enabled]) => {
      const toggle = document.getElementById(id);
      if (toggle) {
        toggle.checked = enabled;
      }
    });

    const phishingAction = document.getElementById('phishing-action');
    if (phishingAction && settings.phishing_action) {
      phishingAction.value = settings.phishing_action;
    }

    const accountAgeMinDays = document.getElementById('account-age-min-days');
    if (accountAgeMinDays && settings.account_age_min_days) {
      accountAgeMinDays.value = settings.account_age_min_days;
    }

    const accountAgeAction = document.getElementById('account-age-action');
    if (accountAgeAction && settings.account_age_action) {
      accountAgeAction.value = settings.account_age_action;
    }

    const altSensitivity = document.getElementById('alt-detection-sensitivity');
    if (altSensitivity && settings.alt_detection_sensitivity) {
      altSensitivity.value = settings.alt_detection_sensitivity;
    }

    const altAction = document.getElementById('alt-detection-action');
    if (altAction && settings.alt_detection_action) {
      altAction.value = settings.alt_detection_action;
    }
  }

  setupEventListeners() {
    const lockdownToggle = document.getElementById('lockdown-toggle-btn');
    if (lockdownToggle) {
      lockdownToggle.addEventListener('click', () => this.toggleLockdown());
    }
  }

  async toggleLockdown() {
    const button = document.getElementById('lockdown-toggle-btn');
    if (!button) return;

    const action = this.lockdownStatus && this.lockdownStatus.active ? 'disable' : 'enable';

    button.disabled = true;
    button.textContent = action === 'enable' ? 'Activating...' : 'Deactivating...';

    try {
      const response = await fetch(`/api/antiraid/lockdown/${this.currentGuildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const result = await response.json();

      if (result.success) {
        this.lockdownStatus = result.data.lockdown;
        this.updateLockdownUI();
        this.showNotification(`Lockdown ${action}d successfully`, 'success');
      } else {
        this.showNotification(`Failed to ${action} lockdown: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to toggle lockdown:', error);
      this.showNotification(`Failed to ${action} lockdown`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

window.SecurityManager = SecurityManager;
