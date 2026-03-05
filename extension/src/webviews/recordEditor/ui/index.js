const vscode = acquireVsCodeApi();

const state = {
  profiles: [],
  activeProfileId: undefined,
  defaults: undefined,
  layoutsByProfile: new Map(),
  loaded: undefined,
  originalFieldData: {},
  draftFieldData: {}
};

const profileSelect = document.getElementById('profileSelect');
const layoutSelect = document.getElementById('layoutSelect');
const recordIdInput = document.getElementById('recordIdInput');
const loadButton = document.getElementById('loadButton');
const validateButton = document.getElementById('validateButton');
const previewButton = document.getElementById('previewButton');
const saveButton = document.getElementById('saveButton');
const discardButton = document.getElementById('discardButton');
const exportButton = document.getElementById('exportButton');
const statusEl = document.getElementById('status');
const fieldEditor = document.getElementById('fieldEditor');
const patchPreview = document.getElementById('patchPreview');
const rawRecord = document.getElementById('rawRecord');

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
    case 'recordLoaded':
      applyRecord(message.payload);
      break;
    case 'draftValidated':
      applyValidation(message.payload);
      break;
    case 'patchPreview':
      applyPatchPreview(message.payload);
      break;
    case 'recordSaved':
      applySaved(message.payload);
      break;
    case 'saveCancelled':
      setStatus('Save cancelled.');
      break;
    case 'error':
      setStatus(message.message || 'Unknown error.', true);
      break;
    default:
      break;
  }
});

profileSelect.addEventListener('change', () => {
  loadLayouts(profileSelect.value);
});

loadButton.addEventListener('click', () => {
  const payload = collectBasePayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({ type: 'loadRecord', payload });
  setStatus('Loading record...');
});

validateButton.addEventListener('click', () => {
  const payload = collectDraftPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({ type: 'validateDraft', payload });
});

previewButton.addEventListener('click', () => {
  const payload = collectDraftPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({ type: 'previewPatch', payload });
});

saveButton.addEventListener('click', () => {
  const payload = collectDraftPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({ type: 'saveRecord', payload });
  setStatus('Saving...');
});

discardButton.addEventListener('click', () => {
  if (!state.loaded) {
    return;
  }

  state.draftFieldData = { ...state.originalFieldData };
  renderFieldEditor();
  setStatus('Draft changes discarded.');
});

exportButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportRecord' });
});

function applyInit(payload) {
  state.profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  state.activeProfileId = payload.activeProfileId;
  state.defaults = payload.defaults;

  renderProfiles();
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

function applyRecord(payload) {
  if (!payload || !payload.record || !payload.record.fieldData) {
    return;
  }

  state.loaded = payload;
  state.originalFieldData = clone(payload.record.fieldData);
  state.draftFieldData = clone(payload.record.fieldData);

  rawRecord.textContent = JSON.stringify(payload.record, null, 2);
  patchPreview.textContent = '';
  renderFieldEditor();
  setStatus(`Loaded record ${payload.record.recordId}.`);
}

function applyValidation(payload) {
  if (!payload) {
    return;
  }

  if (payload.valid) {
    setStatus('Draft is valid.');
    return;
  }

  const details = Array.isArray(payload.errors)
    ? payload.errors.map((item) => `${item.field}: ${item.message}`).join(' | ')
    : 'Validation failed.';
  setStatus(details, true);
}

function applyPatchPreview(payload) {
  patchPreview.textContent = JSON.stringify(payload, null, 2);
  const count = payload && Array.isArray(payload.changedFields) ? payload.changedFields.length : 0;
  setStatus(`Patch preview ready (${count} changed field${count === 1 ? '' : 's'}).`);
}

function applySaved(payload) {
  if (!payload || !payload.record || !payload.record.fieldData) {
    return;
  }

  state.originalFieldData = clone(payload.record.fieldData);
  state.draftFieldData = clone(payload.record.fieldData);
  rawRecord.textContent = JSON.stringify(payload.record, null, 2);
  patchPreview.textContent = '';
  renderFieldEditor();
  setStatus('Record saved.');
}

function renderProfiles() {
  profileSelect.innerHTML = '';

  if (!state.profiles.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No profiles';
    profileSelect.appendChild(option);
    return;
  }

  for (const profile of state.profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = `${profile.name} (${profile.database})`;
    profileSelect.appendChild(option);
  }

  const selected =
    (state.defaults && state.defaults.profileId) || state.activeProfileId || state.profiles[0].id;
  profileSelect.value = selected;
  loadLayouts(selected, state.defaults && state.defaults.layout);

  if (state.defaults && state.defaults.recordId) {
    recordIdInput.value = state.defaults.recordId;
  }
}

function renderLayouts(layouts, preferredLayout) {
  layoutSelect.innerHTML = '';

  if (!Array.isArray(layouts) || !layouts.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No layouts';
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

function loadLayouts(profileId, preferredLayout) {
  const cached = state.layoutsByProfile.get(profileId);
  if (cached) {
    renderLayouts(cached, preferredLayout);
    return;
  }

  vscode.postMessage({
    type: 'loadLayouts',
    profileId
  });
}

function renderFieldEditor() {
  fieldEditor.innerHTML = '';

  const keys = Object.keys(state.draftFieldData).sort((a, b) => a.localeCompare(b));
  if (!keys.length) {
    fieldEditor.innerHTML = '<p class="empty">No fieldData available.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr><th>Field</th><th>Value</th></tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  for (const key of keys) {
    const tr = document.createElement('tr');

    const labelCell = document.createElement('td');
    labelCell.textContent = key;
    tr.appendChild(labelCell);

    const inputCell = document.createElement('td');
    const input = document.createElement('textarea');
    input.rows = 2;
    input.value = toEditableValue(state.draftFieldData[key]);
    input.addEventListener('change', () => {
      state.draftFieldData[key] = parseEditableValue(input.value);
      markDirtyState();
    });
    inputCell.appendChild(input);
    tr.appendChild(inputCell);
    tbody.appendChild(tr);
  }

  fieldEditor.appendChild(table);
}

function markDirtyState() {
  const changed = JSON.stringify(state.originalFieldData) !== JSON.stringify(state.draftFieldData);
  if (changed) {
    setStatus('Draft has unsaved changes.');
  }
}

function collectBasePayload() {
  const profileId = profileSelect.value;
  const layout = layoutSelect.value;
  const recordId = recordIdInput.value.trim();

  if (!profileId || !layout || !recordId) {
    setStatus('Profile, layout, and record ID are required.', true);
    return undefined;
  }

  return { profileId, layout, recordId };
}

function collectDraftPayload() {
  const base = collectBasePayload();
  if (!base) {
    return undefined;
  }

  return {
    ...base,
    originalFieldData: state.originalFieldData,
    draftFieldData: state.draftFieldData
  };
}

function toEditableValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function parseEditableValue(value) {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return '';
  }

  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

vscode.postMessage({ type: 'ready' });
