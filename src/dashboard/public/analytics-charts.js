class AnalyticsCharts {
  constructor() {
    this.charts = {};
    this.timeRange = '7d';
  }

  async init() {
    this.setupEventListeners();
    await this.loadStatCards();
    await this.loadAllCharts();
  }

  setupEventListeners() {
    const timeRangeBtns = document.querySelectorAll('[data-time-range]');
    timeRangeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setTimeRange(e.target.dataset.timeRange);
      });
    });
  }

  setTimeRange(range) {
    this.timeRange = range;
    this.loadAllCharts();

    document.querySelectorAll('[data-time-range]').forEach(btn => {
      btn.classList.remove('bg-indigo-600', 'text-white');
      btn.classList.add('bg-zinc-700', 'text-zinc-300');
    });

    const activeBtn = document.querySelector(`[data-time-range="${range}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-zinc-700', 'text-zinc-300');
      activeBtn.classList.add('bg-indigo-600', 'text-white');
    }
  }

  getTimeRangeTimestamps() {
    const now = Math.floor(Date.now() / 1000);
    const ranges = {
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000
    };

    const seconds = ranges[this.timeRange] || 604800;
    return {
      from: now - seconds,
      to: now
    };
  }

  async loadStatCards() {
    try {
      const stats = window.guildData?.stats;
      if (!stats) return;

      const statCards = document.querySelectorAll('#analytics-stats-container .text-3xl');
      if (statCards.length >= 4) {
        const totalMessages = stats.analytics?.totalMessages;
        const activeMembers = stats.analytics?.activeMembers || stats.members?.total;
        const commandsUsed = stats.analytics?.commandsUsed;
        const modActions = stats.moderation?.total;

        if (totalMessages !== undefined && totalMessages !== null) {
          statCards[0].textContent = totalMessages.toLocaleString();
        }
        if (activeMembers !== undefined && activeMembers !== null) {
          statCards[1].textContent = activeMembers.toLocaleString();
        }
        if (commandsUsed !== undefined && commandsUsed !== null) {
          statCards[2].textContent = commandsUsed.toLocaleString();
        }
        if (modActions !== undefined && modActions !== null) {
          statCards[3].textContent = modActions.toLocaleString();
        }
      }
    } catch (error) {
      console.error('Failed to load stat cards:', error);
    }
  }

  async loadAllCharts() {
    await Promise.all([
      this.loadMessagesChart(),
      this.loadMembersChart(),
      this.loadCommandsChart(),
      this.loadModerationChart(),
      this.loadTopUsers(),
      this.loadTopChannels()
    ]);
  }

  async loadMessagesChart() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/messages?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderLineChart('messages-chart', 'Messages', result.data, '#3B82F6');
      }
    } catch (error) {
      console.error('Failed to load messages analytics:', error);
    }
  }

  async loadMembersChart() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/members?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderMemberChart('members-chart', result.data);
      }
    } catch (error) {
      console.error('Failed to load members analytics:', error);
    }
  }

  async loadCommandsChart() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/commands?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderLineChart('commands-chart', 'Commands', result.data, '#10B981');
      }
    } catch (error) {
      console.error('Failed to load commands analytics:', error);
    }
  }

  async loadModerationChart() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/moderation?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderLineChart('moderation-chart', 'Moderation Actions', result.data, '#EF4444');
      }
    } catch (error) {
      console.error('Failed to load moderation analytics:', error);
    }
  }

  async loadTopUsers() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/top-users?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderTopUsersList('top-users-list', result.data);
      }
    } catch (error) {
      console.error('Failed to load top users:', error);
    }
  }

  async loadTopChannels() {
    try {
      const guildId = window.currentGuildId;
      const { from, to } = this.getTimeRangeTimestamps();
      const response = await fetch(`/api/guilds/${guildId}/analytics/top-channels?from=${from}&to=${to}`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderTopChannelsList('top-channels-list', result.data);
      }
    } catch (error) {
      console.error('Failed to load top channels:', error);
    }
  }

  renderLineChart(canvasId, label, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    if (!data || data.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#71717a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No analytics data available yet', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#52525b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Data will appear here once tracking begins', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }

    const labels = data.map(d => new Date(d.time_bucket * 1000).toLocaleDateString());
    const values = data.map(d => d.value);

    this.charts[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: values,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: color,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  renderMemberChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    if (!data || !data.joins || data.joins.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#71717a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No member analytics data available yet', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#52525b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Data will appear here once tracking begins', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }

    const labels = data.joins.map(d => new Date(d.time_bucket * 1000).toLocaleDateString());
    const joins = data.joins.map(d => d.value);
    const leaves = data.leaves.map(d => d.value);

    this.charts[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Joins',
            data: joins,
            borderColor: '#10B981',
            backgroundColor: '#10B98120',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true
          },
          {
            label: 'Leaves',
            data: leaves,
            borderColor: '#EF4444',
            backgroundColor: '#EF444420',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  renderTopUsersList(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-zinc-500"><p class="text-sm">No data available</p></div>';
      return;
    }

    data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg mb-2 hover:bg-zinc-700/50 transition-colors cursor-pointer';
      div.onclick = () => {
        navigator.clipboard.writeText(item.userId);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = 'User ID copied!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      };

      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold text-zinc-400">#${index + 1}</span>
          ${item.avatar ? `<img src="${item.avatar}" alt="${item.username}" class="w-8 h-8 rounded-full">` : '<div class="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs text-zinc-300">?</div>'}
          <div class="flex flex-col">
            <span class="font-medium text-white">${item.username}</span>
            <span class="text-xs text-zinc-500">${item.userId}</span>
          </div>
        </div>
        <span class="text-sm text-zinc-400">${item.messageCount} messages</span>
      `;
      container.appendChild(div);
    });
  }

  renderTopChannelsList(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-zinc-500"><p class="text-sm">No data available</p></div>';
      return;
    }

    data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg mb-2 hover:bg-zinc-700/50 transition-colors cursor-pointer';
      div.onclick = () => {
        navigator.clipboard.writeText(item.channelId);
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = 'Channel ID copied!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      };

      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold text-zinc-400">#${index + 1}</span>
          <div class="flex items-center gap-2">
            <span class="text-zinc-400">#</span>
            <div class="flex flex-col">
              <span class="font-medium text-white">${item.channelName}</span>
              <span class="text-xs text-zinc-500">${item.channelId}</span>
            </div>
          </div>
        </div>
        <span class="text-sm text-zinc-400">${item.messageCount} messages</span>
      `;
      container.appendChild(div);
    });
  }
}

window.AnalyticsCharts = AnalyticsCharts;
