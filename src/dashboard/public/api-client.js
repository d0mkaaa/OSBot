class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        window.location.href = '/auth/discord';
        throw new Error('Authentication required');
      }

      if (response.status === 403) {
        Utils.showToast('You do not have permission to perform this action', 'error');
        throw new Error('Permission denied');
      }

      if (response.status === 429) {
        Utils.showToast('Too many requests. Please slow down.', 'warning');
        throw new Error('Rate limited');
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          const errorMsg = data.details.join(', ');
          Utils.showToast(errorMsg, 'error');
        } else if (data.error) {
          Utils.showToast(data.error, 'error');
        } else {
          Utils.showToast(`Request failed: ${response.status}`, 'error');
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        Utils.showToast('Network error. Please check your connection.', 'error');
      }
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const API = {
  client: new APIClient('/api'),

  async checkAuth() {
    const res = await fetch('/auth/user');
    return res.json();
  },

  async fetchLocales() {
    return this.client.get('/locales');
  },

  async fetchUser() {
    return this.client.get('/user');
  },

  async fetchGuilds() {
    return this.client.get('/guilds');
  },

  async fetchGuildData(guildId) {
    return this.client.get(`/guilds/${guildId}`);
  },

  async fetchGuildConfig(guildId) {
    return this.client.get(`/guilds/${guildId}/config`);
  },

  async updateGuildConfig(guildId, config) {
    return this.client.patch(`/guilds/${guildId}/config`, config);
  },

  async fetchAutomod(guildId) {
    return this.client.get(`/guilds/${guildId}/automod`);
  },

  async updateAutomod(guildId, config) {
    return this.client.patch(`/guilds/${guildId}/automod`, config);
  },

  async fetchRules(guildId) {
    return this.client.get(`/guilds/${guildId}/rules`);
  },

  async addRule(guildId, title, description) {
    return this.client.post(`/guilds/${guildId}/rules`, { title, description });
  },

  async updateRule(guildId, ruleId, title, description) {
    return this.client.patch(`/guilds/${guildId}/rules/${ruleId}`, { title, description });
  },

  async deleteRule(guildId, ruleId) {
    return this.client.delete(`/guilds/${guildId}/rules/${ruleId}`);
  },

  async fetchWarnings(guildId, userId = null, limit = 100) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (userId) params.append('user_id', userId);
    return this.client.get(`/guilds/${guildId}/warnings?${params}`);
  },

  async fetchCases(guildId, limit = 100) {
    return this.client.get(`/guilds/${guildId}/cases?limit=${limit}`);
  },

  async deleteWarning(guildId, warningId) {
    return this.client.delete(`/guilds/${guildId}/warnings/${warningId}`);
  },

  async fetchUserInfo(guildId, userId) {
    return this.client.get(`/guilds/${guildId}/users/${userId}`);
  },

  async fetchAuditLogs(guildId, limit = 100) {
    return this.client.get(`/guilds/${guildId}/audit?limit=${limit}`);
  },

  async fetchLogs(guildId, limit = 100) {
    return this.client.get(`/guilds/${guildId}/logs?limit=${limit}`);
  },

  async fetchTickets(guildId) {
    return this.client.get(`/guilds/${guildId}/tickets`);
  },

  async fetchTicketTranscript(guildId, ticketId) {
    return this.client.get(`/guilds/${guildId}/tickets/${ticketId}/transcript`);
  },

  async fetchStats(guildId) {
    return this.client.get(`/guilds/${guildId}/stats`);
  },

  async fetchGuildStats(guildId) {
    return this.client.get(`/guilds/${guildId}/stats`);
  },

  async fetchConsoleLogs(limit = 1000) {
    return this.client.get(`/console/logs?limit=${limit}`);
  },

  async fetchModerationQueue(guildId) {
    return this.client.get(`/guilds/${guildId}/moderation-queue`);
  },

  async fetchGuildChannels(guildId) {
    return this.client.get(`/guilds/${guildId}/channels`);
  },

  async fetchGuildRoles(guildId) {
    return this.client.get(`/guilds/${guildId}/roles`);
  },

  async fetchCustomFilters(guildId) {
    return this.client.get(`/guilds/${guildId}/automod/filters`);
  },

  async addCustomFilter(guildId, name, pattern, action, enabled) {
    return this.client.post(`/guilds/${guildId}/automod/filters`, { name, pattern, action, enabled });
  },

  async updateCustomFilter(guildId, name, updates) {
    return this.client.patch(`/guilds/${guildId}/automod/filters/${encodeURIComponent(name)}`, updates);
  },

  async deleteCustomFilter(guildId, name) {
    return this.client.delete(`/guilds/${guildId}/automod/filters/${encodeURIComponent(name)}`);
  },

  async fetchXPBoosters(guildId) {
    return this.client.get(`/guilds/${guildId}/xp/boosters`);
  },

  async addXPBooster(guildId, type, targetId, multiplier) {
    return this.client.post(`/guilds/${guildId}/xp/boosters`, { type, target_id: targetId, multiplier });
  },

  async updateXPBooster(guildId, type, targetId, multiplier) {
    return this.client.patch(`/guilds/${guildId}/xp/boosters/${type}/${targetId}`, { multiplier });
  },

  async deleteXPBooster(guildId, type, targetId) {
    return this.client.delete(`/guilds/${guildId}/xp/boosters/${type}/${targetId}`);
  }
};

window.API = API;
