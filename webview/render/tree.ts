import type { FileDiff } from '../../src/types';

export function renderTree(
  files: FileDiff[],
  viewed: Record<string, boolean>,
  onCheck: (path: string, val: boolean) => void,
  onClickFile: (path: string) => void,
): HTMLElement {
  const rail = document.getElementById('rail')!;
  rail.innerHTML = '';

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
    folderEl.textContent = dir === '.' ? '(root)' : dir;
    rail.appendChild(folderEl);

    for (const f of dirFiles) {
      const fileEl = document.createElement('div');
      fileEl.className = 'tree-file' + (viewed[f.path] ? ' viewed' : '');
      fileEl.dataset.path = f.path;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!viewed[f.path];
      cb.addEventListener('change', () => onCheck(f.path, cb.checked));
      cb.addEventListener('click', (e) => e.stopPropagation());

      const name = document.createElement('span');
      name.className = 'filename';
      const baseName = f.path.slice(f.path.lastIndexOf('/') + 1);
      name.textContent = f.oldPath ? `${f.oldPath.split('/').pop()} → ${baseName}` : baseName;
      name.title = f.path;

      const stats = document.createElement('span');
      stats.className = 'stats';
      stats.innerHTML =
        `<span class="adds">+${f.additions}</span> <span class="dels">-${f.deletions}</span>`;

      fileEl.appendChild(cb);
      fileEl.appendChild(name);
      fileEl.appendChild(stats);
      fileEl.addEventListener('click', () => onClickFile(f.path));

      rail.appendChild(fileEl);
    }
  }

  return rail;
}

export function updateTreeViewed(viewed: Record<string, boolean>): void {
  document.querySelectorAll<HTMLElement>('.tree-file').forEach((el) => {
    const path = el.dataset.path!;
    el.classList.toggle('viewed', !!viewed[path]);
    const cb = el.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (cb) cb.checked = !!viewed[path];
  });
}
