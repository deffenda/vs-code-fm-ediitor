const vscode = acquireVsCodeApi();

const state = {
  profiles: [],
  activeProfileId: undefined,
  layoutsByProfile: new Map(),
  savedQueries: [],
  currentPayload: undefined,
  currentQueryId: undefined,
  lastResult: undefined,
  defaults: undefined,
  history: []
};

const profileSelect = document.getElementById('profileSelect');
const layoutSelect = document.getElementById('layoutSelect');
const findJson = document.getElementById('findJson');
const sortJson = document.getElementById('sortJson');
const limitInput = document.getElementById('limitInput');
const offsetInput = document.getElementById('offsetInput');
const queryNameInput = document.getElementById('queryNameInput');
const includeAuthCheckbox = document.getElementById('includeAuthCheckbox');
const runButton = document.getElementById('runButton');
const saveButton = document.getElementById('saveButton');
const exportEditorButton = document.getElementById('exportEditorButton');
const exportJsonButton = document.getElementById('exportJsonButton');
const exportCsvButton = document.getElementById('exportCsvButton');
const copyFetchButton = document.getElementById('copyFetchButton');
const copyCurlButton = document.getElementById('copyCurlButton');
const savedQueriesSelect = document.getElementById('savedQueriesSelect');
const loadSavedButton = document.getElementById('loadSavedButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const refreshHistoryButton = document.getElementById('refreshHistoryButton');
const rawToggle = document.getElementById('rawToggle');
const status = document.getElementById('status');
const resultSummary = document.getElementById('resultSummary');
const tableContainer = document.getElementById('tableContainer');
const rawContainer = document.getElementById('rawContainer');
const historyContainer = document.getElementById('historyContainer');

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message.type !== 'string') {
    return;
  }

  switch (message.type) {
    case 'init':
      applyInit(message.payload);
      break;
    case 'layoutsLoaded':
      applyLayouts(message.payload);
      break;
    case 'queryResult':
      renderQueryResult(message.payload);
      break;
    case 'savedQueries':
      state.savedQueries = Array.isArray(message.payload) ? message.payload : [];
      renderSavedQueries();
      setStatus('Saved queries updated.');
      break;
    case 'history':
      state.history = Array.isArray(message.payload) ? message.payload : [];
      renderHistory();
      break;
    case 'saveCurrentQuery':
      saveButton.click();
      break;
    case 'error':
      setStatus(message.message || 'Unknown error.', true);
      break;
    default:
      break;
  }
});

profileSelect.addEventListener('change', () => {
  const profileId = profileSelect.value;
  requestLayouts(profileId);
});

runButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  state.currentPayload = payload;
  setStatus('Running query...');
  vscode.postMessage({
    type: 'runQuery',
    payload
  });
});

saveButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  const name = queryNameInput.value.trim();
  if (!name) {
    setStatus('Enter a name before saving query.', true);
    return;
  }

  vscode.postMessage({
    type: 'saveQuery',
    payload: {
      ...payload,
      name
    }
  });
});

exportEditorButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportResultsToEditor' });
});

exportJsonButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportResultsJsonFile' });
});

exportCsvButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportResultsCsvFile' });
});

copyFetchButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({
    type: 'copyFetchSnippet',
    payload: {
      ...payload,
      includeAuthHeader: includeAuthCheckbox.checked
    }
  });
});

copyCurlButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({
    type: 'copyCurlSnippet',
    payload: {
      ...payload,
      includeAuthHeader: includeAuthCheckbox.checked
    }
  });
});

loadSavedButton.addEventListener('click', () => {
  const selectedId = savedQueriesSelect.value;
  const selected = state.savedQueries.find((item) => item.id === selectedId);

  if (!selected) {
    setStatus('Select a saved query to load.', true);
    return;
  }

  applySavedQuery(selected);
  setStatus(`Loaded saved query "${selected.name}".`);
});

rawToggle.addEventListener('change', () => {
  renderResultView();
});

prevButton.addEventListener('click', () => {
  const limit = parseNumber(limitInput.value) ?? 100;
  const currentOffset = parseNumber(offsetInput.value) ?? 0;
  offsetInput.value = String(Math.max(0, currentOffset - limit));
  runButton.click();
});

nextButton.addEventListener('click', () => {
  const limit = parseNumber(limitInput.value) ?? 100;
  const currentOffset = parseNumber(offsetInput.value) ?? 0;
  offsetInput.value = String(currentOffset + limit);
  runButton.click();
});

refreshHistoryButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'refreshHistory' });
});

