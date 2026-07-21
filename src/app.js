import {
  buildCombinations,
  CATEGORY_META,
  CATEGORY_ORDER,
  createId,
  resultsToJson,
  resultsToText,
  safeFilename,
} from './core.js';
import { defaultSelections, seedCatalog } from './catalog.js';

const STORAGE_KEY = 'chuanxia.catalog.v1';
const SELECTION_KEY = 'chuanxia.selections.v1';
const categoryColors = {
  character: '#e78d7e',
  artist: '#d9aa59',
  outfit: '#c98998',
  expression: '#8baa7e',
  scene: '#7ca8c2',
};
const viewLabels = { library: '模块收藏', composer: '组合工作台', import: '图片解析' };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => JSON.parse(JSON.stringify(value));

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

let catalog = loadJson(STORAGE_KEY, seedCatalog);
if (!Array.isArray(catalog.modules)) catalog.modules = clone(seedCatalog.modules);
if (!Array.isArray(catalog.recipes)) catalog.recipes = [];
let selections = loadJson(SELECTION_KEY, defaultSelections);
for (const category of CATEGORY_ORDER) {
  if (!Array.isArray(selections[category])) selections[category] = [];
}
let activeFilter = 'all';
let results = [];
let currentPromptCandidate = '';
let previewUrl = '';

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  localStorage.setItem(SELECTION_KEY, JSON.stringify(selections));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
}

function setView(view) {
  if (!viewLabels[view]) view = 'library';
  $$('.view').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
  $$('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#current-view-label').textContent = viewLabels[view];
  history.replaceState(null, '', `#${view}`);
  if (view === 'composer') renderComposer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function categoryCounts() {
  return Object.fromEntries(CATEGORY_ORDER.map((category) => [
    category,
    catalog.modules.filter((item) => item.category === category).length,
  ]));
}

function renderStats() {
  const counts = categoryCounts();
  $('#hero-ledger').innerHTML = [
    ['角色版本', counts.character],
    ['画师风格', counts.artist],
    ['服装收藏', counts.outfit],
    ['已存方案', catalog.recipes.length],
  ].map(([label, count]) => `<div class="ledger-cell"><span>${label}</span><strong>${count}</strong></div>`).join('');
  $('#sidebar-stats').textContent = `${catalog.modules.length} MODULES  ·  ${catalog.recipes.length} RECIPES`;
}

function renderFilters() {
  const counts = categoryCounts();
  const filters = [
    { key: 'all', label: '全部', count: catalog.modules.length },
    ...CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_META[key].label, count: counts[key] })),
  ];
  $('#category-filters').innerHTML = filters.map((item) => `
    <button class="filter-chip ${activeFilter === item.key ? 'is-active' : ''}" data-filter="${item.key}" aria-pressed="${activeFilter === item.key}">
      ${item.label} · ${item.count}
    </button>
  `).join('');
}

function renderModules() {
  const query = $('#library-search').value.trim().toLowerCase();
  const modules = catalog.modules.filter((item) => {
    if (activeFilter !== 'all' && item.category !== activeFilter) return false;
    const haystack = [item.name, item.version, item.notes, ...(item.tags || [])].join(' ').toLowerCase();
    return !query || haystack.includes(query);
  });

  $('#module-grid').innerHTML = modules.length ? modules.map((item, index) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.character;
    const tags = (item.tags || []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    return `
      <article class="module-card" data-index="${String(index + 1).padStart(2, '0')}" style="--card-color:${categoryColors[item.category]}">
        <span class="card-pin"></span>
        <div class="module-card-top">
          <span class="category-stamp">${meta.short}</span>
          <span class="version-label">${escapeHtml(item.version || '未标版本')}</span>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p class="category-name">${meta.label}</p>
        <p class="prompt-preview">${escapeHtml(item.positive || '尚未填写正向提示词')}</p>
        <div class="card-tags">${tags || '<span>未加标签</span>'}</div>
      </article>`;
  }).join('') : '<div class="empty-state">没有找到匹配的模块。可以换个关键词，或新建一张收藏卡。</div>';
}

