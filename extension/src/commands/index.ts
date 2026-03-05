import { randomUUID } from 'crypto';

import * as vscode from 'vscode';

import type { RoleGuard } from '../enterprise/roleGuard';
import type { FMClient } from '../services/fmClient';
import type { Logger } from '../services/logger';
import type { ProfileStore } from '../services/profileStore';
import type { SavedQueriesStore } from '../services/savedQueriesStore';
import type { SecretStore } from '../services/secretStore';
import type { ConnectionProfile, FindRecordsRequest } from '../types/fm';
import {
  parseFindJson,
  parseOptionalNonNegativeInteger,
  parseSortJson,
  validateDatabaseName,
  validateRecordId,
  validateServerUrl
} from '../utils/jsonValidate';
import {
  openJsonDocument,
  parseLayoutArg,
  promptForLayout,
  resolveProfileFromArg,
  showCommandError
} from './common';
import { QueryBuilderPanel } from '../webviews/queryBuilder';
import { RecordViewerPanel } from '../webviews/recordViewer';

interface RegisterCoreCommandDeps {
  context: vscode.ExtensionContext;
  profileStore: ProfileStore;
  secretStore: SecretStore;
  savedQueriesStore: SavedQueriesStore;
  fmClient: FMClient;
  logger: Logger;
  roleGuard: RoleGuard;
  refreshExplorer: () => void;
  onProfileDisconnected?: (profileId: string) => void;
}