function applyInit(payload) {
  state.profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  state.activeProfileId = payload.activeProfileId;
  state.savedQueries = Array.isArray(payload.savedQueries) ? payload.savedQueries : [];
  state.defaults = payload.defaults;

  includeAuthCheckbox.checked = payload.includeAuthByDefault === true;

  renderProfiles();
  renderSavedQueries();

  const defaultFind = findJson.value.trim();
  if (!defaultFind) {
    findJson.value = '[{}]';
  }

  if (payload.defaults && payload.defaults.savedQuery) {
    applySavedQuery(payload.defaults.savedQuery);
  }

  setStatus('Ready.');
}

function applyLayouts(payload) {
  if (!payload || typeof payload.profileId !== 'string' || !Array.isArray(payload.layouts)) {
    return;
  }

  state.layoutsByProfile.set(payload.profileId, payload.layouts);

  if (profileSelect.value === payload.profileId) {
    renderLayouts(payload.layouts, state.defaults && state.defaults.layout);
    state.defaults = undefined;
  }
}

function renderProfiles() {
  profileSelect.innerHTML = '';

  if (state.profiles.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No profiles configured';
    profileSelect.appendChild(option);
    return;
  }

  for (const profile of state.profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = `${profile.name} (${profile.database})`;
    profileSelect.appendChild(option);
  }

  let selectedProfileId = state.defaults && state.defaults.profileId;
  if (!selectedProfileId) {
    selectedProfileId = state.activeProfileId || state.profiles[0].id;
  }

  profileSelect.value = selectedProfileId;
  requestLayouts(selectedProfileId, state.defaults && state.defaults.layout);
}

function renderLayouts(layouts, preferredLayout) {
  layoutSelect.innerHTML = '';

  if (!Array.isArray(layouts) || layouts.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No layouts available';
    layoutSelect.appendChild(option);
    return;
  }

  for (const layout of layouts) {
    const option = document.createElement('option');
    option.value = layout;
    option.textContent = layout;
    layoutSelect.appendChild(option);
  }

  if (preferredLayout && layouts.includes(preferredLayout)) {
    layoutSelect.value = preferredLayout;
  } else {
    layoutSelect.value = layouts[0];
  }
}

function requestLayouts(profileId, preferredLayout) {
  if (!profileId) {
    return;
  }

  const cachedLayouts = state.layoutsByProfile.get(profileId);
  if (cachedLayouts) {
    renderLayouts(cachedLayouts, preferredLayout);
    return;
  }

  setStatus('Loading layouts...');
  vscode.postMessage({
    type: 'loadLayouts',
    profileId
  });
}

function collectPayload() {
  const profileId = profileSelect.value;
  const layout = layoutSelect.value;

  if (!profileId) {
    setStatus('Select a profile.', true);
    return undefined;
  }

  if (!layout) {
    setStatus('Select a layout.', true);
    return undefined;
  }

  return {
    profileId,
    layout,
    findJson: findJson.value,
    sortJson: sortJson.value,
    limit: parseNumber(limitInput.value),
    offset: parseNumber(offsetInput.value),
    queryId: state.currentQueryId
  };
}

