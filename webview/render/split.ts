import type { FileDiff, Hunk, DiffLine } from '../../src/types';

export function renderSplit(file: FileDiff): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'diff-body split';

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

  const grid = document.createElement('div');
  grid.className = 'split-table';

  const leftTable = buildSplitTable();
  const rightTable = buildSplitTable();

  for (const hunk of file.hunks) {
    appendSplitHunkSep(leftTable, rightTable, hunk);
    const { leftRows, rightRows } = pairHunkLines(hunk.lines);
    for (let i = 0; i < Math.max(leftRows.length, rightRows.length); i++) {
      appendSplitRow(leftTable, leftRows[i]);
      appendSplitRow(rightTable, rightRows[i]);
    }
  }

  grid.appendChild(leftTable);
  grid.appendChild(rightTable);
  wrap.appendChild(grid);
  return wrap;
}

function buildSplitTable(): HTMLTableElement {
  const t = document.createElement('table');
  t.className = 'diff-table split-half';
  return t;
}

function appendSplitHunkSep(
  left: HTMLTableElement,
  right: HTMLTableElement,
  hunk: Hunk,
): void {
  const makeRow = (label: string) => {
    const tr = document.createElement('tr');
    tr.className = 'hunk-sep';
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = label;
    tr.appendChild(td);
    return tr;
  };
  left.appendChild(makeRow(`@@ -${hunk.oldStart},${hunk.oldLines} @@`));
  right.appendChild(makeRow(`@@ +${hunk.newStart},${hunk.newLines} @@`));
}

interface SplitLine {
  type: 'add' | 'del' | 'context' | 'empty';
  ln?: number;
  text?: string;
}

function pairHunkLines(lines: DiffLine[]): { leftRows: SplitLine[]; rightRows: SplitLine[] } {
  const leftRows: SplitLine[] = [];
  const rightRows: SplitLine[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'no-newline') { i++; continue; }

    if (line.type === 'context') {
      leftRows.push({ type: 'context', ln: line.oldNo, text: line.text });
      rightRows.push({ type: 'context', ln: line.newNo, text: line.text });
      i++;
      continue;
    }

    // Collect a block of del/add lines and pair them
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'del') { dels.push(lines[i++]); }
    while (i < lines.length && lines[i].type === 'add') { adds.push(lines[i++]); }

    const maxLen = Math.max(dels.length, adds.length);
    for (let j = 0; j < maxLen; j++) {
      leftRows.push(
        j < dels.length
          ? { type: 'del', ln: dels[j].oldNo, text: dels[j].text }
          : { type: 'empty' },
      );
      rightRows.push(
        j < adds.length
          ? { type: 'add', ln: adds[j].newNo, text: adds[j].text }
          : { type: 'empty' },
      );
    }
  }

  return { leftRows, rightRows };
}

function appendSplitRow(table: HTMLTableElement, line: SplitLine | undefined): void {
  const tr = document.createElement('tr');
  const l = line ?? { type: 'empty' as const };

  if (l.type === 'empty') {
    tr.className = 'empty-row';
    const td1 = document.createElement('td');
    td1.className = 'ln';
    const td2 = document.createElement('td');
    td2.className = 'code';
    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);
    return;
  }

  tr.className = l.type;

  const lnTd = document.createElement('td');
  lnTd.className = 'ln';
  lnTd.textContent = l.ln !== undefined ? String(l.ln) : '';

  const codeTd = document.createElement('td');
  codeTd.className = 'code';
  codeTd.textContent = l.text ?? '';

  tr.appendChild(lnTd);
  tr.appendChild(codeTd);
  table.appendChild(tr);
}
