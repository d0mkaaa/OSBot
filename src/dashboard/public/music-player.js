let musicInterval = null;

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function initMusicPlayer(guildId) {
  loadMusicQueue(guildId);
  loadMusicSettings(guildId);

  if (musicInterval) {
    clearInterval(musicInterval);
  }

  musicInterval = setInterval(() => loadMusicQueue(guildId), 1000);
}

function cleanupMusicPlayer() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

async function loadMusicQueue(guildId) {
  try {
    const response = await fetch(`/api/music/${guildId}/queue`);
    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load music queue');
      return;
    }

    renderMusicQueue(data.data, guildId);
  } catch (error) {
    console.error('Failed to load music queue:', error);
  }
}

async function loadMusicSettings(guildId) {
  try {
    const response = await fetch(`/api/music/${guildId}/settings`);
    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load music settings');
      return;
    }

    renderMusicSettings(data.data, guildId);
  } catch (error) {
    console.error('Failed to load music settings:', error);
  }
}

function renderMusicQueue(queueData, guildId) {
  const container = document.getElementById('music-queue');
  if (!container) return;

  const { currentTrack, tracks, volume, loopMode, isPaused, isPlaying } = queueData;
  const nowPlaying = currentTrack;

  let html = '';

  if (nowPlaying) {
    const playPauseIcon = isPaused ? '▶️' : '⏸️';
    const playPauseText = isPaused ? 'Resume' : 'Pause';
    const loopIcon = loopMode === 'track' ? '🔂' : loopMode === 'queue' ? '🔁' : '➡️';
    const loopText = loopMode === 'track' ? 'Track' : loopMode === 'queue' ? 'Queue' : 'Off';

    const currentPos = nowPlaying.currentPosition || 0;
    const duration = nowPlaying.duration || 0;
    const progress = duration > 0 ? (currentPos / duration) * 100 : 0;

    html += `
      <div class="space-y-4">
        <div class="flex gap-4">
          <img src="${nowPlaying.thumbnail || 'https://via.placeholder.com/120'}" alt="${nowPlaying.title}" class="w-32 h-32 rounded object-cover">
          <div class="flex-1">
            <h3 class="text-lg font-bold text-white mb-1">
              <a href="${nowPlaying.url}" target="_blank" class="hover:text-indigo-400 transition">${nowPlaying.title}</a>
            </h3>
            <p class="text-sm text-zinc-400 mb-2">Requested by ${nowPlaying.requestedBy?.username || nowPlaying.requestedBy || 'Unknown'}</p>

            <div class="mb-3">
              <div class="flex justify-between text-xs text-zinc-400 mb-1">
                <span>${formatTime(currentPos)}</span>
                <span>${formatTime(duration)}</span>
              </div>
              <div class="w-full bg-zinc-700 rounded-full h-2">
                <div class="bg-indigo-600 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
              </div>
            </div>

            <div class="flex gap-2">
              <button onclick="togglePause('${guildId}')" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm transition">
                ${playPauseIcon} ${playPauseText}
              </button>
              <button onclick="skipTrack('${guildId}')" class="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-sm transition">
                ⏭️ Skip
              </button>
              <button onclick="stopMusic('${guildId}')" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition">
                ⏹️ Stop
              </button>
            </div>
          </div>
        </div>

        <div class="bg-zinc-700/50 p-4 rounded space-y-3">
          <div>
            <label class="block text-sm font-medium mb-2">🔊 Volume: <span id="volume-value">${volume}%</span></label>
            <input type="range" min="0" max="100" value="${volume}"
              class="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              oninput="updateVolume('${guildId}', this.value)">
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Loop Mode</span>
            <button onclick="cycleLoopMode('${guildId}', '${loopMode}')"
              class="bg-zinc-600 hover:bg-zinc-500 px-4 py-2 rounded text-sm transition flex items-center gap-2">
              ${loopIcon} ${loopText}
            </button>
          </div>
        </div>

        <div class="border-t border-zinc-700 pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-white">Queue (${tracks.length} tracks)</h4>
            ${tracks.length > 1 ? `<button onclick="shuffleQueue('${guildId}')" class="text-xs bg-zinc-600 hover:bg-zinc-500 px-3 py-1 rounded transition">🔀 Shuffle</button>` : ''}
          </div>
          ${tracks.length > 0 ? `
            <div class="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              ${tracks.map((track, index) => `
                <div class="flex items-center gap-3 bg-zinc-700/30 p-3 rounded hover:bg-zinc-700/50 transition">
                  <span class="text-zinc-500 text-sm font-bold w-6">${index + 1}</span>
                  <img src="${track.thumbnail || 'https://via.placeholder.com/48'}" alt="${track.title}" class="w-12 h-12 rounded object-cover">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-white truncate">
                      <a href="${track.url}" target="_blank" class="hover:text-indigo-400 transition">${track.title}</a>
                    </div>
                    <div class="text-xs text-zinc-400">${track.duration || 0}s • ${track.requestedBy?.username || track.requestedBy || 'Unknown'}</div>
                  </div>
                  <button onclick="removeTrack('${guildId}', ${index})" class="text-red-400 hover:text-red-300 transition px-2">✖</button>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-zinc-400 text-sm text-center py-4">Queue is empty</p>'}
        </div>
      </div>
    `;
  } else {
    html = '<p class="text-zinc-400 text-center py-8">Nothing is currently playing</p>';
  }

  container.innerHTML = html;
}

function renderMusicSettings(settings, guildId) {
  const container = document.getElementById('music-settings');
  if (!container) return;

  const html = `
    <div class="space-y-4">
      <div class="flex items-center justify-between p-3 bg-zinc-700/50 rounded">
        <span class="text-sm font-medium">Music Module Enabled</span>
        <input type="checkbox" ${settings.enabled ? 'checked' : ''}
          onchange="updateMusicSetting('${guildId}', 'enabled', this.checked ? 1 : 0)"
          class="w-4 h-4 accent-indigo-600">
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Default Volume (%)</label>
        <input type="number" min="0" max="100" value="${settings.volume}"
          onchange="updateMusicSetting('${guildId}', 'volume', parseInt(this.value))"
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
      </div>

      <div class="flex items-center justify-between p-3 bg-zinc-700/50 rounded">
        <span class="text-sm font-medium">Auto Leave When Empty</span>
        <input type="checkbox" ${settings.auto_leave ? 'checked' : ''}
          onchange="updateMusicSetting('${guildId}', 'auto_leave', this.checked ? 1 : 0)"
          class="w-4 h-4 accent-indigo-600">
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Auto Leave Timeout (seconds)</label>
        <input type="number" min="0" value="${settings.auto_leave_timeout}"
          onchange="updateMusicSetting('${guildId}', 'auto_leave_timeout', parseInt(this.value))"
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
      </div>

      <div class="flex items-center justify-between p-3 bg-zinc-700/50 rounded">
        <span class="text-sm font-medium">24/7 Mode (Stay in voice)</span>
        <input type="checkbox" ${settings.twentyfour_seven ? 'checked' : ''}
          onchange="updateMusicSetting('${guildId}', 'twentyfour_seven', this.checked ? 1 : 0)"
          class="w-4 h-4 accent-indigo-600">
      </div>

      <div class="flex items-center justify-between p-3 bg-zinc-700/50 rounded">
        <span class="text-sm font-medium">Vote Skip Enabled</span>
        <input type="checkbox" ${settings.vote_skip_enabled ? 'checked' : ''}
          onchange="updateMusicSetting('${guildId}', 'vote_skip_enabled', this.checked ? 1 : 0)"
          class="w-4 h-4 accent-indigo-600">
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Vote Skip Threshold (%)</label>
        <input type="number" min="0" max="100" value="${settings.vote_skip_threshold}"
          onchange="updateMusicSetting('${guildId}', 'vote_skip_threshold', parseInt(this.value))"
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
        <p class="text-xs text-zinc-400 mt-1">Percentage of listeners needed to skip</p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Max Queue Size</label>
        <input type="number" min="1" max="1000" value="${settings.max_queue_size}"
          onchange="updateMusicSetting('${guildId}', 'max_queue_size', parseInt(this.value))"
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Max Track Duration (seconds)</label>
        <input type="number" min="60" value="${settings.max_track_duration}"
          onchange="updateMusicSetting('${guildId}', 'max_track_duration', parseInt(this.value))"
          class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
        <p class="text-xs text-zinc-400 mt-1">0 = no limit</p>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function togglePause(guildId) {
  try {
    const queue = await fetch(`/api/music/${guildId}/queue`).then(r => r.json());
    const isPaused = queue.data?.isPaused;

    const endpoint = isPaused ? 'resume' : 'pause';
    const response = await fetch(`/api/music/${guildId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to toggle pause', 'error');
  }
}

async function skipTrack(guildId) {
  try {
    const response = await fetch(`/api/music/${guildId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (data.success) {
      showToast('Track skipped', 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to skip track', 'error');
  }
}

async function stopMusic(guildId) {
  if (!confirm('Are you sure you want to stop playback and clear the queue?')) {
    return;
  }

  try {
    const response = await fetch(`/api/music/${guildId}/stop`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (data.success) {
      showToast('Playback stopped', 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to stop playback', 'error');
  }
}

async function updateVolume(guildId, volume) {
  document.getElementById('volume-value').textContent = `${volume}%`;

  try {
    const response = await fetch(`/api/music/${guildId}/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: parseInt(volume) })
    });

    const data = await response.json();
    if (!data.success) {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to update volume', 'error');
  }
}

async function removeTrack(guildId, position) {
  try {
    const response = await fetch(`/api/music/${guildId}/queue/${position}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (data.success) {
      showToast('Track removed', 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to remove track', 'error');
  }
}

async function updateMusicSetting(guildId, key, value) {
  try {
    const response = await fetch(`/api/music/${guildId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });

    const data = await response.json();
    if (data.success) {
      showToast('Setting updated', 'success');
      loadMusicSettings(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to update setting', 'error');
  }
}

async function cycleLoopMode(guildId, currentMode) {
  const modes = ['off', 'track', 'queue'];
  const currentIndex = modes.indexOf(currentMode);
  const nextMode = modes[(currentIndex + 1) % modes.length];

  try {
    const response = await fetch(`/api/music/${guildId}/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: nextMode })
    });

    const data = await response.json();
    if (data.success) {
      const modeNames = { off: 'Off', track: 'Track', queue: 'Queue' };
      showToast(`Loop mode: ${modeNames[nextMode]}`, 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to change loop mode', 'error');
  }
}

async function shuffleQueue(guildId) {
  try {
    const response = await fetch(`/api/music/${guildId}/shuffle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (data.success) {
      showToast('Queue shuffled', 'success');
      loadMusicQueue(guildId);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to shuffle queue', 'error');
  }
}

function cleanupMusicPlayer() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}
