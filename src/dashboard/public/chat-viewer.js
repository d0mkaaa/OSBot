class ChatViewer {
  constructor() {
    this.ws = null;
    this.currentChannelId = null;
    this.channels = [];
  }

  async init() {
    await this.loadChannels();
    this.setupEventListeners();
  }

  async loadChannels() {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/channels`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.channels = result.data;
        this.renderChannelSelector();
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  }

  renderChannelSelector() {
    const selector = document.getElementById('chat-channel-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Select a channel</option>';

    this.channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = `# ${channel.name}`;
      selector.appendChild(option);
    });
  }

  setupEventListeners() {
    const selector = document.getElementById('chat-channel-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.selectChannel(e.target.value);
      });
    }
  }

  async selectChannel(channelId) {
    if (!channelId) return;

    this.currentChannelId = channelId;
    await this.loadMessages(channelId);
    this.connectWebSocket(channelId);
  }

  async loadMessages(channelId) {
    try {
      const guildId = window.currentGuildId;
      const response = await fetch(`/api/guilds/${guildId}/channels/${channelId}/messages?limit=50`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        this.renderMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '';

    if (messages.length === 0) {
      container.innerHTML = '<div class="text-gray-400 text-center py-4">No messages in this channel</div>';
      return;
    }

    messages.forEach(msg => {
      const messageEl = this.createMessageElement(msg);
      container.appendChild(messageEl);
    });

    container.scrollTop = container.scrollHeight;
  }

  createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message border-b border-zinc-700 p-3 hover:bg-zinc-800/50 transition';

    const timestamp = new Date(msg.timestamp).toLocaleString();

    div.innerHTML = `
      <div class="flex items-start gap-3">
        <img src="${msg.author.avatar}" alt="${msg.author.username}" class="w-10 h-10 rounded-full">
        <div class="flex-1">
          <div class="flex items-baseline gap-2">
            <span class="font-semibold text-gray-200">${msg.author.username}</span>
            <span class="text-xs text-gray-400">${timestamp}</span>
          </div>
          <div class="mt-1 text-gray-300">${this.escapeHtml(msg.content)}</div>
          ${msg.attachments && msg.attachments.length > 0 ? this.renderAttachments(msg.attachments) : ''}
          ${msg.embeds && msg.embeds.length > 0 ? this.renderEmbeds(msg.embeds) : ''}
        </div>
      </div>
    `;

    return div;
  }

  renderAttachments(attachments) {
    return `
      <div class="mt-2">
        ${attachments.map(att => `
          <a href="${att.url}" target="_blank" class="text-blue-400 hover:text-blue-300 hover:underline block">
            📎 ${att.name}
          </a>
        `).join('')}
      </div>
    `;
  }

  renderEmbeds(embeds) {
    return `
      <div class="mt-2">
        ${embeds.map(embed => `
          <div class="border-l-4 border-blue-500 bg-zinc-800 p-3 rounded">
            ${embed.title ? `<div class="font-semibold text-gray-200">${embed.title}</div>` : ''}
            ${embed.description ? `<div class="text-sm mt-1 text-gray-300">${embed.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  connectWebSocket(channelId) {
    if (this.ws) {
      this.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Chat WebSocket connected');
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channelId: channelId
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message') {
        this.addNewMessage(data.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Chat WebSocket disconnected');
    };
  }

  addNewMessage(messageData) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messageEl = this.createMessageElement(messageData);
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

window.ChatViewer = ChatViewer;