function renderLibrary() {
  renderStats();
  renderFilters();
  renderModules();
}

function countCombinations() {
  const activeCounts = CATEGORY_ORDER.map((category) => selections[category].length).filter(Boolean);
  return activeCounts.length ? activeCounts.reduce((total, count) => total * count, 1) : 0;
}

function renderFormula() {
  const pieces = CATEGORY_ORDER
    .map((category) => ({ category, count: selections[category].length }))
    .filter((item) => item.count)
    .map((item) => `${item.count} ${CATEGORY_META[item.category].label.split(' / ')[0]}`);
  const count = countCombinations();
  $('#selection-formula').textContent = pieces.length ? pieces.join(' × ') : '还没有选择模块';
  $('#combination-count').textContent = `预计 ${count} 组`;
  $('#ticket-total').textContent = count;

  $('#ticket-list').innerHTML = CATEGORY_ORDER.map((category) => {
    const names = selections[category]
      .map((id) => catalog.modules.find((item) => item.id === id)?.name)
      .filter(Boolean);
    return `<div class="ticket-line"><span>${CATEGORY_META[category].label}</span><strong>${names.length ? `${names.length} 项` : '跳过'}</strong></div>`;
  }).join('');
}

function renderSelectionLanes() {
  $('#selection-lanes').innerHTML = CATEGORY_ORDER.map((category) => {
    const meta = CATEGORY_META[category];
    const modules = catalog.modules.filter((item) => item.category === category);
    const options = modules.length ? modules.map((item) => `
      <button class="option-card ${selections[category].includes(item.id) ? 'is-selected' : ''}"
        data-select-module="${escapeHtml(item.id)}" data-category="${category}" aria-pressed="${selections[category].includes(item.id)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.version || '未标版本')}</span>
        <small>${escapeHtml(item.positive || '尚未填写提示词')}</small>
      </button>`).join('') : '<p class="lane-empty">这个分类还没有收藏。</p>';
    return `
      <section class="selection-lane" style="--lane-color:${categoryColors[category]}">
        <div class="lane-title"><span>${meta.short}</span><strong>${meta.label.replace(' / ', '<br>')}</strong></div>
        <div class="lane-options">${options}</div>
      </section>`;
  }).join('');
}

function renderSavedRecipes() {
  const select = $('#saved-recipe-select');
  const previous = select.value;
  select.innerHTML = '<option value="">选择一个方案…</option>' + catalog.recipes.map((recipe) => `
    <option value="${escapeHtml(recipe.id)}">${escapeHtml(recipe.name)}</option>
  `).join('');
  if (catalog.recipes.some((recipe) => recipe.id === previous)) select.value = previous;
}

function renderComposer() {
  const validIds = new Set(catalog.modules.map((item) => item.id));
  for (const category of CATEGORY_ORDER) selections[category] = selections[category].filter((id) => validIds.has(id));
  renderSelectionLanes();
  renderFormula();
  renderSavedRecipes();
}

function renderResults() {
  const section = $('#results-section');
  section.hidden = !results.length;
  $('#results-grid').innerHTML = results.map((result, index) => `
    <article class="result-card">
      <span class="result-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h3>${escapeHtml(result.name)}</h3>
        <div class="prompt-block"><label>POSITIVE</label><p>${escapeHtml(result.positive || '（空）')}</p></div>
        <div class="prompt-block"><label>NEGATIVE</label><p>${escapeHtml(result.negative || '（空）')}</p></div>
      </div>
      <div class="result-actions">
        <button data-copy-result="${result.id}" data-copy-field="positive">复制正向</button>
        <button data-copy-result="${result.id}" data-copy-field="all">复制全部</button>
      </div>
    </article>
  `).join('');
}

function openModal(prefill = {}) {
  const form = $('#module-form');
  form.reset();
  for (const [key, value] of Object.entries(prefill)) {
    if (form.elements[key]) form.elements[key].value = value;
  }
  $('#module-modal').hidden = false;
  setTimeout(() => form.elements.name.focus(), 0);
}

