import type { FileDiff } from '../../src/types';

export function renderTree(
  files: FileDiff[],
  viewed: Record<string, boolean>,
  onCheck: (path: string, val: boolean) => void,
  onClickFile: (path: string) => void,
): HTMLElement {
  const tree = document.getElementById('rail-tree')!;
  tree.innerHTML = '';

  const railCount = document.getElementById('rail-count');
  if (railCount) railCount.textContent = String(files.length);

  // Group by directory
  const grouped = new Map<string, FileDiff[]>();
  for (const f of files) {
    const idx = f.path.lastIndexOf('/');
    const dir = idx >= 0 ? f.path.slice(0, idx) : '.';
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir)!.push(f);
  }

  for (const [dir, dirFiles] of grouped) {
    const folderEl = document.createElement('div');
    folderEl.className = 'tree-folder';
    folderEl.dataset.dir = dir;

    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '▾';

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = dir === '.' ? '/' : dir;
    name.title = dir;

    const count = document.createElement('span');
    count.className = 'folder-count';
    count.textContent = String(dirFiles.length);

    folderEl.appendChild(chev);
    folderEl.appendChild(name);
    folderEl.appendChild(count);
    tree.appendChild(folderEl);

    const group = document.createElement('div');
    group.className = 'tree-file-group';
    group.dataset.dir = dir;

    folderEl.addEventListener('click', () => {
      folderEl.classList.toggle('collapsed');
    });

    for (const f of dirFiles) {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file' + (viewed[f.path] ? ' viewed' : '');
      fileEl.dataset.path = f.path;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!viewed[f.path];
      cb.title = 'Mark viewed';
      cb.addEventListener('change', () => onCheck(f.path, cb.checked));
      cb.addEventListener('click', (e) => e.stopPropagation());

      const badge = document.createElement('span');
      badge.className = `mini-badge status-${f.status[0]}`;
      badge.title = statusTitle(f.status[0]);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'filename';
      const baseName = f.path.slice(f.path.lastIndexOf('/') + 1);
      nameSpan.textContent = f.oldPath ? `${f.oldPath.split('/').pop()} → ${baseName}` : baseName;
      nameSpan.title = f.path;

      const stats = document.createElement('span');
      stats.className = 'stats';
      if (!f.binary) {
        stats.innerHTML =
          `<span class="adds">+${f.additions}</span><span class="dels">-${f.deletions}</span>`;
      } else {
        stats.innerHTML = `<span class="adds" title="binary">bin</span>`;
      }

      fileEl.appendChild(cb);
      fileEl.appendChild(badge);
      fileEl.appendChild(nameSpan);
      fileEl.appendChild(stats);
      fileEl.addEventListener('click', () => onClickFile(f.path));

      group.appendChild(fileEl);
    }

    tree.appendChild(group);
  }

  return tree;
}

export function updateTreeViewed(viewed: Record<string, boolean>): void {
  document.querySelectorAll<HTMLElement>('.tree-file').forEach((el) => {
    const path = el.dataset.path!;
    el.classList.toggle('viewed', !!viewed[path]);
    const cb = el.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (cb) cb.checked = !!viewed[path];
  });
}

export function applyTreeFilter(query: string): void {
  const q = query.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('.tree-file').forEach((el) => {
    const path = (el.dataset.path || '').toLowerCase();
    const match = !q || path.includes(q);
    el.classList.toggle('hidden-by-filter', !match);
  });
  // Hide empty folders
  document.querySelectorAll<HTMLElement>('.tree-file-group').forEach((group) => {
    const visible = group.querySelectorAll('.tree-file:not(.hidden-by-filter)').length;
    group.classList.toggle('hidden-by-filter', visible === 0);
    const folder = group.previousElementSibling as HTMLElement | null;
    if (folder?.classList.contains('tree-folder')) {
      folder.classList.toggle('hidden-by-filter', visible === 0);
    }
  });
}

export function setActiveTreeFile(path: string): void {
  document.querySelectorAll<HTMLElement>('.tree-file').forEach((el) => {
    el.classList.toggle('active', el.dataset.path === path);
  });
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
