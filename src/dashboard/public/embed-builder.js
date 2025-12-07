class EmbedBuilder {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`EmbedBuilder: Container with id "${containerId}" not found`);
      return;
    }
    this.embedData = options.initialData || {};
    this.onChange = options.onChange || (() => {});
    this.placeholders = options.placeholders || [];
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="embed-builder space-y-4">
        <div class="embed-preview-container bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div class="text-sm font-medium text-zinc-400 mb-3">Preview</div>
          <div id="embed-preview" class="embed-preview"></div>
        </div>

        <div class="embed-controls space-y-4">
          <div class="flex items-center justify-between">
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="embed-enabled" ${this.embedData.enabled ? 'checked' : ''} class="w-4 h-4">
              <span class="text-sm font-medium">Use Embed</span>
            </label>
          </div>

          <div id="embed-fields" class="${!this.embedData.enabled ? 'opacity-50 pointer-events-none' : ''}">
            <div>
              <label class="block text-sm font-medium mb-2">Author Name</label>
              <input type="text" id="embed-author-name" value="${this.escapeHtml(this.embedData.author?.name || '')}" placeholder="Author name" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Author Icon URL</label>
              <input type="text" id="embed-author-icon" value="${this.escapeHtml(this.embedData.author?.iconURL || '')}" placeholder="https://example.com/icon.png" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Title</label>
              <input type="text" id="embed-title" value="${this.escapeHtml(this.embedData.title || '')}" placeholder="Embed title" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Description</label>
              <textarea id="embed-description" rows="4" placeholder="Embed description" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono text-sm">${this.escapeHtml(this.embedData.description || '')}</textarea>
              ${this.placeholders.length > 0 ? `<p class="text-xs text-zinc-400 mt-1">Available placeholders: ${this.placeholders.map(p => this.escapeHtml(p)).join(', ')}</p>` : ''}
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Color</label>
              <div class="flex space-x-2">
                <input type="color" id="embed-color" value="${this.escapeHtml(this.embedData.color || '#5865F2')}" class="w-16 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer">
                <input type="text" id="embed-color-hex" value="${this.escapeHtml(this.embedData.color || '#5865F2')}" placeholder="#5865F2" class="flex-1 bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono">
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Thumbnail URL</label>
              <input type="text" id="embed-thumbnail" value="${this.escapeHtml(this.embedData.thumbnail?.url || '')}" placeholder="https://example.com/thumbnail.png" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Image URL</label>
              <input type="text" id="embed-image" value="${this.escapeHtml(this.embedData.image?.url || '')}" placeholder="https://example.com/image.png" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 flex items-center justify-between">
                <span>Fields</span>
                <button type="button" id="add-field-btn" class="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded">Add Field</button>
              </label>
              <div id="embed-fields-list" class="space-y-2"></div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Footer Text</label>
              <input type="text" id="embed-footer-text" value="${this.escapeHtml(this.embedData.footer?.text || '')}" placeholder="Footer text" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Footer Icon URL</label>
              <input type="text" id="embed-footer-icon" value="${this.escapeHtml(this.embedData.footer?.iconURL || '')}" placeholder="https://example.com/icon.png" class="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-2 focus:outline-none focus:border-indigo-500">
            </div>

            <div class="flex items-center space-x-2">
              <input type="checkbox" id="embed-timestamp" ${this.embedData.timestamp ? 'checked' : ''} class="w-4 h-4">
              <label for="embed-timestamp" class="text-sm font-medium">Show Timestamp</label>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderFields();
    this.updatePreview();
  }

  attachEventListeners() {
    const enabledCheckbox = this.container.querySelector('#embed-enabled');
    const embedFields = this.container.querySelector('#embed-fields');

    enabledCheckbox.addEventListener('change', (e) => {
      this.embedData.enabled = e.target.checked;
      if (e.target.checked) {
        embedFields.classList.remove('opacity-50', 'pointer-events-none');
      } else {
        embedFields.classList.add('opacity-50', 'pointer-events-none');
      }
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-author-name').addEventListener('input', (e) => {
      if (!this.embedData.author) this.embedData.author = {};
      this.embedData.author.name = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-author-icon').addEventListener('input', (e) => {
      if (!this.embedData.author) this.embedData.author = {};
      this.embedData.author.iconURL = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-title').addEventListener('input', (e) => {
      this.embedData.title = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-description').addEventListener('input', (e) => {
      this.embedData.description = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    const colorPicker = this.container.querySelector('#embed-color');
    const colorHex = this.container.querySelector('#embed-color-hex');

    colorPicker.addEventListener('input', (e) => {
      this.embedData.color = e.target.value;
      colorHex.value = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    colorHex.addEventListener('input', (e) => {
      const value = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(value)) {
        this.embedData.color = value;
        colorPicker.value = value;
        this.updatePreview();
        this.onChange(this.getData());
      }
    });

    this.container.querySelector('#embed-thumbnail').addEventListener('input', (e) => {
      if (!this.embedData.thumbnail) this.embedData.thumbnail = {};
      this.embedData.thumbnail.url = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-image').addEventListener('input', (e) => {
      if (!this.embedData.image) this.embedData.image = {};
      this.embedData.image.url = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-footer-text').addEventListener('input', (e) => {
      if (!this.embedData.footer) this.embedData.footer = {};
      this.embedData.footer.text = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-footer-icon').addEventListener('input', (e) => {
      if (!this.embedData.footer) this.embedData.footer = {};
      this.embedData.footer.iconURL = e.target.value;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#embed-timestamp').addEventListener('change', (e) => {
      this.embedData.timestamp = e.target.checked;
      this.updatePreview();
      this.onChange(this.getData());
    });

    this.container.querySelector('#add-field-btn').addEventListener('click', () => {
      if (!this.embedData.fields) this.embedData.fields = [];
      this.embedData.fields.push({ name: '', value: '', inline: false });
      this.renderFields();
      this.updatePreview();
      this.onChange(this.getData());
    });
  }

  renderFields() {
    const fieldsList = this.container.querySelector('#embed-fields-list');
    if (!this.embedData.fields || this.embedData.fields.length === 0) {
      fieldsList.innerHTML = '<p class="text-sm text-zinc-500">No fields added yet</p>';
      return;
    }

    fieldsList.innerHTML = this.embedData.fields.map((field, index) => `
      <div class="bg-zinc-700/50 rounded p-3 space-y-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-zinc-400">Field ${index + 1}</span>
          <button type="button" class="remove-field-btn text-xs text-red-400 hover:text-red-300" data-index="${index}">Remove</button>
        </div>
        <input type="text" class="field-name w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Field name" value="${this.escapeHtml(field.name)}" data-index="${index}">
        <textarea class="field-value w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Field value" rows="2" data-index="${index}">${this.escapeHtml(field.value)}</textarea>
        <label class="flex items-center space-x-2">
          <input type="checkbox" class="field-inline w-4 h-4" ${field.inline ? 'checked' : ''} data-index="${index}">
          <span class="text-xs">Inline</span>
        </label>
      </div>
    `).join('');

    fieldsList.querySelectorAll('.field-name').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.embedData.fields[index].name = e.target.value;
        this.updatePreview();
        this.onChange(this.getData());
      });
    });

    fieldsList.querySelectorAll('.field-value').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.embedData.fields[index].value = e.target.value;
        this.updatePreview();
        this.onChange(this.getData());
      });
    });

    fieldsList.querySelectorAll('.field-inline').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.embedData.fields[index].inline = e.target.checked;
        this.updatePreview();
        this.onChange(this.getData());
      });
    });

    fieldsList.querySelectorAll('.remove-field-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.embedData.fields.splice(index, 1);
        this.renderFields();
        this.updatePreview();
        this.onChange(this.getData());
      });
    });
  }

  updatePreview() {
    const preview = this.container.querySelector('#embed-preview');

    if (!this.embedData.enabled) {
      preview.innerHTML = '<p class="text-sm text-zinc-500">Embed disabled - plain message will be used</p>';
      return;
    }

    const hasContent = this.embedData.title || this.embedData.description ||
                       (this.embedData.fields && this.embedData.fields.length > 0) ||
                       (this.embedData.author && this.embedData.author.name);

    if (!hasContent) {
      preview.innerHTML = '<p class="text-sm text-zinc-500">Start building your embed...</p>';
      return;
    }

    const color = this.embedData.color || '#5865F2';
    const rgb = this.hexToRgb(color);

    let html = `
      <div class="discord-embed" style="border-left: 4px solid ${color}; background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1); padding: 12px 16px; border-radius: 4px;">
    `;

    if (this.embedData.author && this.embedData.author.name) {
      html += `
        <div class="embed-author flex items-center space-x-2 mb-2">
          ${this.embedData.author.iconURL ? `<img src="${this.escapeHtml(this.embedData.author.iconURL)}" class="w-6 h-6 rounded-full" onerror="this.style.display='none'">` : ''}
          <span class="text-sm font-medium">${this.escapeHtml(this.embedData.author.name)}</span>
        </div>
      `;
    }

    if (this.embedData.title) {
      html += `<div class="embed-title text-base font-semibold mb-2" style="color: ${color};">${this.escapeHtml(this.embedData.title)}</div>`;
    }

    if (this.embedData.description) {
      const formatted = this.formatText(this.embedData.description);
      html += `<div class="embed-description text-sm text-zinc-300 mb-2">${formatted}</div>`;
    }

    if (this.embedData.fields && this.embedData.fields.length > 0) {
      const hasInline = this.embedData.fields.some(f => f.inline);
      html += `<div class="embed-fields ${hasInline ? 'grid grid-cols-3 gap-2' : 'space-y-2'} mt-2">`;
      this.embedData.fields.forEach(field => {
        if (field.name && field.value) {
          html += `
            <div class="embed-field ${field.inline ? '' : 'col-span-3'}">
              <div class="text-xs font-semibold text-zinc-200 mb-1">${this.escapeHtml(field.name)}</div>
              <div class="text-xs text-zinc-400">${this.formatText(field.value)}</div>
            </div>
          `;
        }
      });
      html += `</div>`;
    }

    if (this.embedData.image && this.embedData.image.url) {
      html += `<img src="${this.escapeHtml(this.embedData.image.url)}" class="embed-image max-w-full rounded mt-3" onerror="this.style.display='none'">`;
    }

    if (this.embedData.thumbnail && this.embedData.thumbnail.url) {
      html += `<img src="${this.escapeHtml(this.embedData.thumbnail.url)}" class="embed-thumbnail w-20 h-20 rounded float-right ml-3" onerror="this.style.display='none'">`;
    }

    if ((this.embedData.footer && this.embedData.footer.text) || this.embedData.timestamp) {
      html += `<div class="embed-footer flex items-center space-x-2 mt-3 text-xs text-zinc-500">`;
      if (this.embedData.footer && this.embedData.footer.iconURL) {
        html += `<img src="${this.escapeHtml(this.embedData.footer.iconURL)}" class="w-5 h-5 rounded-full" onerror="this.style.display='none'">`;
      }
      if (this.embedData.footer && this.embedData.footer.text) {
        html += `<span>${this.escapeHtml(this.embedData.footer.text)}</span>`;
      }
      if (this.embedData.timestamp) {
        const separator = (this.embedData.footer && this.embedData.footer.text) ? ' • ' : '';
        html += `<span>${separator}${new Date().toLocaleString()}</span>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    preview.innerHTML = html;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 88, g: 101, b: 242 };
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  formatText(text) {
    let formatted = this.escapeHtml(text);
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
    formatted = formatted.replace(/~~(.+?)~~/g, '<s>$1</s>');
    formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-zinc-900 px-1 rounded">$1</code>');
    formatted = formatted.replace(/\\n/g, '<br>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  getData() {
    if (!this.container || !this.embedData.enabled) {
      return null;
    }

    const data = {};

    if (this.embedData.author && (this.embedData.author.name || this.embedData.author.iconURL)) {
      data.author = {};
      if (this.embedData.author.name) data.author.name = this.embedData.author.name;
      if (this.embedData.author.iconURL) data.author.iconURL = this.embedData.author.iconURL;
    }

    if (this.embedData.title) data.title = this.embedData.title;
    if (this.embedData.description) data.description = this.embedData.description;
    if (this.embedData.color) data.color = this.embedData.color;

    if (this.embedData.thumbnail && this.embedData.thumbnail.url) {
      data.thumbnail = { url: this.embedData.thumbnail.url };
    }

    if (this.embedData.image && this.embedData.image.url) {
      data.image = { url: this.embedData.image.url };
    }

    if (this.embedData.fields && this.embedData.fields.length > 0) {
      data.fields = this.embedData.fields.filter(f => f.name && f.value);
    }

    if (this.embedData.footer && (this.embedData.footer.text || this.embedData.footer.iconURL)) {
      data.footer = {};
      if (this.embedData.footer.text) data.footer.text = this.embedData.footer.text;
      if (this.embedData.footer.iconURL) data.footer.iconURL = this.embedData.footer.iconURL;
    }

    if (this.embedData.timestamp) data.timestamp = true;

    return Object.keys(data).length > 0 ? data : null;
  }

  setData(data) {
    this.embedData = data || {};
    this.render();
  }
}

window.EmbedBuilder = EmbedBuilder;