export function registerCoreCommands(deps: RegisterCoreCommandDeps): vscode.Disposable[] {
  const {
    context,
    profileStore,
    secretStore,
    savedQueriesStore,
    fmClient,
    logger,
    roleGuard,
    refreshExplorer,
    onProfileDisconnected
  } = deps;

  return [
    vscode.commands.registerCommand('filemakerDataApiTools.addConnectionProfile', async () => {
      if (!(await roleGuard.assertFeature('writeOperations', 'Add Connection Profile'))) {
        return;
      }

      const input = await collectProfileInput();
      if (!input) {
        return;
      }

      await profileStore.upsertProfile(input.profile);

      if (input.profile.authMode === 'direct') {
        if (input.password) {
          await secretStore.setPassword(input.profile.id, input.password);
        }

        await secretStore.deleteProxyApiKey(input.profile.id);
      } else {
        if (input.proxyApiKey) {
          await secretStore.setProxyApiKey(input.profile.id, input.proxyApiKey);
        }

        await secretStore.deletePassword(input.profile.id);
      }

      refreshExplorer();
      vscode.window.showInformationMessage(`Added connection profile "${input.profile.name}".`);
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.editConnectionProfile', async (arg: unknown) => {
      const profile = await resolveProfileFromArg(arg, profileStore);
      if (!profile) {
        return;
      }
      if (roleGuard.isProfileLocked(profile.id)) {
        vscode.window.showWarningMessage('This profile is locked by enterprise configuration.');
        return;
      }
      if (!(await roleGuard.assertFeature('writeOperations', 'Edit Connection Profile'))) {
        return;
      }

      const input = await collectProfileInput(profile);
      if (!input) {
        return;
      }

      await profileStore.upsertProfile(input.profile);

      if (input.profile.authMode === 'direct') {
        if (typeof input.password === 'string' && input.password.length > 0) {
          await secretStore.setPassword(input.profile.id, input.password);
        }

        await secretStore.deleteProxyApiKey(input.profile.id);
      } else {
        if (typeof input.proxyApiKey === 'string' && input.proxyApiKey.length > 0) {
          await secretStore.setProxyApiKey(input.profile.id, input.proxyApiKey);
        }

        await secretStore.deletePassword(input.profile.id);
      }

      refreshExplorer();
      vscode.window.showInformationMessage(`Updated profile "${input.profile.name}".`);
    }),

    vscode.commands.registerCommand(
      'filemakerDataApiTools.removeConnectionProfile',
      async (arg: unknown) => {
        const profile = await resolveProfileFromArg(arg, profileStore);
        if (!profile) {
          return;
        }
        if (roleGuard.isProfileLocked(profile.id)) {
          vscode.window.showWarningMessage('This profile is locked by enterprise configuration.');
          return;
        }
        if (!(await roleGuard.assertFeature('writeOperations', 'Remove Connection Profile'))) {
          return;
        }

        const confirmation = await vscode.window.showWarningMessage(
          `Remove profile "${profile.name}" and all associated secrets?`,
          { modal: true },
          'Remove'
        );

        if (confirmation !== 'Remove') {
          return;
        }

        await profileStore.removeProfile(profile.id);
        await savedQueriesStore.removeQueriesForProfile(profile.id);
        await secretStore.clearProfileSecrets(profile.id);

        fmClient.invalidateProfileCache(profile.id);
        onProfileDisconnected?.(profile.id);

        refreshExplorer();
        vscode.window.showInformationMessage(`Removed profile "${profile.name}".`);
      }
    ),

    vscode.commands.registerCommand('filemakerDataApiTools.connect', async (arg: unknown) => {
      const profile = await resolveProfileFromArg(arg, profileStore);
      if (!profile) {
        return;
      }

      try {
        await fmClient.createSession(profile);
        await profileStore.setActiveProfileId(profile.id);
        refreshExplorer();
        vscode.window.showInformationMessage(`Connected to "${profile.name}".`);
      } catch (error) {
        await showCommandError(error, {
          fallbackMessage: 'Failed to connect to FileMaker profile.',
          logger,
          logMessage: 'Connect command failed.'
        });
      }
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.disconnect', async (arg: unknown) => {
      const profile = await resolveProfileFromArg(arg, profileStore, true);
      if (!profile) {
        return;
      }

      try {
        await fmClient.deleteSession(profile);

        if (profileStore.getActiveProfileId() === profile.id) {
          await profileStore.setActiveProfileId(undefined);
        }

        onProfileDisconnected?.(profile.id);
        refreshExplorer();
        vscode.window.showInformationMessage(`Disconnected from "${profile.name}".`);
      } catch (error) {
        await showCommandError(error, {
          fallbackMessage: 'Failed to disconnect from FileMaker profile.',
          logger,
          logMessage: 'Disconnect command failed.'
        });
      }
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.listLayouts', async (arg: unknown) => {
      const profile = await resolveProfileFromArg(arg, profileStore, true);
      if (!profile) {
        return;
      }

      try {
        const layouts = await fmClient.listLayouts(profile);
        await openJsonDocument({
          profile: profile.name,
          database: profile.database,
          layouts
        });
      } catch (error) {
        await showCommandError(error, {
          fallbackMessage: 'Failed to list layouts.',
          logger,
          logMessage: 'List layouts command failed.'
        });
      }
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.runFindJson', async (arg: unknown) => {
      const contextArg = parseLayoutArg(arg);
      const profile = await resolveProfileFromArg(contextArg, profileStore, true);
      if (!profile) {
        return;
      }

      const layout = contextArg.layout ?? (await promptForLayout(profile, fmClient));
      if (!layout) {
        return;
      }

      const findJsonInput = await vscode.window.showInputBox({
        title: 'Run Find',
        prompt: 'Enter find query JSON array',
        value: '[{}]',
        ignoreFocusOut: true
      });
      if (!findJsonInput) {
        return;
      }

      const sortJsonInput = await vscode.window.showInputBox({
        title: 'Run Find',
        prompt: 'Enter sort JSON array (optional)',
        ignoreFocusOut: true
      });

      const limitInput = await vscode.window.showInputBox({
        title: 'Run Find',
        prompt: 'Enter limit (optional)',
        ignoreFocusOut: true
      });

      const offsetInput = await vscode.window.showInputBox({
        title: 'Run Find',
        prompt: 'Enter offset (optional)',
        ignoreFocusOut: true
      });

      try {
        const findValidation = parseFindJson(findJsonInput);
        if (!findValidation.ok || !findValidation.value) {
          throw new Error(findValidation.error ?? 'Find JSON is invalid.');
        }

        let sortValidationValue: Array<Record<string, unknown>> | undefined;

        if (sortJsonInput && sortJsonInput.trim().length > 0) {
          const sortValidation = parseSortJson(sortJsonInput);
          if (!sortValidation.ok || !sortValidation.value) {
            throw new Error(sortValidation.error ?? 'Sort JSON is invalid.');
          }

          sortValidationValue = sortValidation.value;
        }

        const request: FindRecordsRequest = {
          query: findValidation.value,
          sort: sortValidationValue,
          limit: parseOptionalNonNegativeInteger(limitInput, 'Limit'),
          offset: parseOptionalNonNegativeInteger(offsetInput, 'Offset')
        };

        const result = await fmClient.findRecords(profile, layout, request);
        await openJsonDocument({
          profile: profile.name,
          layout,
          request,
          result
        });
      } catch (error) {
        await showCommandError(error, {
          fallbackMessage: 'Failed to run find query.',
          logger,
          logMessage: 'Run find command failed.'
        });
      }
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.getRecordById', async (arg: unknown) => {
      const contextArg = parseLayoutArg(arg);
      const profile = await resolveProfileFromArg(contextArg, profileStore, true);
      if (!profile) {
        return;
      }

      const layout = contextArg.layout ?? (await promptForLayout(profile, fmClient));
      if (!layout) {
        return;
      }

      const recordId = await vscode.window.showInputBox({
        title: 'Get Record by ID',
        prompt: 'Enter FileMaker record ID',
        ignoreFocusOut: true,
        validateInput: (value) => validateRecordId(value).error
      });

      if (!recordId) {
        return;
      }

      try {
        const record = await fmClient.getRecord(profile, layout, recordId);
        await openJsonDocument({
          profile: profile.name,
          layout,
          record
        });
      } catch (error) {
        await showCommandError(error, {
          fallbackMessage: 'Failed to get record by ID.',
          logger,
          logMessage: 'Get record command failed.'
        });
      }
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.openRecordViewer', async (arg: unknown) => {
      const contextArg = parseLayoutArg(arg);

      let profileId = contextArg.profileId;
      let layout = contextArg.layout;
      let recordId: string | undefined;

      if (!profileId) {
        const profile = await resolveProfileFromArg(undefined, profileStore, true);
        if (!profile) {
          return;
        }

        profileId = profile.id;
      }

      if (!layout) {
        const profile = await profileStore.getProfile(profileId);
        if (!profile) {
          vscode.window.showErrorMessage('Selected profile not found.');
          return;
        }

        layout = await promptForLayout(profile, fmClient);
      }

      if (layout) {
        recordId = await vscode.window.showInputBox({
          title: 'Open Record Viewer',
          prompt: 'Record ID (optional)',
          ignoreFocusOut: true
        });
      }

      RecordViewerPanel.createOrShow(context, profileStore, fmClient, logger, {
        profileId,
        layout,
        recordId
      });
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.openQueryBuilder', async (arg: unknown) => {
      const contextArg = parseLayoutArg(arg);
      QueryBuilderPanel.createOrShow(context, profileStore, savedQueriesStore, fmClient, logger, {
        profileId: contextArg.profileId,
        layout: contextArg.layout
      });
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.refreshExplorer', () => {
      refreshExplorer();
    })
  ];
}

