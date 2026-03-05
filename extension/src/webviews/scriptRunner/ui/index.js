const vscode = acquireVsCodeApi();

const state = {
  profiles: [],
  activeProfileId: undefined,
  defaults: undefined,
  layoutsByProfile: new Map(),
  scriptRunnerEnabled: true,
  includeAuthByDefault: false
};

const profileSelect = document.getElementById('profileSelect');
const layoutSelect = document.getElementById('layoutSelect');
const recordIdInput = document.getElementById('recordIdInput');
const scriptNameInput = document.getElementById('scriptNameInput');
const scriptParamInput = document.getElementById('scriptParamInput');
const includeAuthCheckbox = document.getElementById('includeAuthCheckbox');
const runButton = document.getElementById('runButton');
const copyCurlButton = document.getElementById('copyCurlButton');
const copyFetchButton = document.getElementById('copyFetchButton');
const status = document.getElementById('status');
const summary = document.getElementById('summary');
const rawResult = document.getElementById('rawResult');

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
    case 'scriptResult':
      renderResult(message.payload);
      break;
    case 'unsupported':
      setStatus(message.message || 'Script runner unsupported.', true);
      runButton.disabled = true;
      break;
    case 'error':
      setStatus(message.message || 'Unknown error.', true);
      break;
    default:
      break;
  }
});

profileSelect.addEventListener('change', () => {
  requestLayouts(profileSelect.value);
});

runButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  setStatus('Running script...');
  vscode.postMessage({
    type: 'runScript',
    payload
  });
});

copyCurlButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({
    type: 'copyCurl',
    payload: {
      ...payload,
      includeAuthHeader: includeAuthCheckbox.checked
    }
  });
});

copyFetchButton.addEventListener('click', () => {
  const payload = collectPayload();
  if (!payload) {
    return;
  }

  vscode.postMessage({
    type: 'copyFetch',
    payload: {
      ...payload,
      includeAuthHeader: includeAuthCheckbox.checked
    }
  });
});

function applyInit(payload) {
  state.profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  state.activeProfileId = payload.activeProfileId;
  state.defaults = payload.defaults;
  state.scriptRunnerEnabled = payload.scriptRunnerEnabled !== false;
  state.includeAuthByDefault = payload.includeAuthByDefault === true;

  includeAuthCheckbox.checked = state.includeAuthByDefault;
  runButton.disabled = !state.scriptRunnerEnabled;

  if (!state.scriptRunnerEnabled) {
    setStatus('Script runner is disabled by setting.', true);
  }

  renderProfiles();

  if (state.defaults && typeof state.defaults.recordId === 'string') {
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

  let selectedProfileId = state.defaults && state.defaults.profileId;
  if (!selectedProfileId) {
    selectedProfileId = state.activeProfileId || state.profiles[0].id;
  }

  profileSelect.value = selectedProfileId;
  requestLayouts(selectedProfileId, state.defaults && state.defaults.layout);
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
  const scriptName = scriptNameInput.value.trim();

  if (!profileId) {
    setStatus('Select a profile.', true);
    return undefined;
  }

  if (!layout) {
    setStatus('Select a layout.', true);
    return undefined;
  }

  if (!scriptName) {
    setStatus('Enter a script name.', true);
    return undefined;
  }

  return {
    profileId,
    layout,
    recordId: recordIdInput.value.trim(),
    scriptName,
    scriptParam: scriptParamInput.value
  };
}

function renderResult(payload) {
  const result = payload && payload.result ? payload.result : {};
  const messages = Array.isArray(result.messages) ? result.messages : [];

  summary.textContent = messages.length
    ? `Messages: ${messages.map((item) => `${item.code}:${item.message}`).join(' | ')}`
    : 'Script executed.';

  rawResult.textContent = JSON.stringify(payload, null, 2);
  setStatus('Script execution completed.');
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

vscode.postMessage({ type: 'ready' });
