import * as vscode from 'vscode';

import type { RoleGuard } from '../enterprise/roleGuard';
import type { FMClient } from '../services/fmClient';
import type { Logger } from '../services/logger';
import type { ProfileStore } from '../services/profileStore';
import type { SchemaService } from '../services/schemaService';
import type { SettingsService } from '../services/settingsService';
import { validateRecordId } from '../utils/jsonValidate';
import { parseLayoutArg, pickProfile, promptForLayout } from './common';
import { RecordEditorPanel } from '../webviews/recordEditor';

interface RegisterRecordEditCommandsDeps {
  context: vscode.ExtensionContext;
  profileStore: ProfileStore;
  fmClient: FMClient;
  schemaService: SchemaService;
  settingsService: SettingsService;
  roleGuard: RoleGuard;
  logger: Logger;
}

export function registerRecordEditCommands(deps: RegisterRecordEditCommandsDeps): vscode.Disposable[] {
  const { context, profileStore, fmClient, schemaService, settingsService, roleGuard, logger } = deps;

  return [
    vscode.commands.registerCommand('filemakerDataApiTools.openRecordEditor', async (arg: unknown) => {
      if (!settingsService.isRecordEditEnabled()) {
        vscode.window.showInformationMessage('Record editing is disabled by settings.');
        return;
      }
      if (!(await roleGuard.assertFeature('recordEdit', 'Open Record Editor'))) {
        return;
      }

      const contextArg = parseLayoutArg(arg);

      let profileId = contextArg.profileId;
      let layout = contextArg.layout;
      let recordId: string | undefined;

      if (!profileId) {
        const profile = await pickProfile(profileStore, true);
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
        const enteredRecordId = await vscode.window.showInputBox({
          title: 'Open Record Editor',
          prompt: 'Record ID (optional)',
          ignoreFocusOut: true
        });
        recordId = enteredRecordId?.trim() || undefined;
      }

      RecordEditorPanel.createOrShow(context, profileStore, fmClient, schemaService, logger, {
        profileId,
        layout,
        recordId
      });
    }),

    vscode.commands.registerCommand('filemakerDataApiTools.editRecordById', async (arg: unknown) => {
      if (!settingsService.isRecordEditEnabled()) {
        vscode.window.showInformationMessage('Record editing is disabled by settings.');
        return;
      }
      if (!(await roleGuard.assertFeature('recordEdit', 'Edit Record by ID'))) {
        return;
      }

      const contextArg = parseLayoutArg(arg);
      let profileId = contextArg.profileId;
      let layout = contextArg.layout;

      if (!profileId) {
        const profile = await pickProfile(profileStore, true);
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

      if (!layout) {
        return;
      }

      const recordId = await vscode.window.showInputBox({
        title: 'Edit Record by ID',
        prompt: 'Record ID',
        ignoreFocusOut: true,
        validateInput: (value) => validateRecordId(value).error
      });

      if (!recordId) {
        return;
      }

      RecordEditorPanel.createOrShow(context, profileStore, fmClient, schemaService, logger, {
        profileId,
        layout,
        recordId: recordId.trim()
      });
    })
  ];
}
