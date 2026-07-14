import type { FileDiff, DiffLine } from '../../src/types';

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

  // Single 4-column table: old-ln | old-code | new-ln | new-code
  // This is the only correct way to keep rows height-aligned across both halves.
  const table = document.createElement('table');
  table.className = 'diff-table split-4col';

  for (const hunk of file.hunks) {
    const sep = table.insertRow();
    sep.className = 'hunk-sep';
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
    sep.appendChild(td);

    for (const pair of pairLines(hunk.lines)) {
      appendRow(table, pair);
    }
  }

  wrap.appendChild(table);
  return wrap;
}

interface Pair {
  kind: 'ctx' | 'del' | 'add' | 'chg';
  oldLine?: DiffLine;
  newLine?: DiffLine;
}

function pairLines(lines: DiffLine[]): Pair[] {
  const out: Pair[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'no-newline') { i++; continue; }

    if (line.type === 'context') {
      out.push({ kind: 'ctx', oldLine: line, newLine: line });
      i++;
      continue;
    }

    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'del') dels.push(lines[i++]);
    while (i < lines.length && lines[i].type === 'add') adds.push(lines[i++]);

    const len = Math.max(dels.length, adds.length);
    for (let j = 0; j < len; j++) {
      const d = dels[j];
      const a = adds[j];
      if (d && a)       out.push({ kind: 'chg', oldLine: d, newLine: a });
      else if (d)       out.push({ kind: 'del', oldLine: d });
      else              out.push({ kind: 'add', newLine: a });
    }
  }
  return out;
}

function appendRow(table: HTMLTableElement, p: Pair): void {
  const tr = document.createElement('tr');
  tr.className = `sp-${p.kind}`;

  // Old side
  const oLn = document.createElement('td');
  oLn.className = 'ln sp-old-ln';
  const oCode = document.createElement('td');
  oCode.className = 'code sp-old-code';

  if (p.oldLine) {
    oLn.textContent = p.oldLine.oldNo != null ? String(p.oldLine.oldNo) : '';
    oCode.textContent = p.oldLine.text;
  }

  // Divider
  const div = document.createElement('td');
  div.className = 'sp-div';

  // New side
  const nLn = document.createElement('td');
  nLn.className = 'ln sp-new-ln';
  const nCode = document.createElement('td');
  nCode.className = 'code sp-new-code';

  if (p.newLine) {
    nLn.textContent = p.newLine.newNo != null ? String(p.newLine.newNo) : '';
    nCode.textContent = p.newLine.text;
  }

  tr.appendChild(oLn);
  tr.appendChild(oCode);
  tr.appendChild(div);
  tr.appendChild(nLn);
  tr.appendChild(nCode);
  table.appendChild(tr);
}
