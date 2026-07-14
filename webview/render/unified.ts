import type { FileDiff, Hunk, DiffLine } from '../../src/types';

export function renderUnified(file: FileDiff): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'diff-body unified';

  if (file.binary) {
    const stub = document.createElement('div');
    stub.className = 'binary-stub';
    stub.textContent = 'Binary file changed';
    wrap.appendChild(stub);
    return wrap;
  }

  if (file.hunks.length === 0) {
    const stub = document.createElement('div');
    stub.className = 'empty-state';
    stub.textContent = 'No textual changes';
    wrap.appendChild(stub);
    return wrap;
  }

  const table = document.createElement('table');
  table.className = 'diff-table unified-table';

  for (const hunk of file.hunks) {
    appendHunkSep(table, hunk);
    for (const line of hunk.lines) {
      appendUnifiedRow(table, line);
    }
  }

  wrap.appendChild(table);
  return wrap;
}

function appendHunkSep(table: HTMLTableElement, hunk: Hunk): void {
  const tr = table.insertRow();
  tr.className = 'hunk-sep';
  const td = document.createElement('td');
  td.colSpan = 3;
  td.textContent = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
  tr.appendChild(td);
}

function appendUnifiedRow(table: HTMLTableElement, line: DiffLine): void {
  if (line.type === 'no-newline') return;

  const tr = table.insertRow();
  tr.className = line.type === 'add' ? 'add' : line.type === 'del' ? 'del' : 'ctx';

  const td1 = document.createElement('td');
  td1.className = 'ln old-ln';
  td1.textContent = line.oldNo !== undefined ? String(line.oldNo) : '';

  const td2 = document.createElement('td');
  td2.className = 'ln new-ln';
  td2.textContent = line.newNo !== undefined ? String(line.newNo) : '';

  const td3 = document.createElement('td');
  td3.className = 'code';
  td3.textContent = line.text;

  tr.appendChild(td1);
  tr.appendChild(td2);
  tr.appendChild(td3);
  table.appendChild(tr);
}
