const vscode = acquireVsCodeApi();

const state = {
  profiles: [],
  activeProfileId: undefined,
  defaults: undefined,
  layoutsByProfile: new Map(),
  lastRecord: undefined
};

const profileSelect = document.getElementById('profileSelect');
const layoutSelect = document.getElementById('layoutSelect');
const recordIdInput = document.getElementById('recordIdInput');
const loadButton = document.getElementById('loadButton');
const exportButton = document.getElementById('exportButton');
const status = document.getElementById('status');
const fieldDataContainer = document.getElementById('fieldDataContainer');
const relatedDataContainer = document.getElementById('relatedDataContainer');
const rawJson = document.getElementById('rawJson');

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message.type !== 'string') {
    return;
  }

  switch (message.type) {
    case 'init': {
      applyInit(message.payload);
      break;
    }
    case 'layoutsLoaded': {
      applyLayouts(message.payload);
      break;
    }
    case 'recordLoaded': {
      renderRecord(message.payload);
      break;
    }
    case 'error': {
      setStatus(message.message || 'Unknown error.', true);
      break;
    }
    default:
      break;
  }
});

profileSelect.addEventListener('change', () => {
  requestLayouts(profileSelect.value);
});

loadButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  setStatus('Loading record...');
  vscode.postMessage({
    type: 'loadRecord',
    payload
  });
});

exportButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportRecord' });
});

function applyInit(payload) {
  state.profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  state.activeProfileId = payload.activeProfileId;
  state.defaults = payload.defaults;

  renderProfiles();

  if (state.defaults && state.defaults.recordId) {
    recordIdInput.value = state.defaults.recordId;
  }

  setStatus('Ready.');
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

  let profileId = state.defaults && state.defaults.profileId;
  if (!profileId) {
    profileId = state.activeProfileId || state.profiles[0].id;
  }

  profileSelect.value = profileId;
  requestLayouts(profileId, state.defaults && state.defaults.layout);
}

function requestLayouts(profileId, preferredLayout) {
  if (!profileId) {
    return;
  }

  const cached = state.layoutsByProfile.get(profileId);
  if (cached) {
    renderLayouts(cached, preferredLayout);
    return;
  }

  setStatus('Loading layouts...');
  vscode.postMessage({
    type: 'loadLayouts',
    profileId
  });
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

function collectPayload() {
  const profileId = profileSelect.value;
  const layout = layoutSelect.value;
  const recordId = recordIdInput.value.trim();

  if (!profileId) {
    setStatus('Select a profile.', true);
    return undefined;
  }

  if (!layout) {
    setStatus('Select a layout.', true);
    return undefined;
  }

  if (!recordId) {
    setStatus('Enter a record ID.', true);
    return undefined;
  }

  return {
    profileId,
    layout,
    recordId
  };
}

function renderRecord(payload) {
  state.lastRecord = payload;

  const record = payload.record || {};
  const fieldData = record.fieldData && typeof record.fieldData === 'object' ? record.fieldData : {};
  const relatedData = record.portalData && typeof record.portalData === 'object' ? record.portalData : {};

  fieldDataContainer.innerHTML = '';
  relatedDataContainer.innerHTML = '';

  fieldDataContainer.appendChild(renderFieldTable(fieldData));

  const relatedKeys = Object.keys(relatedData);
  if (relatedKeys.length > 0) {
    for (const key of relatedKeys) {
      const details = document.createElement('details');
      details.className = 'related-block';

      const summary = document.createElement('summary');
      summary.textContent = `${key} (${Array.isArray(relatedData[key]) ? relatedData[key].length : 0})`;
      details.appendChild(summary);

      const entries = Array.isArray(relatedData[key]) ? relatedData[key] : [];
      details.appendChild(renderRelatedRows(entries));

      relatedDataContainer.appendChild(details);
    }
  }

  rawJson.textContent = JSON.stringify(payload, null, 2);
  setStatus(`Loaded record ${record.recordId || ''}.`);
}

function renderFieldTable(fieldData) {
  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const fieldHeader = document.createElement('th');
  fieldHeader.textContent = 'Field';
  headRow.appendChild(fieldHeader);

  const valueHeader = document.createElement('th');
  valueHeader.textContent = 'Value';
  headRow.appendChild(valueHeader);

  const copyHeader = document.createElement('th');
  copyHeader.textContent = 'Copy';
  headRow.appendChild(copyHeader);

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const [field, value] of Object.entries(fieldData)) {
    const row = document.createElement('tr');

    const fieldCell = document.createElement('td');
    fieldCell.textContent = field;
    row.appendChild(fieldCell);

    const valueCell = document.createElement('td');
    valueCell.textContent = toText(value);
    row.appendChild(valueCell);

    const copyCell = document.createElement('td');
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', async () => {
      const text = toText(value);
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${field}.`);
    });
    copyCell.appendChild(copyButton);
    row.appendChild(copyCell);

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  return table;
}

function renderRelatedRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No related rows.';
    return empty;
  }

  const pre = document.createElement('pre');
  pre.className = 'raw-small';
  pre.textContent = JSON.stringify(rows, null, 2);
  return pre;
}

function toText(value) {
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

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

vscode.postMessage({ type: 'ready' });
