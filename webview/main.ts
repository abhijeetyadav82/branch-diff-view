import type { ExtToWeb, WebToExt, FileDiff } from '../src/types';
import { renderTree, updateTreeViewed, applyTreeFilter, setActiveTreeFile } from './render/tree';
import { renderSplit } from './render/split';
import { renderUnified } from './render/unified';

const MAX_DIFF_LINES = 5000;

declare function acquireVsCodeApi(): {
  postMessage(msg: WebToExt): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

let _layout: 'split' | 'unified' = 'split';
let _files: FileDiff[] = [];
let _viewed: Record<string, boolean> = {};
let _baseRef = '';
let _lazyObserver: IntersectionObserver | undefined;
let _activeObserver: IntersectionObserver | undefined;

// ── DOM refs ──────────────────────────────────────────────
const toolbar = document.getElementById('toolbar')!;
const pane = document.getElementById('pane')!;

const baseLabel = toolbar.querySelector<HTMLElement>('.base-label')!;
const summaryChip = document.getElementById('summary-chip')!;
const sumFiles = summaryChip.querySelector<HTMLElement>('.sum-files')!;
const sumAdds = document.getElementById('sum-adds')!;
const sumDels = document.getElementById('sum-dels')!;
const filterInput = document.getElementById('filter') as HTMLInputElement;

const btnRefresh = toolbar.querySelector<HTMLButtonElement>('#btn-refresh')!;
const btnSplit = toolbar.querySelector<HTMLButtonElement>('#btn-split')!;
const btnUnified = toolbar.querySelector<HTMLButtonElement>('#btn-unified')!;
const btnExpandAll = toolbar.querySelector<HTMLButtonElement>('#btn-expand')!;
const btnCollapseAll = toolbar.querySelector<HTMLButtonElement>('#btn-collapse')!;

btnRefresh.addEventListener('click', () =>
  vscode.postMessage({ type: 'refresh' }),
);

btnSplit.addEventListener('click', () => setLayout('split'));
btnUnified.addEventListener('click', () => setLayout('unified'));

btnExpandAll.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('.file-block').forEach((b) => {
    b.classList.remove('collapsed');
  });
});

btnCollapseAll.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('.file-block').forEach((b) => {
    b.classList.add('collapsed');
  });
});

function applyFilter(): void {
  const q = filterInput.value.trim().toLowerCase();
  applyTreeFilter(q);
  document.querySelectorAll<HTMLElement>('.file-block').forEach((b) => {
    const path = (b.dataset.path || '').toLowerCase();
    b.classList.toggle('hidden-by-filter', !!q && !path.includes(q));
  });
}

filterInput.addEventListener('input', applyFilter);

// Keyboard shortcut: '/' focuses filter
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== filterInput) {
    e.preventDefault();
    filterInput.focus();
    filterInput.select();
  } else if (e.key === 'Escape' && document.activeElement === filterInput) {
    filterInput.value = '';
    filterInput.dispatchEvent(new Event('input'));
    filterInput.blur();
  }
});

// ── Message handler ───────────────────────────────────────
window.addEventListener('message', (ev: MessageEvent<ExtToWeb>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    _files = msg.files;
    _baseRef = msg.baseRef;
    _viewed = msg.viewed;
    baseLabel.textContent = _baseRef || '—';
    updateSummary();
    renderAll();
  } else if (msg.type === 'viewedUpdate') {
    _viewed = msg.viewed;
    updateTreeViewed(_viewed);
    updateBlocksViewed(_viewed);
  } else if (msg.type === 'toggleLayout') {
    setLayout(_layout === 'split' ? 'unified' : 'split');
  }
});

vscode.postMessage({ type: 'ready' });

// ── Render ────────────────────────────────────────────────
function updateSummary(): void {
  const adds = _files.reduce((s, f) => s + (f.additions || 0), 0);
  const dels = _files.reduce((s, f) => s + (f.deletions || 0), 0);
  sumFiles.textContent = `${_files.length} file${_files.length === 1 ? '' : 's'}`;
  sumAdds.textContent = `+${adds}`;
  sumDels.textContent = `-${dels}`;
  summaryChip.hidden = _files.length === 0;
}

