let consoleWs = null;
let consoleLogs = [];
let consoleAutoScroll = true;
let consoleFilter = 'all';
let consoleSearch = '';

function initConsoleWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/logs`;

  consoleWs = new WebSocket(wsUrl);

  consoleWs.onopen = () => {
    console.log('Console WebSocket connected');
    updateConsoleStatus('connected');
  };

  consoleWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleConsoleMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  consoleWs.onclose = () => {
    console.log('Console WebSocket disconnected');
    updateConsoleStatus('disconnected');
  };

  consoleWs.onerror = (error) => {
    console.error('Console WebSocket error:', error);
    updateConsoleStatus('error');
  };
}

function handleConsoleMessage(message) {
  switch (message.type) {
    case 'connected':
      break;

    case 'init':
      consoleLogs = message.logs || [];
      updateConsoleDisplay();
      break;

    case 'log':
      consoleLogs.push(message.data);
      if (consoleLogs.length > 1000) {
        consoleLogs.shift();
      }
      renderNewLog(message.data);
      break;

    case 'clear':
      consoleLogs = [];
      updateConsoleDisplay();
      break;

    case 'stats':
      break;
  }
}

function updateConsoleDisplay() {
  const outputEl = document.getElementById('console-output');
  if (outputEl) {
    outputEl.innerHTML = renderConsoleOutput();
    if (consoleAutoScroll) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }
}

function updateConsoleStatus(status) {
  const statusEl = document.getElementById('console-status');
  if (!statusEl) return;

  if (status === 'connected') {
    statusEl.innerHTML = '<span class="text-green-400">● Connected</span>';
  } else if (status === 'disconnected') {
    statusEl.innerHTML = '<span class="text-yellow-400">● Reconnecting...</span>';
  } else if (status === 'error') {
    statusEl.innerHTML = '<span class="text-red-400">● Error</span>';
  }
}

function renderConsoleTab() {
  if (!consoleWs || consoleWs.readyState === WebSocket.CLOSED) {
    initConsoleWebSocket();
  }

  return `
    <div class="container mx-auto p-6 max-w-7xl">
      <div class="bg-zinc-800 rounded-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-2xl font-bold">Console Logs</h2>
            <p class="text-zinc-400 text-sm mt-1">Real-time bot console output</p>
          </div>
          <div class="flex items-center gap-4">
            <div id="console-status" class="text-sm">
              <span class="text-zinc-400">● Connecting...</span>
            </div>
            <button onclick="clearConsoleLogs()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition">
              Clear Logs
            </button>
          </div>
        </div>

        <div class="mb-4 flex gap-4 flex-wrap">
          <div class="flex gap-2">
            <button onclick="setConsoleFilter('all')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              All
            </button>
            <button onclick="setConsoleFilter('info')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'info' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              Info
            </button>
            <button onclick="setConsoleFilter('success')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'success' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              Success
            </button>
            <button onclick="setConsoleFilter('warn')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'warn' ? 'bg-yellow-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              Warnings
            </button>
            <button onclick="setConsoleFilter('error')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              Errors
            </button>
            <button onclick="setConsoleFilter('debug')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'debug' ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              Debug
            </button>
            <button onclick="setConsoleFilter('system')" class="px-3 py-1.5 rounded text-sm transition ${consoleFilter === 'system' ? 'bg-cyan-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">
              System
            </button>
          </div>

          <div class="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search logs..."
              value="${consoleSearch}"
              oninput="setConsoleSearch(this.value)"
              class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              ${consoleAutoScroll ? 'checked' : ''}
              onchange="toggleConsoleAutoScroll(this.checked)"
              class="w-4 h-4"
            >
            <span class="text-sm text-zinc-300">Auto-scroll</span>
          </label>
        </div>

        <div
          id="console-output"
          class="bg-black rounded border border-zinc-700 p-4 h-[600px] overflow-y-auto font-mono text-sm scrollbar-thin"
        >
          ${renderConsoleOutput()}
        </div>

        <div class="mt-4 text-xs text-zinc-500 flex justify-between">
          <span>Showing ${getFilteredLogs().length} of ${consoleLogs.length} logs</span>
          <button onclick="exportConsoleLogs()" class="text-indigo-400 hover:text-indigo-300 transition">
            Export Logs
          </button>
        </div>
      </div>
    </div>
  `;
}

function getFilteredLogs() {
  let filtered = consoleLogs;

  if (consoleFilter !== 'all') {
    filtered = filtered.filter(log => log.level === consoleFilter);
  }

  if (consoleSearch) {
    const searchLower = consoleSearch.toLowerCase();
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

function renderConsoleOutput() {
  const filtered = getFilteredLogs();

  if (filtered.length === 0) {
    return '<div class="text-zinc-500 text-center py-8">No logs to display</div>';
  }

  return filtered.map(log => renderLogEntry(log)).join('');
}

function renderLogEntry(log) {
  const colors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-purple-400',
    system: 'text-cyan-400'
  };

  const badges = {
    info: 'bg-blue-900/30 text-blue-400',
    success: 'bg-green-900/30 text-green-400',
    warn: 'bg-yellow-900/30 text-yellow-400',
    error: 'bg-red-900/30 text-red-400',
    debug: 'bg-purple-900/30 text-purple-400',
    system: 'bg-cyan-900/30 text-cyan-400'
  };

  const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  const color = colors[log.level] || 'text-zinc-400';
  const badge = badges[log.level] || 'bg-zinc-700 text-zinc-400';

  return `
    <div class="log-entry py-1 border-b border-zinc-900 hover:bg-zinc-900/50" data-log-id="${log.id}">
      <span class="text-zinc-600">${timestamp}</span>
      <span class="ml-2 px-2 py-0.5 rounded text-xs ${badge}">${log.level.toUpperCase()}</span>
      <span class="ml-2 ${color}">${escapeHtml(log.message)}</span>
    </div>
  `;
}

function renderNewLog(log) {
  const outputEl = document.getElementById('console-output');
  if (!outputEl) return;

  if (consoleFilter !== 'all' && log.level !== consoleFilter) {
    return;
  }

  if (consoleSearch && !log.message.toLowerCase().includes(consoleSearch.toLowerCase())) {
    return;
  }

  const logHtml = renderLogEntry(log);
  outputEl.insertAdjacentHTML('beforeend', logHtml);

  if (consoleAutoScroll) {
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  const logCountEl = document.querySelector('#console-output + .mt-4 span');
  if (logCountEl) {
    logCountEl.textContent = `Showing ${getFilteredLogs().length} of ${consoleLogs.length} logs`;
  }
}

function setConsoleFilter(filter) {
  consoleFilter = filter;
  renderGuildDashboard();
}

function setConsoleSearch(search) {
  consoleSearch = search;
  const outputEl = document.getElementById('console-output');
  if (outputEl) {
    outputEl.innerHTML = renderConsoleOutput();
    if (consoleAutoScroll) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }
}

function toggleConsoleAutoScroll(enabled) {
  consoleAutoScroll = enabled;
}

async function clearConsoleLogs() {
  if (!confirm('Are you sure you want to clear all console logs?')) {
    return;
  }

  try {
    const res = await fetch('/api/logs/clear', { method: 'DELETE' });
    const result = await res.json();

    if (result.success) {
      consoleLogs = [];
      const outputEl = document.getElementById('console-output');
      if (outputEl) {
        outputEl.innerHTML = '<div class="text-zinc-500 text-center py-8">No logs to display</div>';
      }
    }
  } catch (error) {
    console.error('Failed to clear logs:', error);
    alert('Failed to clear logs');
  }
}

function exportConsoleLogs() {
  const filtered = getFilteredLogs();
  const text = filtered.map(log => {
    const timestamp = new Date(log.timestamp).toISOString();
    return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
  }).join('\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `console-logs-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function cleanupConsoleWebSocket() {
  if (consoleWs) {
    consoleWs.close();
    consoleWs = null;
  }
}