function closeModal() {
  $('#module-modal').hidden = true;
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  showToast('已经复制到剪贴板');
}

function readNullTerminated(bytes, start, decoder) {
  let end = start;
  while (end < bytes.length && bytes[end] !== 0) end += 1;
  return { value: decoder.decode(bytes.slice(start, end)), next: end + 1 };
}

async function inflate(bytes) {
  if (!('DecompressionStream' in globalThis)) return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function parsePngMetadata(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((byte, index) => bytes[index] !== byte)) return [];

  const view = new DataView(buffer);
  const ascii = new TextDecoder('ascii');
  const latin = new TextDecoder('latin1');
  const utf8 = new TextDecoder('utf-8');
  const found = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii.decode(bytes.slice(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    const data = bytes.slice(start, end);

    if (type === 'tEXt') {
      const keyword = readNullTerminated(data, 0, latin);
      found.push({ key: keyword.value || 'tEXt', value: latin.decode(data.slice(keyword.next)) });
    } else if (type === 'zTXt') {
      const keyword = readNullTerminated(data, 0, latin);
      const inflated = await inflate(data.slice(keyword.next + 1));
      if (inflated) found.push({ key: keyword.value || 'zTXt', value: latin.decode(inflated) });
    } else if (type === 'iTXt') {
      const keyword = readNullTerminated(data, 0, latin);
      const compressed = data[keyword.next] === 1;
      let cursor = keyword.next + 2;
      cursor = readNullTerminated(data, cursor, utf8).next;
      cursor = readNullTerminated(data, cursor, utf8).next;
      let textBytes = data.slice(cursor);
      if (compressed) textBytes = await inflate(textBytes);
      if (textBytes) found.push({ key: keyword.value || 'iTXt', value: utf8.decode(textBytes) });
    }

    offset = end + 4;
    if (type === 'IEND') break;
  }
  return found;
}

function extractPromptCandidate(entries) {
  const preferred = entries.find((entry) => /^(description|prompt|parameters)$/i.test(entry.key));
  if (preferred) return preferred.value;
  for (const entry of entries) {
    if (!/comment/i.test(entry.key)) continue;
    try {
      const parsed = JSON.parse(entry.value);
      if (typeof parsed.prompt === 'string') return parsed.prompt;
    } catch { /* 保留原文显示，不把无效 JSON 当作错误。 */ }
  }
  return '';
}

async function analyzeImage(file) {
  if (!file?.type?.startsWith('image/')) {
    showToast('请选择一张图片');
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  const preview = $('#image-preview');
  preview.onload = () => {
    preview.width = preview.naturalWidth;
    preview.height = preview.naturalHeight;
  };
  preview.src = previewUrl;
  $('#metadata-filename').textContent = file.name;
  $('#analysis-panel').hidden = false;

  const entries = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
    ? await parsePngMetadata(await file.arrayBuffer())
    : [];
  currentPromptCandidate = extractPromptCandidate(entries);
  $('#adopt-metadata-button').hidden = !currentPromptCandidate;

  const basic = [
    { key: '文件类型', value: file.type || '未知' },
    { key: '文件大小', value: `${(file.size / 1024).toFixed(1)} KB` },
  ];
  const allEntries = [...basic, ...entries];
  $('#metadata-content').innerHTML = entries.length
    ? `<dl class="metadata-list">${allEntries.map((entry) => `<div class="metadata-row"><dt>${escapeHtml(entry.key)}</dt><dd>${escapeHtml(entry.value)}</dd></div>`).join('')}</dl>`
    : `<div class="metadata-empty"><strong>没有读到普通文本元数据。</strong><br>如果这是 NovelAI 原图，提示词可能藏在 alpha 通道；这部分解析器将在下一阶段接入。被平台压缩或截图后的图片也可能已经丢失元数据。</div>`;
}

function wireEvents() {
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-view-link]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    setView(link.dataset.viewLink);
  }));
  $$('[data-open-modal]').forEach((button) => button.addEventListener('click', () => openModal()));
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  $('#module-modal').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#module-modal').hidden) closeModal(); });

  $('#library-search').addEventListener('input', renderModules);
  $('#category-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    renderFilters();
    renderModules();
  });

  $('#selection-lanes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-module]');
    if (!button) return;
    const { category } = button.dataset;
    const id = button.dataset.selectModule;
    selections[category] = selections[category].includes(id)
      ? selections[category].filter((value) => value !== id)
      : [...selections[category], id];
    persist();
    renderComposer();
  });

  $('#generate-button').addEventListener('click', () => {
    results = buildCombinations(catalog.modules, selections);
    if (!results.length) {
      showToast('请先选择至少一个模块');
      return;
    }
    renderResults();
    setTimeout(() => $('#results-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });

  $('#results-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-result]');
    if (!button) return;
    const result = results.find((item) => item.id === button.dataset.copyResult);
    if (!result) return;
    const text = button.dataset.copyField === 'positive'
      ? result.positive
      : `Positive:\n${result.positive}\n\nNegative:\n${result.negative}`;
    copyText(text);
  });

  $('#export-results-button').addEventListener('click', () => {
    if (!results.length) return showToast('还没有可导出的组合');
    const recipeName = $('#recipe-name').value.trim() || '未命名方案';
    const format = $('#export-format').value;
    const content = format === 'json' ? resultsToJson(results, recipeName) : resultsToText(results);
    downloadFile(`${safeFilename(recipeName)}.${format}`, content, format === 'json' ? 'application/json' : 'text/plain');
    showToast(`已导出 ${results.length} 组搭配`);
  });

  $('#save-recipe-button').addEventListener('click', () => {
    const name = $('#recipe-name').value.trim();
    if (!name) return showToast('先给方案起个名字');
    const existing = catalog.recipes.find((recipe) => recipe.name === name);
    const data = { id: existing?.id || createId('recipe'), name, selections: clone(selections), updatedAt: new Date().toISOString() };
    catalog.recipes = existing ? catalog.recipes.map((item) => item.id === existing.id ? data : item) : [...catalog.recipes, data];
    persist();
    renderStats();
    renderSavedRecipes();
    $('#saved-recipe-select').value = data.id;
    showToast(existing ? '方案已经更新' : '方案已经保存');
  });

  $('#saved-recipe-select').addEventListener('change', (event) => {
    const recipe = catalog.recipes.find((item) => item.id === event.target.value);
    if (!recipe) return;
    selections = clone(recipe.selections);
    $('#recipe-name').value = recipe.name;
    persist();
    renderComposer();
    $('#saved-recipe-select').value = recipe.id;
    showToast('已载入方案');
  });

  $('#module-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = {
      id: createId(data.get('category')),
      category: data.get('category'),
      name: data.get('name').trim(),
      version: data.get('version').trim() || '未标版本',
      positive: data.get('positive').trim(),
      negative: data.get('negative').trim(),
      tags: data.get('tags').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      notes: data.get('notes').trim(),
      createdAt: new Date().toISOString(),
    };
    catalog.modules.unshift(item);
    persist();
    closeModal();
    renderLibrary();
    renderComposer();
    showToast(`“${item.name}”已经收进匣子`);
  });

  $('#export-library-button').addEventListener('click', () => {
    downloadFile(`串匣备份_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ format: 'chuanxia-catalog', version: 1, ...catalog }, null, 2), 'application/json');
    showToast('收藏资料已经备份');
  });

  const dropZone = $('#drop-zone');
  $('#image-input').addEventListener('change', (event) => analyzeImage(event.target.files[0]));
  for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop', (event) => analyzeImage(event.dataTransfer.files[0]));
  $('#adopt-metadata-button').addEventListener('click', () => openModal({ positive: currentPromptCandidate, name: '从图片提取的提示词' }));
}

function initialize() {
  const categorySelect = $('#module-form select[name="category"]');
  categorySelect.innerHTML = CATEGORY_ORDER.map((key) => `<option value="${key}">${CATEGORY_META[key].label}</option>`).join('');
  renderLibrary();
  renderComposer();
  renderResults();
  wireEvents();
  setView(location.hash.slice(1) || 'library');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}

initialize();
