import type { ExtToWeb, WebToExt, FileDiff } from '../src/types';
import { renderTree, updateTreeViewed } from './render/tree';
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

// ── DOM refs ──────────────────────────────────────────────
const toolbar = document.getElementById('toolbar')!;
const pane = document.getElementById('pane')!;

// ── Toolbar buttons ───────────────────────────────────────
const baseLabel = toolbar.querySelector<HTMLElement>('.base-label')!;
const btnRefresh = toolbar.querySelector<HTMLButtonElement>('#btn-refresh')!;
const btnSplit = toolbar.querySelector<HTMLButtonElement>('#btn-split')!;
const btnUnified = toolbar.querySelector<HTMLButtonElement>('#btn-unified')!;
const btnExpandAll = toolbar.querySelector<HTMLButtonElement>('#btn-expand')!;
const btnCollapseAll = toolbar.querySelector<HTMLButtonElement>('#btn-collapse')!;

btnRefresh.addEventListener('click', () =>
  vscode.postMessage({ type: 'ready' }),
);

btnSplit.addEventListener('click', () => setLayout('split'));
btnUnified.addEventListener('click', () => setLayout('unified'));

btnExpandAll.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('.file-block').forEach((b) => {
    b.querySelector<HTMLElement>('.diff-body')!.style.display = '';
  });
});

btnCollapseAll.addEventListener('click', () => {
  document.querySelectorAll<HTMLElement>('.file-block').forEach((b) => {
    b.querySelector<HTMLElement>('.diff-body')!.style.display = 'none';
  });
});

// ── Message handler ───────────────────────────────────────
window.addEventListener('message', (ev: MessageEvent<ExtToWeb>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    _files = msg.files;
    _baseRef = msg.baseRef;
    _viewed = msg.viewed;
    baseLabel.textContent = `base: ${_baseRef}`;
    renderAll();
  } else if (msg.type === 'viewedUpdate') {
    _viewed = msg.viewed;
    updateTreeViewed(_viewed);
    updateBlocksViewed(_viewed);
  }
});

// Signal ready so extension can send init on open
vscode.postMessage({ type: 'ready' });

// ── Render ────────────────────────────────────────────────
function renderAll(): void {
  pane.innerHTML = '';

  if (_files.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.textContent = `No changes vs \`${_baseRef}\``;
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

  for (const file of _files) {
    const block = buildFileBlockShell(file);
    pane.appendChild(block);
    observer.observe(block);
  }
}

function buildFileBlockShell(file: FileDiff): HTMLElement {
  const block = document.createElement('div');
  block.className = 'file-block' + (_viewed[file.path] ? ' viewed' : '');
  block.dataset.path = file.path;

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'file-header';

  const badge = document.createElement('span');
  badge.className = `status-badge status-${file.status[0]}`;
  badge.textContent = file.status[0];

  const pathSpan = document.createElement('span');
  pathSpan.className = 'file-path';
  pathSpan.textContent = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;

  const stats = document.createElement('span');
  stats.className = 'file-stats';
  if (!file.binary) {
    stats.innerHTML =
      `<span class="adds">+${file.additions}</span> <span class="dels">-${file.deletions}</span>`;
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'copy path';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.path);
  });

  const viewedCb = document.createElement('input');
  viewedCb.type = 'checkbox';
  viewedCb.checked = !!_viewed[file.path];
  viewedCb.title = 'Mark viewed';
  viewedCb.addEventListener('change', (e) => {
    e.stopPropagation();
    onCheck(file.path, viewedCb.checked);
  });
  viewedCb.addEventListener('click', (e) => e.stopPropagation());

  header.appendChild(badge);
  header.appendChild(pathSpan);
  header.appendChild(stats);
  header.appendChild(copyBtn);
  header.appendChild(viewedCb);

  // Toggle collapse on header click
  header.addEventListener('click', () => {
    const body = block.querySelector<HTMLElement>('.diff-body');
    if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
  });

  block.appendChild(header);

  return block;
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

// ── Layout toggle ─────────────────────────────────────────
function setLayout(layout: 'split' | 'unified'): void {
  _layout = layout;
  btnSplit.classList.toggle('active', layout === 'split');
  btnUnified.classList.toggle('active', layout === 'unified');

  // Re-render only already-loaded diff bodies
  document.querySelectorAll<HTMLElement>('.file-block').forEach((block) => {
    const path = block.dataset.path!;
    const file = _files.find((f) => f.path === path);
    if (!file) return;
    const existing = block.querySelector<HTMLElement>('.diff-body');
    if (!existing) return; // not yet lazy-loaded
    existing.replaceWith(buildDiffBody(file));
  });
}

// ── Viewed state ──────────────────────────────────────────
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

// ── Navigation ────────────────────────────────────────────
function scrollToFile(path: string): void {
  const block = document.querySelector<HTMLElement>(`.file-block[data-path="${CSS.escape(path)}"]`);
  block?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Init layout buttons
btnSplit.classList.add('active');