function parseNumber(value) {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function renderQueryResult(payload) {
  state.lastResult = payload;
  renderResultView();

  const total = Array.isArray(payload.result && payload.result.data) ? payload.result.data.length : 0;
  setStatus(`Query completed. Returned ${total} records.`);

  vscode.postMessage({ type: 'refreshHistory' });
}

function renderResultView() {
  if (!state.lastResult) {
    resultSummary.textContent = 'No results yet.';
    tableContainer.innerHTML = '';
    rawContainer.textContent = '';
    return;
  }

  const result = state.lastResult.result || {};
  const records = Array.isArray(result.data) ? result.data : [];

  const summaryParts = [`Records: ${records.length}`];
  if (state.lastResult.query) {
    summaryParts.push(`Layout: ${state.lastResult.query.layout}`);
  }
  resultSummary.textContent = summaryParts.join(' | ');

  rawContainer.textContent = JSON.stringify(state.lastResult, null, 2);

  if (rawToggle.checked) {
    rawContainer.classList.remove('hidden');
    tableContainer.innerHTML = '';
    return;
  }

  rawContainer.classList.add('hidden');

  if (records.length === 0) {
    tableContainer.innerHTML = '<p>No records returned.</p>';
    return;
  }

  const columns = collectColumns(records);
  tableContainer.innerHTML = '';

  if (records.length > 250) {
    renderVirtualizedTable(records, columns);
    return;
  }

  tableContainer.appendChild(buildDataTable(records, columns));
}

function collectColumns(records) {
  const seen = new Set();

  for (const record of records) {
    const fieldData = record.fieldData && typeof record.fieldData === 'object' ? record.fieldData : {};
    Object.keys(fieldData).forEach((key) => seen.add(key));
  }

  return Array.from(seen).slice(0, 60);
}

function toCellValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderSavedQueries() {
  savedQueriesSelect.innerHTML = '';

  if (!Array.isArray(state.savedQueries) || state.savedQueries.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No saved queries';
    savedQueriesSelect.appendChild(option);
    return;
  }

  for (const query of state.savedQueries) {
    const option = document.createElement('option');
    option.value = query.id;
    option.textContent = `${query.name} (${query.layout})`;
    savedQueriesSelect.appendChild(option);
  }
}

function applySavedQuery(query) {
  state.currentQueryId = query.id;

  profileSelect.value = query.profileId;
  requestLayouts(query.profileId, query.layout);

  findJson.value = JSON.stringify(query.findJson || [], null, 2);
  sortJson.value = query.sortJson ? JSON.stringify(query.sortJson, null, 2) : '';
  limitInput.value = query.limit !== undefined ? String(query.limit) : '';
  offsetInput.value = query.offset !== undefined ? String(query.offset) : '';
  queryNameInput.value = query.name;
}

function renderHistory() {
  historyContainer.innerHTML = '';

  if (!Array.isArray(state.history) || state.history.length === 0) {
    historyContainer.innerHTML = '<p>No history entries yet.</p>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  ['Time', 'Operation', 'Profile', 'Layout', 'Status', 'Duration'].forEach((title) => {
    const th = document.createElement('th');
    th.textContent = title;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const entry of state.history) {
    const row = document.createElement('tr');

    addCell(row, entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '');
    addCell(row, entry.operation || '');
    addCell(row, entry.profileId || '');
    addCell(row, entry.layout || '-');
    addCell(row, entry.success ? 'Success' : 'Failure');
    addCell(row, `${entry.durationMs || 0}ms`);

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  historyContainer.appendChild(table);
}

function addCell(row, text) {
  const td = document.createElement('td');
  td.textContent = text;
  row.appendChild(td);
}

function buildDataTable(records, columns) {
  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const idHeader = document.createElement('th');
  idHeader.textContent = 'recordId';
  headerRow.appendChild(idHeader);

  for (const column of columns) {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const record of records) {
    tbody.appendChild(buildResultRow(record, columns));
  }

  table.appendChild(tbody);
  return table;
}

function buildResultRow(record, columns) {
  const row = document.createElement('tr');
  const idCell = document.createElement('td');
  idCell.textContent = String(record.recordId || '');
  row.appendChild(idCell);

  const fieldData = record.fieldData && typeof record.fieldData === 'object' ? record.fieldData : {};

  for (const column of columns) {
    const td = document.createElement('td');
    td.textContent = toCellValue(fieldData[column]);
    row.appendChild(td);
  }

  return row;
}

function renderVirtualizedTable(records, columns) {
  const container = document.createElement('div');
  container.className = 'virtual-wrap';
  container.style.height = '360px';
  container.style.overflow = 'auto';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const idHeader = document.createElement('th');
  idHeader.textContent = 'recordId';
  headerRow.appendChild(idHeader);

  for (const column of columns) {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  container.appendChild(table);
  tableContainer.appendChild(container);

  const rowHeight = 30;
  const buffer = 18;

  const renderSlice = () => {
    const visibleCount = Math.ceil(container.clientHeight / rowHeight) + buffer;
    const start = Math.max(0, Math.floor(container.scrollTop / rowHeight) - Math.floor(buffer / 2));
    const end = Math.min(records.length, start + visibleCount);

    tbody.innerHTML = '';

    const topSpacer = document.createElement('tr');
    topSpacer.style.height = `${start * rowHeight}px`;
    topSpacer.innerHTML = `<td colspan=\"${columns.length + 1}\"></td>`;
    tbody.appendChild(topSpacer);

    for (let index = start; index < end; index += 1) {
      tbody.appendChild(buildResultRow(records[index], columns));
    }

    const bottomSpacer = document.createElement('tr');
    bottomSpacer.style.height = `${Math.max(0, (records.length - end) * rowHeight)}px`;
    bottomSpacer.innerHTML = `<td colspan=\"${columns.length + 1}\"></td>`;
    tbody.appendChild(bottomSpacer);
  };

  container.addEventListener('scroll', renderSlice);
  renderSlice();
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

vscode.postMessage({ type: 'ready' });