function renderAll(): void {
  _lazyObserver?.disconnect();
  _activeObserver?.disconnect();
  pane.innerHTML = '';

  if (_files.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = `No changes vs ${_baseRef}`;
    pane.appendChild(div);
    renderTree([], _viewed, onCheck, scrollToFile);
    return;
  }

  renderTree(_files, _viewed, onCheck, scrollToFile);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const block = entry.target as HTMLElement;
        const path = block.dataset.path!;
        const file = _files.find((f) => f.path === path);
        if (!file) continue;
        observer.unobserve(block);
        block.appendChild(buildDiffBody(file));
      }
    },
    { root: pane, rootMargin: '200% 0px' },
  );
  _lazyObserver = observer;

  // Active-file tracking based on header position
  const activeObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const block = entry.target.closest<HTMLElement>('.file-block');
          if (block?.dataset.path) setActiveTreeFile(block.dataset.path);
        }
      }
    },
    { root: pane, rootMargin: '0px 0px -85% 0px', threshold: 0 },
  );
  _activeObserver = activeObserver;

  for (const file of _files) {
    const block = buildFileBlockShell(file);
    pane.appendChild(block);
    observer.observe(block);
    const header = block.querySelector('.file-header');
    if (header) activeObserver.observe(header);
  }

  // A refresh rebuilds every block unfiltered; honour any query still in the box.
  if (filterInput.value.trim()) applyFilter();
}

function buildFileBlockShell(file: FileDiff): HTMLElement {
  const block = document.createElement('div');
  block.className = 'file-block' + (_viewed[file.path] ? ' viewed' : '');
  block.dataset.path = file.path;

  const header = document.createElement('div');
  header.className = 'file-header';

  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '▾';

  const badge = document.createElement('span');
  badge.className = `status-badge status-${file.status[0]}`;
  badge.textContent = file.status[0];
  badge.title = statusTitle(file.status[0]);

  const pathSpan = document.createElement('span');
  pathSpan.className = 'file-path';
  pathSpan.title = file.path;
  pathSpan.appendChild(formatPath(file));

  const stats = document.createElement('span');
  stats.className = 'file-stats';
  if (!file.binary) {
    stats.innerHTML =
      `<span class="adds">+${file.additions}</span>` +
      `<span class="dels">-${file.deletions}</span>` +
      buildStatBar(file.additions, file.deletions);
  } else {
    stats.innerHTML = `<span class="dels">binary</span>`;
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'copy';
  copyBtn.title = 'Copy file path';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.path);
    copyBtn.textContent = '✓ copied';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'copy';
      copyBtn.classList.remove('copied');
    }, 1200);
  });

  const viewedLabel = document.createElement('label');
  viewedLabel.className = 'viewed-toggle';
  viewedLabel.title = 'Mark as viewed';
  const viewedCb = document.createElement('input');
  viewedCb.type = 'checkbox';
  viewedCb.checked = !!_viewed[file.path];
  viewedCb.addEventListener('change', (e) => {
    e.stopPropagation();
    onCheck(file.path, viewedCb.checked);
  });
  viewedCb.addEventListener('click', (e) => e.stopPropagation());
  viewedLabel.appendChild(viewedCb);
  viewedLabel.appendChild(document.createTextNode('viewed'));
  viewedLabel.addEventListener('click', (e) => e.stopPropagation());

  header.appendChild(chev);
  header.appendChild(badge);
  header.appendChild(pathSpan);
  header.appendChild(stats);
  header.appendChild(copyBtn);
  header.appendChild(viewedLabel);

  header.addEventListener('click', () => {
    block.classList.toggle('collapsed');
  });

  block.appendChild(header);
  return block;
}