async function collectProfileInput(
  existing?: ConnectionProfile
): Promise<
  | {
      profile: ConnectionProfile;
      password?: string;
      proxyApiKey?: string;
    }
  | undefined
> {
  const name = await vscode.window.showInputBox({
    title: existing ? 'Edit Connection Profile' : 'Add Connection Profile',
    prompt: 'Profile name',
    value: existing?.name,
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim().length === 0 ? 'Profile name is required.' : undefined)
  });

  if (!name) {
    return undefined;
  }

  const authMode = await vscode.window.showQuickPick(
    [
      { label: 'Direct', value: 'direct' as const, detail: 'Extension calls FileMaker Data API directly.' },
      {
        label: 'Proxy',
        value: 'proxy' as const,
        detail: 'Extension calls your proxy endpoint (recommended for teams).'
      }
    ],
    {
      title: 'Authentication Mode',
      placeHolder: 'Select profile authentication mode'
    }
  );

  if (!authMode) {
    return undefined;
  }

  const serverUrl = await vscode.window.showInputBox({
    title: `${authMode.label} Profile`,
    prompt: 'Server URL (https://server.example.com)',
    value: existing?.serverUrl ?? '',
    ignoreFocusOut: true,
    validateInput: (value) => validateServerUrl(value).error
  });

  if (!serverUrl) {
    return undefined;
  }

  const database = await vscode.window.showInputBox({
    title: `${authMode.label} Profile`,
    prompt: 'Database name',
    value: existing?.database,
    ignoreFocusOut: true,
    validateInput: (value) => validateDatabaseName(value).error
  });

  if (!database) {
    return undefined;
  }

  const normalizedServerUrl = validateServerUrl(serverUrl);
  const normalizedDatabase = validateDatabaseName(database);
  if (!normalizedServerUrl.ok || !normalizedServerUrl.value) {
    await showCommandError(new Error(normalizedServerUrl.error ?? 'Server URL is invalid.'), {
      fallbackMessage: 'Connection profile server URL is invalid.'
    });
    return undefined;
  }
  const serverUrlValue = normalizedServerUrl.value;

  if (!normalizedDatabase.ok || !normalizedDatabase.value) {
    await showCommandError(new Error(normalizedDatabase.error ?? 'Database name is invalid.'), {
      fallbackMessage: 'Connection profile database name is invalid.'
    });
    return undefined;
  }
  const databaseValue = normalizedDatabase.value;

  const defaultApiBasePath = vscode.workspace
    .getConfiguration('filemakerDataApiTools')
    .get<string>('defaultApiBasePath', '/fmi/data');
  const defaultApiVersionPath = vscode.workspace
    .getConfiguration('filemakerDataApiTools')
    .get<string>('defaultApiVersionPath', 'vLatest');

  const apiBasePath = await vscode.window.showInputBox({
    title: 'API Path',
    prompt: 'API base path',
    value: existing?.apiBasePath ?? defaultApiBasePath,
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim().length === 0 ? 'API base path is required.' : undefined)
  });

  if (!apiBasePath) {
    return undefined;
  }

  const apiVersionPath = await vscode.window.showInputBox({
    title: 'API Version',
    prompt: 'API version path',
    value: existing?.apiVersionPath ?? defaultApiVersionPath,
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim().length === 0 ? 'API version path is required.' : undefined)
  });

  if (!apiVersionPath) {
    return undefined;
  }

  const profile: ConnectionProfile = {
    id: existing?.id ?? randomUUID(),
    name: name.trim(),
    authMode: authMode.value,
    serverUrl: serverUrlValue,
    database: databaseValue,
    apiBasePath: apiBasePath.trim(),
    apiVersionPath: apiVersionPath.trim()
  };

  if (authMode.value === 'direct') {
    const username = await vscode.window.showInputBox({
      title: 'Direct Authentication',
      prompt: 'Username',
      value: existing?.username,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim().length === 0 ? 'Username is required.' : undefined)
    });

    if (!username) {
      return undefined;
    }

    profile.username = username.trim();

    const password = await vscode.window.showInputBox({
      title: 'Direct Authentication',
      prompt: existing ? 'Password (leave blank to keep existing password)' : 'Password',
      password: true,
      ignoreFocusOut: true
    });

    if (!existing && (!password || password.length === 0)) {
      vscode.window.showErrorMessage('Password is required for a new direct-auth profile.');
      return undefined;
    }

    return {
      profile,
      password
    };
  }

  const proxyEndpoint = await vscode.window.showInputBox({
    title: 'Proxy Authentication',
    prompt: 'Proxy endpoint URL',
    value: existing?.proxyEndpoint,
    ignoreFocusOut: true,
    validateInput: (value) => validateServerUrl(value).error
  });

  if (!proxyEndpoint) {
    return undefined;
  }

  const normalizedProxyEndpoint = validateServerUrl(proxyEndpoint);
  if (!normalizedProxyEndpoint.ok || !normalizedProxyEndpoint.value) {
    await showCommandError(new Error(normalizedProxyEndpoint.error ?? 'Proxy endpoint is invalid.'), {
      fallbackMessage: 'Proxy endpoint is invalid.'
    });
    return undefined;
  }

  profile.proxyEndpoint = normalizedProxyEndpoint.value;

  const proxyApiKey = await vscode.window.showInputBox({
    title: 'Proxy Authentication',
    prompt: existing
      ? 'Proxy API key / bearer token (leave blank to keep existing key)'
      : 'Proxy API key / bearer token (optional)',
    password: true,
    ignoreFocusOut: true
  });

  return {
    profile,
    proxyApiKey
  };
}
