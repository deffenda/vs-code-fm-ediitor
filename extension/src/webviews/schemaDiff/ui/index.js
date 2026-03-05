const vscode = acquireVsCodeApi();

const meta = document.getElementById('meta');
const summary = document.getElementById('summary');
const added = document.getElementById('added');
const removed = document.getElementById('removed');
const changed = document.getElementById('changed');
const exportButton = document.getElementById('exportButton');

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || message.type !== 'diff') {
    return;
  }

  renderDiff(message.payload);
});

exportButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportJson' });
});

function renderDiff(diff) {
  meta.textContent = `${diff.profileId} • ${diff.layout} • Compared ${diff.comparedAt}`;
  summary.textContent = `Added ${diff.summary.added}, Removed ${diff.summary.removed}, Changed ${diff.summary.changed}`;

  renderSimpleTable(added, diff.added || []);
  renderSimpleTable(removed, diff.removed || []);
  renderChanged(changed, diff.changed || []);
}

function renderSimpleTable(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="empty">None</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Field</th><th>Type</th><th>Repetitions</th></tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(row.name || '')}</td><td>${escapeHtml(row.type || row.result || '')}</td><td>${escapeHtml(String(row.repetitions ?? ''))}</td>`;
    tbody.appendChild(tr);
  }

  container.innerHTML = '';
  container.appendChild(table);
}

function renderChanged(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="empty">None</p>';
    return;
  }

  container.innerHTML = '';
  for (const item of rows) {
    const block = document.createElement('details');
    block.className = 'changed-item';
    block.innerHTML = `<summary>${escapeHtml(item.fieldName)} (${item.changes.length} changes)</summary>`;

    const list = document.createElement('ul');
    for (const change of item.changes) {
      const li = document.createElement('li');
      li.textContent = `${change.attribute}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`;
      list.appendChild(li);
    }

    block.appendChild(list);
    container.appendChild(block);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

vscode.postMessage({ type: 'ready' });
