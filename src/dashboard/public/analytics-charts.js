class AnalyticsCharts {
  constructor() {
    this.charts = {};
    this.timeRange = '7d';
  }

  async init() {
    this.setupEventListeners();
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
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-gray-200', 'text-gray-700');
    });

    const activeBtn = document.querySelector(`[data-time-range="${range}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
      activeBtn.classList.add('bg-blue-600', 'text-white');
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
        this.renderTopList('top-users-list', result.data, 'messageCount');
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
        this.renderTopList('top-channels-list', result.data, 'messageCount', 'channelId');
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

  renderTopList(containerId, data, countKey, idKey = 'userId') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<div class="text-gray-500 text-center py-4">No data available</div>';
      return;
    }

    data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 border-b hover:bg-gray-50';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold text-gray-400">#${index + 1}</span>
          <span class="font-medium">${item[idKey]}</span>
        </div>
        <span class="text-sm text-gray-600">${item[countKey]} messages</span>
      `;
      container.appendChild(div);
    });
  }
}

window.AnalyticsCharts = AnalyticsCharts;