function formatPath(file: FileDiff): DocumentFragment {
  const frag = document.createDocumentFragment();
  const renderOne = (full: string) => {
    const idx = full.lastIndexOf('/');
    if (idx >= 0) {
      const dir = document.createElement('span');
      dir.className = 'dir';
      dir.textContent = full.slice(0, idx + 1);
      const base = document.createElement('span');
      base.className = 'base';
      base.textContent = full.slice(idx + 1);
      frag.appendChild(dir);
      frag.appendChild(base);
    } else {
      const base = document.createElement('span');
      base.className = 'base';
      base.textContent = full;
      frag.appendChild(base);
    }
  };
  if (file.oldPath && file.oldPath !== file.path) {
    renderOne(file.oldPath);
    const arr = document.createElement('span');
    arr.className = 'arrow';
    arr.textContent = '→';
    frag.appendChild(arr);
  }
  renderOne(file.path);
  return frag;
}

function buildStatBar(adds: number, dels: number): string {
  const total = adds + dels;
  if (total === 0) return '';
  const slots = 5;
  let addSlots = Math.round((adds / total) * slots);
  // A nonzero side always gets at least one slot
  if (adds > 0) addSlots = Math.max(1, addSlots);
  if (dels > 0) addSlots = Math.min(slots - 1, addSlots);
  const delSlots = slots - addSlots;
  let html = '<span class="stat-bar">';
  for (let i = 0; i < addSlots; i++) html += '<span class="f-add"></span>';
  for (let i = 0; i < delSlots; i++) html += '<span class="f-del"></span>';
  html += '</span>';
  return html;
}

function statusTitle(s: string): string {
  switch (s) {
    case 'A': return 'Added';
    case 'D': return 'Deleted';
    case 'M': return 'Modified';
    case 'R': return 'Renamed';
    case 'C': return 'Copied';
    default: return s;
  }
}

function buildDiffBody(file: FileDiff): HTMLElement {
  const totalLines = file.hunks.reduce((s, h) => s + h.lines.length, 0);
  if (!file.binary && totalLines > MAX_DIFF_LINES) {
    return buildLargeStub(file, totalLines);
  }
  return _layout === 'split' ? renderSplit(file) : renderUnified(file);
}

function buildLargeStub(file: FileDiff, lineCount: number): HTMLElement {
  const div = document.createElement('div');
  div.className = 'diff-body large-diff-stub';

  const msg = document.createElement('p');
  msg.textContent = `Large diff (${lineCount} lines) — not rendered by default.`;

  const btn = document.createElement('button');
  btn.textContent = 'Load anyway';
  btn.addEventListener('click', () => {
    const body = _layout === 'split' ? renderSplit(file) : renderUnified(file);
    div.replaceWith(body);
  });

  div.appendChild(msg);
  div.appendChild(btn);
  return div;
}

function setLayout(layout: 'split' | 'unified'): void {
  _layout = layout;
  btnSplit.classList.toggle('active', layout === 'split');
  btnUnified.classList.toggle('active', layout === 'unified');

  document.querySelectorAll<HTMLElement>('.file-block').forEach((block) => {
    const path = block.dataset.path!;
    const file = _files.find((f) => f.path === path);
    if (!file) return;
    const existing = block.querySelector<HTMLElement>('.diff-body');
    if (!existing) return;
    existing.replaceWith(buildDiffBody(file));
  });
}

function onCheck(path: string, value: boolean): void {
  vscode.postMessage({ type: 'setViewed', path, value });
}

function updateBlocksViewed(viewed: Record<string, boolean>): void {
  document.querySelectorAll<HTMLElement>('.file-block').forEach((block) => {
    const path = block.dataset.path!;
    block.classList.toggle('viewed', !!viewed[path]);
    const cb = block.querySelector<HTMLInputElement>('.file-header input[type="checkbox"]');
    if (cb) cb.checked = !!viewed[path];
  });
}

function scrollToFile(path: string): void {
  const block = document.querySelector<HTMLElement>(`.file-block[data-path="${CSS.escape(path)}"]`);
  block?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setActiveTreeFile(path);
}

btnSplit.classList.add('active');
